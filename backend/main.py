"""FastAPI app — entrypoint for the Marlin Growth Agent backend."""
import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import CORS_ORIGINS
from backend.db import init_db
from backend.seed_data import seed

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("marlin")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize DB and seed data on startup."""
    logger.info("Initializing database...")
    init_db()
    seed()
    logger.info("Database ready.")
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="Marlin Growth Agent",
    description="AI Growth & Agentic Commerce — Razorpay Hackathon",
    version="1.0.0",
    lifespan=lifespan,
)

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
