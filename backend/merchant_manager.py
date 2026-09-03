"""Merchant Manager — handles multi-tenant registry, merchant-specific policy configs,
and merchant Razorpay API credentials in a master SQLite database.
"""
import sqlite3
import json
import logging
from pathlib import Path
from contextlib import contextmanager
import backend.config as _config

logger = logging.getLogger("marlin.merchant_manager")

MASTER_DB_PATH = _config.DATA_DIR / "master_merchants.db"
MERCHANTS_DIR = _config.DATA_DIR / "merchants"
MERCHANTS_DIR.mkdir(exist_ok=True, parents=True)

DEFAULT_MERCHANTS = [
    {
        "merchant_id": "merchant_default",
        "name": "RazorCage Store (Default)",
        "description": "Standard e-commerce demo with default 20% max discount limit",
        "razorpay_key_id": _config.RAZORPAY_KEY_ID,
        "razorpay_key_secret": _config.RAZORPAY_KEY_SECRET,
        "razorpay_webhook_secret": _config.RAZORPAY_WEBHOOK_SECRET,
        "policy_config": {
            "max_discount_pct": 20,
            "auto_approve_threshold_pct": 15,
            "max_campaign_discount_pct": 25,
            "max_campaign_duration_hours": 48,
            "discountable_skus": ["SKU_101", "SKU_102", "SKU_103", "SKU_104", "SKU_105", "SKU_106"],
            "risk_appetite": "moderate",
        },
    },
    {
        "merchant_id": "apex_electronics",
        "name": "Apex Electronics",
        "description": "High-margin electronics store with aggressive 30% discount limit",
        "razorpay_key_id": "rzp_test_apex_101",
        "razorpay_key_secret": "secret_apex_key_2026",
        "razorpay_webhook_secret": "whsec_apex_9921",
        "policy_config": {
            "max_discount_pct": 30,
            "auto_approve_threshold_pct": 20,
            "max_campaign_discount_pct": 35,
            "max_campaign_duration_hours": 72,
            "discountable_skus": ["SKU_101", "SKU_102", "SKU_104"],
            "risk_appetite": "high",
        },
    },
    {
        "merchant_id": "nexus_fashion",
        "name": "Nexus Luxury Fashion",
        "description": "Premium brand with strict 10% discount cap and mandatory human approval",
        "razorpay_key_id": "rzp_test_nexus_202",
        "razorpay_key_secret": "secret_nexus_key_2026",
        "razorpay_webhook_secret": "whsec_nexus_4410",
        "policy_config": {
            "max_discount_pct": 10,
            "auto_approve_threshold_pct": 5,
            "max_campaign_discount_pct": 15,
            "max_campaign_duration_hours": 24,
            "discountable_skus": ["SKU_103", "SKU_105", "SKU_106"],
            "risk_appetite": "conservative",
        },
    },
]


def get_master_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(MASTER_DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


@contextmanager
def get_master_db():
    conn = get_master_connection()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_master_db():
    """Create master merchants table and seed initial tenant configurations."""
    with get_master_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS merchants (
                merchant_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                razorpay_key_id TEXT,
                razorpay_key_secret TEXT,
                razorpay_webhook_secret TEXT,
                policy_config_json TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
        )
    seed_default_merchants()


def seed_default_merchants():
    """Seed initial merchant tenants if not present."""
    with get_master_db() as conn:
        for m in DEFAULT_MERCHANTS:
            row = conn.execute(
                "SELECT merchant_id FROM merchants WHERE merchant_id = ?",
                (m["merchant_id"],),
            ).fetchone()
            if not row:
                conn.execute(
                    """
                    INSERT INTO merchants (
                        merchant_id, name, description, razorpay_key_id, razorpay_key_secret,
                        razorpay_webhook_secret, policy_config_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        m["merchant_id"],
                        m["name"],
                        m["description"],
                        m["razorpay_key_id"],
                        m["razorpay_key_secret"],
                        m["razorpay_webhook_secret"],
                        json.dumps(m["policy_config"]),
                    ),
                )
                logger.info(f"Seeded merchant tenant: {m['merchant_id']} ({m['name']})")


def get_merchant(merchant_id: str) -> dict:
    """Fetch merchant info and policy configuration by merchant_id.
    
    Fallback to merchant_default if requested merchant_id does not exist.
    """
    init_master_db()
    with get_master_db() as conn:
        row = conn.execute(
            "SELECT * FROM merchants WHERE merchant_id = ?", (merchant_id,)
        ).fetchone()
        if not row and merchant_id != "merchant_default":
            logger.warning(f"Merchant '{merchant_id}' not found, falling back to 'merchant_default'")
            row = conn.execute(
                "SELECT * FROM merchants WHERE merchant_id = 'merchant_default'"
            ).fetchone()

        if not row:
            # Fallback inline config if DB not populated yet
            return DEFAULT_MERCHANTS[0]

        data = dict(row)
        try:
            data["policy_config"] = json.loads(data.get("policy_config_json") or "{}")
        except Exception:
            data["policy_config"] = DEFAULT_MERCHANTS[0]["policy_config"]
        return data


def list_merchants() -> list[dict]:
    """Get all registered merchants."""
    init_master_db()
    with get_master_db() as conn:
        rows = conn.execute("SELECT * FROM merchants ORDER BY created_at ASC").fetchall()
        result = []
        for r in rows:
            d = dict(r)
            try:
                d["policy_config"] = json.loads(d.get("policy_config_json") or "{}")
            except Exception:
                d["policy_config"] = {}
            # Redact secrets for API output safety
            d["razorpay_key_secret_masked"] = "***" if d.get("razorpay_key_secret") else ""
            result.append(d)
        return result
