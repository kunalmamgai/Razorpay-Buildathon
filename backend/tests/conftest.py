"""Shared test fixtures for the Marlin Growth Agent test suite.

Provides:
- An isolated temporary SQLite database (per test session)
- Seeded product catalog
- A FastAPI TestClient wired to the test DB
"""
import os
import sys
import tempfile
import pytest

# Ensure backend package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

import backend.db as db_module
import backend.config as config_module


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Create a temporary SQLite database for the entire test session."""
    fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(fd)

    # Override the DB URL before any schema creation
    original_url = config_module.DATABASE_URL
    config_module.DATABASE_URL = db_path

    # Initialize schema + seed products
    db_module.init_db()
    _seed_products(db_path)

    yield db_path

    # Cleanup
    config_module.DATABASE_URL = original_url
    try:
        os.unlink(db_path)
    except OSError:
        pass


def _seed_products(db_path: str):
    """Insert the 6 seed products into the test database."""
    products = [
        ("SKU_101", "Wireless Earbuds Pro", 299900, "Electronics", 1, 150),
        ("SKU_102", "USB-C Charging Cable (2m)", 49900, "Accessories", 1, 500),
        ("SKU_103", "Phone Case — MagSafe Compatible", 99900, "Accessories", 1, 200),
        ("SKU_104", "Portable Power Bank 10000mAh", 149900, "Electronics", 1, 30),
        ("SKU_105", "Bluetooth Speaker Mini", 199900, "Electronics", 1, 80),
        ("SKU_106", "Premium Leather Wallet", 129900, "Fashion", 1, 120),
    ]
    import sqlite3
    conn = sqlite3.connect(db_path)
    for p in products:
        conn.execute(
            "INSERT OR IGNORE INTO products (id, name, price, category, discountable, stock_quantity) VALUES (?, ?, ?, ?, ?, ?)",
            p,
        )
    conn.commit()
    conn.close()


@pytest.fixture
def client():
    """A FastAPI TestClient using the test database."""
    from fastapi.testclient import TestClient
    from backend.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture
def db():
    """Direct database access for assertions."""
    return db_module.get_db
