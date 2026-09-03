"""Unified Database Adapter & Connection Pool Manager.

Provides a production-grade database abstraction layer supporting:
1. PostgreSQL engine with connection pooling (Primary Write Pool & Read Replica Pool)
2. Read Replica query routing (isolating heavy analytics/dashboard SELECTs from the write path)
3. SQL placeholder translation ('?' <-> '%s')
4. Fallback to SQLite for zero-dependency local development
"""
import os
import re
import sqlite3
import logging
from contextlib import contextmanager
from typing import Generator, Any, Optional, Dict, List, Tuple

from backend.config import APP_ENV

logger = logging.getLogger("marlin.db_adapter")

# Environment DB URLs
PRIMARY_DATABASE_URL = os.getenv("DATABASE_URL", "")
READ_REPLICA_URL = os.getenv("READ_REPLICA_URL", os.getenv("DATABASE_READ_REPLICA_URL", PRIMARY_DATABASE_URL))

# Pool configuration
DB_POOL_MIN_SIZE = int(os.getenv("DB_POOL_MIN_SIZE", "5"))
DB_POOL_MAX_SIZE = int(os.getenv("DB_POOL_MAX_SIZE", "20"))

IS_POSTGRES_MODE = (
    PRIMARY_DATABASE_URL.startswith("postgres://") or 
    PRIMARY_DATABASE_URL.startswith("postgresql://")
)


# ═══════════════════════════════════════════════════════════════════════
# 1. SQL Query Translator
# ═══════════════════════════════════════════════════════════════════════

class QueryTranslator:
    @staticmethod
    def translate_sql(sql: str, target_engine: str = "sqlite") -> str:
        """Translate SQL syntax between SQLite and PostgreSQL."""
        if target_engine == "postgres":
            # Translate ? placeholders to %s
            translated = sql.replace("?", "%s")

            # Translate SQLite autoincrement
            translated = re.sub(
                r"INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT",
                "SERIAL PRIMARY KEY",
                translated,
                flags=re.IGNORECASE,
            )

            # Remove PRAGMAs
            translated = re.sub(r"PRAGMA\s+[^;]+;", "", translated, flags=re.IGNORECASE)

            # SQLite datetime default
            translated = translated.replace("CURRENT_TIMESTAMP", "CURRENT_TIMESTAMP")
            return translated
        return sql


# ═══════════════════════════════════════════════════════════════════════
# 2. Row Wrapper for Dict Access
# ═══════════════════════════════════════════════════════════════════════

class DictRowWrapper:
    """Provides dictionary-style indexing and dict() conversion for DB cursor rows."""

    def __init__(self, description, row_tuple):
        self._keys = [col[0] for col in description] if description else []
        self._data = dict(zip(self._keys, row_tuple)) if row_tuple else {}

    def __getitem__(self, key):
        return self._data[key]

    def get(self, key, default=None):
        return self._data.get(key, default)

    def keys(self):
        return self._data.keys()

    def values(self):
        return self._data.values()

    def items(self):
        return self._data.items()

    def __iter__(self):
        return iter(self._data)

    def __len__(self):
        return len(self._data)

    def __dict__(self):
        return self._data

    def __repr__(self):
        return repr(self._data)


class ConnectionWrapper:
    """Unified wrapper around sqlite3 or psycopg2 connections."""

    def __init__(self, raw_conn, is_postgres: bool = False, pool=None):
        self.raw_conn = raw_conn
        self.is_postgres = is_postgres
        self.pool = pool

    def execute(self, sql: str, params: tuple = ()) -> Any:
        target_engine = "postgres" if self.is_postgres else "sqlite"
        translated_sql = QueryTranslator.translate_sql(sql, target_engine)

        cursor = self.raw_conn.cursor()
        cursor.execute(translated_sql, params)

        # Wrap cursor results
        return CursorWrapper(cursor, is_postgres=self.is_postgres)

    def executescript(self, sql_script: str) -> Any:
        target_engine = "postgres" if self.is_postgres else "sqlite"
        translated_sql = QueryTranslator.translate_sql(sql_script, target_engine)

        if self.is_postgres:
            cursor = self.raw_conn.cursor()
            cursor.execute(translated_sql)
            return CursorWrapper(cursor, is_postgres=self.is_postgres)
        else:
            return self.raw_conn.executescript(translated_sql)

    def commit(self):
        self.raw_conn.commit()

    def rollback(self):
        self.raw_conn.rollback()

    def close(self):
        if self.pool and self.is_postgres:
            try:
                self.pool.putconn(self.raw_conn)
            except Exception:
                pass
        else:
            try:
                self.raw_conn.close()
            except Exception:
                pass


