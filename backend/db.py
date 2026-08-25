"""SQLite database — connection management and schema creation.

Schema is insert-only for ledger (no erasing rejected proposals).
Every table includes timestamps for auditability.
"""
import sqlite3
from contextlib import contextmanager
import backend.config as _config


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(_config.DATABASE_URL)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    """Create all tables if they don't exist."""
    with get_db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                price INTEGER NOT NULL,
                category TEXT,
                discountable INTEGER DEFAULT 1,
                stock_quantity INTEGER DEFAULT 100
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
            """
        )
    # Lightweight migration for pre-existing databases
    with get_db() as conn:
        cols = [row[1] for row in conn.execute("PRAGMA table_info(ledger)").fetchall()]
        if "amounts_json" not in cols:
            conn.execute("ALTER TABLE ledger ADD COLUMN amounts_json TEXT DEFAULT NULL")
