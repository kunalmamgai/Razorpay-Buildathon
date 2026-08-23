"""FastAPI app — entrypoint for the Marlin Growth Agent backend."""
import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.db import init_db
from backend.seed_data import seed
from backend.routes.checkout import router as checkout_router
from backend.routes.webhook import router as webhook_router
from backend.routes.campaign import router as campaign_router
from backend.routes.ledger import router as ledger_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize DB and seed data on startup."""
    init_db()
    seed()

    # Start the campaign orchestrator scheduler
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from backend.scheduler.orchestrator import review_and_propose, JOB_ID, JOB_INTERVAL_MINUTES

        scheduler = BackgroundScheduler()
        scheduler.add_job(
            review_and_propose,
            "interval",
            minutes=JOB_INTERVAL_MINUTES,
            id=JOB_ID,
            replace_existing=True,
        )
        scheduler.start()
        print(f"Campaign orchestrator scheduler started (every {JOB_INTERVAL_MINUTES} min)")
    except ImportError:
        print("APScheduler not installed — scheduler disabled. Install with: pip install apscheduler")
    except Exception as e:
        print(f"Scheduler failed to start: {e}")

    yield


app = FastAPI(
    title="Marlin Growth Agent",
    description="AI Growth & Agentic Commerce — Razorpay Hackathon",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS for frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(checkout_router)
app.include_router(webhook_router)
app.include_router(campaign_router)
app.include_router(ledger_router)


@app.get("/")
def root():
    return {
        "name": "Marlin Growth Agent",
        "version": "0.1.0",
        "docs": "/docs",
    }


@app.get("/api/products")
def list_products():
    """List all products in the catalog."""
    from backend.db import get_db
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM products").fetchall()
        return {"products": [dict(r) for r in rows]}
