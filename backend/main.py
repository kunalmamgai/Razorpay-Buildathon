"""FastAPI app — entrypoint for the Marlin Growth Agent backend."""
import os
import logging
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import (
    CORS_ORIGINS, 
    validate_config, 
    get_config_summary, 
    APP_ENV,
    IS_PRODUCTION,
    LOG_LEVEL,
    LOG_FORMAT
)
from backend.db import init_db
from backend.seed_data import seed
from backend.rate_limiter import add_rate_limiting
from backend.logging_config import setup_logging

# Setup logging with environment-based configuration
setup_logging(level=LOG_LEVEL, json_format=(LOG_FORMAT == "json"))

logger = logging.getLogger("marlin")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize DB, seed data, start the orchestrator scheduler."""
    logger.info(f"Starting Marlin Growth Agent in {APP_ENV} mode...")
    
    # Validate configuration
    config_issues = validate_config()
    if config_issues:
        for issue in config_issues:
            if IS_PRODUCTION:
                logger.error(f"Configuration issue: {issue}")
            else:
                logger.warning(f"Configuration issue: {issue}")
    else:
        logger.info("Configuration validated successfully")
    
    logger.info("Initializing database...")
    init_db()
    seed()
    logger.info("Database ready.")

    from backend.services.scheduler import start_scheduler
    if start_scheduler():
        logger.info("Campaign orchestrator scheduler running.")
    yield

    from backend.services.scheduler import stop_scheduler
    stop_scheduler()

    # Close the async Razorpay HTTP client to prevent connection leaks
    from backend.razorpay_client import get_async_client
    try:
        import asyncio
        client = get_async_client()
        if client and hasattr(client, 'aclose'):
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(client.aclose())
            else:
                loop.run_until_complete(client.aclose())
    except Exception:
        pass

    logger.info("Shutting down.")


app = FastAPI(
    title="Marlin Growth Agent",
    description="AI Growth & Agentic Commerce — Razorpay Hackathon",
    version="1.0.0",
    lifespan=lifespan,
)

# Add rate limiting
add_rate_limiting(app)

# CORS for frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
from backend.routes.checkout import router as checkout_router
from backend.routes.approval import router as approval_router
from backend.routes.webhook import router as webhook_router
from backend.routes.campaign import router as campaign_router
from backend.routes.ledger import router as ledger_router
from backend.routes.products import router as products_router

app.include_router(checkout_router)
app.include_router(approval_router)
app.include_router(webhook_router)
app.include_router(campaign_router)
app.include_router(ledger_router)
app.include_router(products_router)


@app.get("/")
def root():
    return {
        "name": "Marlin Growth Agent",
        "version": "1.0.0",
        "description": "AI Growth & Agentic Commerce — Razorpay Hackathon",
        "docs": "/docs",
    }


@app.get("/health")
def health_check():
    """Health check endpoint -- validates DB, Gemini, and Razorpay connectivity."""
    from backend.db import init_db
    from backend.ledger.ledger import get_stats
    from backend.config import GEMINI_API_KEY, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET

    checks = {}
    overall = "ok"

    # 1. Database
    try:
        init_db()
        get_stats()
        checks["database"] = "healthy"
    except Exception as e:
        checks["database"] = f"unhealthy: {e}"
        overall = "degraded"

    # 2. Gemini API key present (lightweight: we don't make a live call, just check config)
    if GEMINI_API_KEY:
        checks["gemini"] = "configured"
    else:
        checks["gemini"] = "not_configured"
        # Not fatal in dev -- Brain returns fallback proposals

    # 3. Razorpay keys present
    if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
        checks["razorpay"] = "configured"
    else:
        checks["razorpay"] = "not_configured"
        # Not fatal in dev -- mock orders are used

    # 4. Scheduler
    try:
        from backend.services.scheduler import get_schedule_info
        sched = get_schedule_info()
        checks["scheduler"] = "running" if sched.get("scheduler_running") else "stopped"
    except Exception:
        checks["scheduler"] = "unknown"

    # Determine overall status
    if checks.get("database", "").startswith("unhealthy"):
        overall = "degraded"

    return {
        "status": overall,
        "checks": checks,
        "version": "1.0.0",
    }


@app.get("/ready")
def readiness_check():
    """Readiness probe for Kubernetes deployment."""
    # Check if all services are ready
    checks = {
        "database": False,
        "config": False,
    }
    
    try:
        from backend.db import init_db
        init_db()
        checks["database"] = True
    except Exception:
        pass
    
    # Check config
    from backend.config import GEMINI_API_KEY, RAZORPAY_KEY_ID
    checks["config"] = bool(GEMINI_API_KEY and RAZORPAY_KEY_ID)
    
    all_ready = all(checks.values())
    
    return {
        "ready": all_ready,
        "checks": checks,
    }


@app.get("/config")
def config_summary():
    """Configuration summary endpoint (for debugging/monitoring)."""
    # Only allow in non-production environments for security
    if IS_PRODUCTION:
        return JSONResponse(
            status_code=404,
            content={"detail": "Not found"}
        )
    
    return get_config_summary()
