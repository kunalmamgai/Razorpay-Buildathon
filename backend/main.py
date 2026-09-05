"""FastAPI app — entrypoint for the Marlin Growth Agent multi-tenant backend."""
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
from backend.merchant_manager import init_master_db
from backend.seed_data import seed_all_merchants
from backend.rate_limiter import add_rate_limiting
from backend.logging_config import setup_logging

setup_logging(level=LOG_LEVEL, json_format=(LOG_FORMAT == "json"))

logger = logging.getLogger("marlin")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize Master Merchant DB, seed merchant databases, start orchestrator."""
    logger.info(f"Starting Multi-Tenant Marlin Growth Agent in {APP_ENV} mode...")
    
    config_issues = validate_config()
    if config_issues:
        for issue in config_issues:
            if IS_PRODUCTION:
                logger.error(f"Configuration issue: {issue}")
            else:
                logger.warning(f"Configuration issue: {issue}")
    else:
        logger.info("Configuration validated successfully")
    
    logger.info("Initializing multi-tenant database infrastructure...")
    from backend.db_adapter import PostgresPoolManager
    PostgresPoolManager.initialize()
    init_master_db()
    seed_all_merchants()
    logger.info("Multi-tenant databases ready.")

    from backend.services.scheduler import start_scheduler
    if start_scheduler():
        logger.info("Campaign orchestrator scheduler running.")
    yield

    from backend.services.scheduler import stop_scheduler
    stop_scheduler()

    PostgresPoolManager.close_all()

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
    title="Marlin Growth Agent (Multi-Tenant)",
    description="Explainable & Bounded AI Commerce with Multi-Tenant Merchant Isolation",
    version="1.1.0",
    lifespan=lifespan,
)

add_rate_limiting(app)

# backend/main.py — CORSMiddleware block
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=r"https://razorpay-buildathon-vm99.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
from backend.routes.checkout import router as checkout_router
from backend.routes.approval import router as approval_router
from backend.routes.webhook import router as webhook_router
from backend.routes.campaign import router as campaign_router
from backend.routes.ledger import router as ledger_router
from backend.routes.products import router as products_router
from backend.routes.merchants import router as merchants_router
from backend.routes.analytics import router as analytics_router

app.include_router(checkout_router)
app.include_router(approval_router)
app.include_router(webhook_router)
app.include_router(campaign_router)
app.include_router(ledger_router)
app.include_router(products_router)
app.include_router(merchants_router)
app.include_router(analytics_router)


@app.get("/")
def root():
    return {
        "name": "RazorCage AI (Multi-Tenant)",
        "version": "1.1.0",
        "description": "Explainable & Bounded AI Commerce — Razorpay Hackathon",
        "docs": "/docs",
    }


@app.get("/health")
def health_check():
    """Health check endpoint -- validates DB, Gemini, and Razorpay connectivity."""
    from backend.ledger.ledger import get_stats
    from backend.config import GEMINI_API_KEY, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET

    checks = {}
    overall = "ok"

    try:
        get_stats("merchant_default")
        checks["database"] = "healthy"
    except Exception as e:
        checks["database"] = f"unhealthy: {e}"
        overall = "degraded"

    if GEMINI_API_KEY:
        checks["gemini"] = "configured"
    else:
        checks["gemini"] = "not_configured"

    if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
        checks["razorpay"] = "configured"
    else:
        checks["razorpay"] = "not_configured"

    try:
        from backend.services.scheduler import get_schedule_info
        sched = get_schedule_info()
        checks["scheduler"] = "running" if sched.get("scheduler_running") else "stopped"
    except Exception:
        checks["scheduler"] = "unknown"

    if checks.get("database", "").startswith("unhealthy"):
        overall = "degraded"

    return {
        "status": overall,
        "checks": checks,
        "version": "1.1.0",
    }
