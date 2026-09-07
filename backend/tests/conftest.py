"""Shared test fixtures for the Marlin Growth Agent test suite.

Provides:
- An isolated temporary SQLite data directory (per test session) so tests
  never touch the real merchant databases under backend/data/
- The production seeding path (init DB + products + demo campaigns) runs via
  the FastAPI TestClient lifespan
- A FastAPI TestClient wired to the test DB
"""
import os
import sys
import tempfile
from pathlib import Path
import pytest

# Ensure backend package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

import backend.db as db_module
import backend.config as config_module
import backend.merchant_manager as merchant_manager


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Point SQLite data paths at a temp directory for the whole session.

    db.py / merchant_manager.py resolve their data dirs at import time, so we
    patch the module-level path constants directly. The FastAPI lifespan then
    initializes the schema and seeds products + demo campaigns into the temp
    dir on the first TestClient.
    """
    tmp_dir = Path(tempfile.mkdtemp(prefix="razorcage_test_"))

    config_module.DATA_DIR = tmp_dir
    config_module.DATABASE_URL = str(tmp_dir / "marlin_test.db")

    db_module.MERCHANTS_DIR = tmp_dir / "merchants"
    db_module.MERCHANTS_DIR.mkdir(parents=True, exist_ok=True)

    merchant_manager.MASTER_DB_PATH = tmp_dir / "master_merchants.db"
    merchant_manager.MERCHANTS_DIR = tmp_dir / "merchants"
    merchant_manager.MERCHANTS_DIR.mkdir(parents=True, exist_ok=True)

    yield tmp_dir

    import shutil
    shutil.rmtree(tmp_dir, ignore_errors=True)


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
