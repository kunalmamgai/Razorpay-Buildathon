"""Central configuration — reads environment variables once at import time.

Supports development, staging, and production environments with validation.
Environment: set APP_ENV=development|staging|production (default: development).
"""
import os
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# ── Environment ────────────────────────────────────────────────────────────
APP_ENV = os.getenv("APP_ENV", "development")
IS_PRODUCTION = APP_ENV == "production"
IS_STAGING = APP_ENV == "staging"
IS_DEVELOPMENT = APP_ENV == "development"
DEBUG = os.getenv("DEBUG", "true" if APP_ENV == "development" else "false").lower() == "true"

# ── Paths ─�───────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "backend" / "data"
DATA_DIR.mkdir(exist_ok=True)
DATABASE_URL = os.getenv("DATABASE_URL", str(DATA_DIR / f"marlin_{APP_ENV}.db"))

# ── Gemini ───────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_MAX_TOKENS = int(os.getenv("GEMINI_MAX_TOKENS", "500"))
GEMINI_TEMPERATURE = float(os.getenv("GEMINI_TEMPERATURE", "0.7"))

# ── Razorpay ─────────────────────────────────────────────────────────────
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
RAZORPAY_CURRENCY = os.getenv("RAZORPAY_CURRENCY", "INR")
RAZORPAY_TIMEOUT_SECONDS = int(os.getenv("RAZORPAY_TIMEOUT_SECONDS", "30"))
RAZORPAY_MAX_RETRIES = int(os.getenv("RAZORPAY_MAX_RETRIES", "3"))

# ── Server ────────────────────────────────────────────────────────────────
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
RELOAD = os.getenv("RELOAD", "true" if IS_DEVELOPMENT else "false").lower() == "true"

# ── CORS ──────────────────────────────────────────────────────────────────
DEFAULT_CORS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

_env_cors = os.getenv("CORS_ORIGINS", "")
CORS_ORIGINS = [origin.strip() for origin in _env_cors.split(",")] if _env_cors else DEFAULT_CORS

# ── Policy engine constants (the LLM cannot override these) ────────────────
MAX_DISCOUNT_PCT = int(os.getenv("MAX_DISCOUNT_PCT", "20"))
AUTO_APPROVE_THRESHOLD_PCT = int(os.getenv("AUTO_APPROVE_THRESHOLD_PCT", "15"))
MAX_CAMPAIGN_DISCOUNT_PCT = int(os.getenv("MAX_CAMPAIGN_DISCOUNT_PCT", "25"))
MAX_CAMPAIGN_DURATION_HOURS = int(os.getenv("MAX_CAMPAIGN_DURATION_HOURS", "48"))
POLICY_VERSION = os.getenv("POLICY_VERSION", "policy-v1")

# ── Orchestrator ──────────────────────────────────────────────────────────
CAMPAIGN_REVIEW_INTERVAL_MINUTES = int(
    os.getenv("CAMPAIGN_REVIEW_INTERVAL_MINUTES", "60")
)

# ── Rate Limiting ─────────────────────────────────────────────────────────
RATE_LIMIT_DEFAULT = os.getenv("RATE_LIMIT_DEFAULT", "200/minute")
RATE_LIMIT_CHECKOUT = os.getenv("RATE_LIMIT_CHECKOUT", "30/minute")
RATE_LIMIT_WEBHOOK = os.getenv("RATE_LIMIT_WEBHOOK", "100/minute")
RATE_LIMIT_ADMIN = os.getenv("RATE_LIMIT_ADMIN", "60/minute")

# ── Logging ───────────────────────────────────────────────────────────────
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO" if not IS_DEVELOPMENT else "DEBUG")
LOG_FORMAT = os.getenv("LOG_FORMAT", "json" if IS_PRODUCTION else "colored")

# ── Products ──────────────────────────────────────────────────────────────
# All seed products are discountable (per hackathon spec: SKU_101 & SKU_102
# explicitly, but we allow all 6 for demo purposes)
DISCOUNTABLE_SKUS = {
    "SKU_101", "SKU_102", "SKU_103", "SKU_104", "SKU_105", "SKU_106"
}


def validate_config() -> list[str]:
    """Validate configuration and return list of warnings/errors.
    
    Returns:
        List of warning messages for missing or invalid configuration.
    """
    issues: list[str] = []
    
    if APP_ENV == "production":
        # Production-specific validations
        if not GEMINI_API_KEY:
            issues.append("GEMINI_API_KEY is required in production")
        if not RAZORPAY_KEY_ID:
            issues.append("RAZORPAY_KEY_ID is required in production")
        if not RAZORPAY_KEY_SECRET:
            issues.append("RAZORPAY_KEY_SECRET is required in production")
        if not RAZORPAY_WEBHOOK_SECRET:
            issues.append("RAZORPAY_WEBHOOK_SECRET is required in production")
        if DEBUG:
            issues.append("DEBUG should be disabled in production")
        if CORS_ORIGINS == DEFAULT_CORS:
            issues.append("Restrict CORS_ORIGINS in production")
    else:
        # Development/staging warnings
        if APP_ENV == "development":
            logger.info("Running in development mode — not all env vars required")
    
    return issues


def get_config_summary() -> dict:
    """Return a summary of current configuration for health checks.
    
    Returns:
        Dictionary with config summary (secrets redacted).
    """
    return {
        "environment": APP_ENV,
        "debug": DEBUG,
        "database_url": DATABASE_URL,
        "gemini_model": GEMINI_MODEL,
        "gemini_configured": bool(GEMINI_API_KEY),
        "razorpay_configured": bool(RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET),
        "webhook_secret_configured": bool(RAZORPAY_WEBHOOK_SECRET),
        "cors_origins": CORS_ORIGINS,
        "policy": {
            "max_discount_pct": MAX_DISCOUNT_PCT,
            "auto_approve_threshold_pct": AUTO_APPROVE_THRESHOLD_PCT,
            "max_campaign_discount_pct": MAX_CAMPAIGN_DISCOUNT_PCT,
            "max_campaign_duration_hours": MAX_CAMPAIGN_DURATION_HOURS,
            "version": POLICY_VERSION,
        },
        "limits": {
            "default": RATE_LIMIT_DEFAULT,
            "checkout": RATE_LIMIT_CHECKOUT,
            "webhook": RATE_LIMIT_WEBHOOK,
            "admin": RATE_LIMIT_ADMIN,
        },
    }