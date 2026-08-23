"""SQLite database setup and session management."""
import sqlite3
import os
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "marlin.db")


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
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
                discountable INTEGER DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                razorpay_order_id TEXT,
                razorpay_payment_id TEXT,
                cart_json TEXT,
                final_amount INTEGER,
                original_amount INTEGER,
                status TEXT DEFAULT 'created',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS ledger (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                actor TEXT NOT NULL,
                trigger TEXT NOT NULL,
                proposal_json TEXT,
                reasoning TEXT,
                policy_passed INTEGER,
                policy_violations TEXT,
                final_action_json TEXT,
                razorpay_order_id TEXT,
                razorpay_payment_id TEXT,
                outcome TEXT DEFAULT 'pending'
            );

            CREATE TABLE IF NOT EXISTS campaigns (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                discount_pct INTEGER,
                target_skus_json TEXT,
                starts_at TIMESTAMP,
                expires_at TIMESTAMP,
                status TEXT DEFAULT 'draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
        )