class CursorWrapper:
    """Unified cursor wrapper converting rows to DictRowWrapper."""

    def __init__(self, raw_cursor, is_postgres: bool = False):
        self.raw_cursor = raw_cursor
        self.is_postgres = is_postgres
        self.lastrowid = getattr(raw_cursor, "lastrowid", None)

    def fetchone(self):
        row = self.raw_cursor.fetchone()
        if row is None:
            return None
        if isinstance(row, sqlite3.Row):
            return row
        if isinstance(row, dict):
            return row
        return DictRowWrapper(self.raw_cursor.description, row)

    def fetchall(self):
        rows = self.raw_cursor.fetchall()
        if not rows:
            return []
        if isinstance(rows[0], sqlite3.Row) or isinstance(rows[0], dict):
            return rows
        return [DictRowWrapper(self.raw_cursor.description, r) for r in rows]

    @property
    def rowcount(self):
        return self.raw_cursor.rowcount


# ═══════════════════════════════════════════════════════════════════════
# 3. Connection Pool Manager
# ═══════════════════════════════════════════════════════════════════════

class PostgresPoolManager:
    _write_pool = None
    _read_pool = None
    _initialized = False

    @classmethod
    def initialize(cls):
        if cls._initialized or not IS_POSTGRES_MODE:
            return

        try:
            import psycopg2.pool
            cls._write_pool = psycopg2.pool.ThreadedConnectionPool(
                minconn=DB_POOL_MIN_SIZE,
                maxconn=DB_POOL_MAX_SIZE,
                dsn=PRIMARY_DATABASE_URL,
            )
            logger.info(f"Initialized Primary Write PostgreSQL Pool (Size: {DB_POOL_MIN_SIZE}-{DB_POOL_MAX_SIZE})")

            if READ_REPLICA_URL and READ_REPLICA_URL != PRIMARY_DATABASE_URL:
                cls._read_pool = psycopg2.pool.ThreadedConnectionPool(
                    minconn=DB_POOL_MIN_SIZE,
                    maxconn=DB_POOL_MAX_SIZE,
                    dsn=READ_REPLICA_URL,
                )
                logger.info(f"Initialized Read Replica PostgreSQL Pool (Size: {DB_POOL_MIN_SIZE}-{DB_POOL_MAX_SIZE})")
            else:
                cls._read_pool = cls._write_pool
                logger.info("Read Replica routing using Primary Pool (no separate replica URL)")

            cls._initialized = True
        except ImportError:
            logger.warning("psycopg2 module not found — using SQLite database mode")
        except Exception as e:
            logger.error(f"Failed to initialize PostgreSQL pool: {e} — using SQLite mode")

    @classmethod
    def get_write_connection(cls) -> Optional[ConnectionWrapper]:
        if cls._initialized and cls._write_pool:
            try:
                conn = cls._write_pool.getconn()
                return ConnectionWrapper(conn, is_postgres=True, pool=cls._write_pool)
            except Exception as e:
                logger.error(f"Error getting connection from write pool: {e}")
        return None

    @classmethod
    def get_read_connection(cls) -> Optional[ConnectionWrapper]:
        if cls._initialized and cls._read_pool:
            try:
                conn = cls._read_pool.getconn()
                return ConnectionWrapper(conn, is_postgres=True, pool=cls._read_pool)
            except Exception as e:
                logger.error(f"Error getting connection from read pool: {e}")
        return None

    @classmethod
    def close_all(cls):
        if cls._write_pool:
            try:
                cls._write_pool.closeall()
                logger.info("Closed PostgreSQL Write Pool")
            except Exception:
                pass
        if cls._read_pool and cls._read_pool != cls._write_pool:
            try:
                cls._read_pool.closeall()
                logger.info("Closed PostgreSQL Read Pool")
            except Exception:
                pass
        cls._initialized = False
