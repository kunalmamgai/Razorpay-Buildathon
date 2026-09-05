"""SQLite & PostgreSQL Connection Management — supports multi-tenant database isolation,
connection pooling, and Read Replica query routing.
"""
import sqlite3
from pathlib import Path
from contextlib import contextmanager
import backend.config as _config
from backend.db_adapter import (
    PostgresPoolManager, ConnectionWrapper, IS_POSTGRES_MODE
)

MERCHANTS_DIR = _config.DATA_DIR / "merchants"
MERCHANTS_DIR.mkdir(exist_ok=True, parents=True)


def get_merchant_db_path(merchant_id: str = "merchant_default") -> Path:
    """Get isolated database file path for a specific merchant in SQLite mode."""
    safe_id = "".join(c for c in merchant_id if c.isalnum() or c in ("_", "-")) or "merchant_default"
    return MERCHANTS_DIR / f"{safe_id}.db"


def get_connection(merchant_id: str = "merchant_default", read_only: bool = False) -> ConnectionWrapper:
    """Get database connection — uses Postgres pool if configured, else SQLite per-merchant file."""
    if IS_POSTGRES_MODE:
        PostgresPoolManager.initialize()
        conn = PostgresPoolManager.get_read_connection() if read_only else PostgresPoolManager.get_write_connection()
        if conn:
            return conn

    # Fallback to SQLite mode
    db_path = get_merchant_db_path(merchant_id)
    raw_conn = sqlite3.connect(str(db_path))
    raw_conn.row_factory = sqlite3.Row
    raw_conn.execute("PRAGMA journal_mode=WAL")
    raw_conn.execute("PRAGMA foreign_keys=ON")
    return ConnectionWrapper(raw_conn, is_postgres=False)


@contextmanager
def get_write_db(merchant_id: str = "merchant_default"):
    """Context manager for write operations (transactional primary pool)."""
    conn = get_connection(merchant_id, read_only=False)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


@contextmanager
def get_read_db(merchant_id: str = "merchant_default"):
    """Context manager for high-throughput read operations (Read Replica pool)."""
    conn = get_connection(merchant_id, read_only=True)
    try:
        yield conn
    finally:
        conn.close()


@contextmanager
def get_db(merchant_id: str = "merchant_default"):
    """Backward-compatible default context manager for database operations."""
    with get_write_db(merchant_id) as conn:
        yield conn


def init_db(merchant_id: str = "merchant_default"):
    """Create all tables in the specified merchant's isolated database if they don't exist."""
    with get_write_db(merchant_id) as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                price INTEGER NOT NULL,
                category TEXT,
                discountable INTEGER DEFAULT 1,
                stock_quantity INTEGER DEFAULT 100,
                description TEXT DEFAULT NULL,
                rating REAL DEFAULT 4.5,
                review_count INTEGER DEFAULT 0,
                image_url TEXT DEFAULT NULL
            );

            CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                razorpay_order_id TEXT UNIQUE,
                razorpay_payment_id TEXT,
                cart_json TEXT,
                original_amount INTEGER NOT NULL,
                final_amount INTEGER NOT NULL,
                offer_id TEXT,
                status TEXT DEFAULT 'created',
                idempotency_key TEXT,
                retry_of TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS ledger (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                correlation_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                actor TEXT NOT NULL,
                trigger TEXT NOT NULL,
                proposal_json TEXT,
                reasoning TEXT,
                policy_decision TEXT,
                policy_violations_json TEXT,
                final_action_json TEXT,
                policy_version TEXT DEFAULT 'policy-v1',
                approval_status TEXT DEFAULT NULL,
                approval_actor TEXT DEFAULT NULL,
                approval_timestamp TIMESTAMP DEFAULT NULL,
                razorpay_order_id TEXT,
                razorpay_payment_id TEXT,
                idempotency_key TEXT,
                outcome TEXT DEFAULT 'pending',
                error_code TEXT DEFAULT NULL,
                error_message TEXT DEFAULT NULL,
                amounts_json TEXT DEFAULT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_ledger_correlation
                ON ledger(correlation_id);
            CREATE INDEX IF NOT EXISTS idx_ledger_outcome
                ON ledger(outcome);
            CREATE INDEX IF NOT EXISTS idx_ledger_order
                ON ledger(razorpay_order_id);
            CREATE INDEX IF NOT EXISTS idx_orders_idempotency
                ON orders(idempotency_key);

            CREATE TABLE IF NOT EXISTS campaigns (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                discount_pct INTEGER,
                target_skus_json TEXT,
                starts_at TIMESTAMP,
                expires_at TIMESTAMP,
                status TEXT DEFAULT 'draft',
                policy_decision TEXT,
                approval_status TEXT DEFAULT NULL,
                created_by TEXT DEFAULT 'system',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS webhook_idempotency (
                event_id TEXT PRIMARY KEY,
                merchant_id TEXT NOT NULL,
                event_type TEXT,
                status TEXT NOT NULL,
                response_json TEXT,
                error_message TEXT,
                processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS dlq_webhooks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id TEXT NOT NULL,
                merchant_id TEXT NOT NULL,
                event_type TEXT,
                raw_payload_json TEXT NOT NULL,
                error_message TEXT,
                attempts INTEGER DEFAULT 0,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_webhook_idem_merchant ON webhook_idempotency(merchant_id, status);
            CREATE INDEX IF NOT EXISTS idx_dlq_merchant_status ON dlq_webhooks(merchant_id, status);
            """
        )

        # Backward-compatible migration: add reasoning column to campaigns if missing
        try:
            conn.execute("ALTER TABLE campaigns ADD COLUMN reasoning TEXT DEFAULT NULL")
        except Exception:
            pass  # Column already exists

        # Backward-compatible migrations for the products table (older DBs)
        for col, ddl in [
            ("description", "ALTER TABLE products ADD COLUMN description TEXT DEFAULT NULL"),
            ("rating", "ALTER TABLE products ADD COLUMN rating REAL DEFAULT 4.5"),
            ("review_count", "ALTER TABLE products ADD COLUMN review_count INTEGER DEFAULT 0"),
            ("image_url", "ALTER TABLE products ADD COLUMN image_url TEXT DEFAULT NULL"),
        ]:
            try:
                conn.execute(ddl)
            except Exception:
                pass  # Column already exists


def init_all_merchants_db():
    """Initialize databases for all registered merchants."""
    from backend.merchant_manager import list_merchants, init_master_db
    init_master_db()
    merchants = list_merchants()
    for m in merchants:
        init_db(m["merchant_id"])
