"""Central configuration — reads environment variables once at import time."""
import os
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
DATABASE_URL = os.getenv("DATABASE_URL", str(DATA_DIR / "marlin.db"))

# ── Gemini ─────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# ── Razorpay ───────────────────────────────────────────────────────────
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

# ── Server ─────────────────────────────────────────────────────────────
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

# ── Policy engine constants (the LLM cannot override these) ────────────
MAX_DISCOUNT_PCT = 20
AUTO_APPROVE_THRESHOLD_PCT = 15
MAX_CAMPAIGN_DISCOUNT_PCT = 25
MAX_CAMPAIGN_DURATION_HOURS = 48

# ── Orchestrator ───────────────────────────────────────────────────────
CAMPAIGN_REVIEW_INTERVAL_MINUTES = int(
    os.getenv("CAMPAIGN_REVIEW_INTERVAL_MINUTES", "60")
)

# All seed products are discountable (per hackathon spec: SKU_101 & SKU_102
# explicitly, but we allow all 6 for demo purposes)
DISCOUNTABLE_SKUS = {"SKU_101", "SKU_102", "SKU_103", "SKU_104", "SKU_105", "SKU_106"}
