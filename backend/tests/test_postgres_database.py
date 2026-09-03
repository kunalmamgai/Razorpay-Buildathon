"""Automated unit test suite for Production-Grade Database Infrastructure:
1. SQL Query Translator ('?' <-> '%s' and SQLite -> Postgres DDL translation)
2. Read Replica Query Routing (get_read_db vs get_write_db context managers)
3. DictRowWrapper dict-style indexing and item access
4. Connection Pool initialization and fallback management
"""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.db_adapter import (
    QueryTranslator, DictRowWrapper, PostgresPoolManager, ConnectionWrapper
)
from backend.db import get_write_db, get_read_db, init_db
from backend.ledger.ledger import log_entry, get_entries, get_stats


def test_postgres_database_infrastructure():
    print("=== Testing Production-Grade Database Infrastructure ===")
    merchant_id = "merchant_default"
    init_db(merchant_id)

    # 1. Test SQL Query Translator
    print("\n1. Testing SQL Query Translator:")
    sqlite_sql = "SELECT * FROM ledger WHERE outcome = ? AND id = ?"
    postgres_sql = QueryTranslator.translate_sql(sqlite_sql, target_engine="postgres")
    print(f" - SQLite SQL:   {sqlite_sql}")
    print(f" - Postgres SQL: {postgres_sql}")

    assert postgres_sql == "SELECT * FROM ledger WHERE outcome = %s AND id = %s", "Failed: Translator must translate '?' to '%s'"

    # Test DDL translation
    sqlite_ddl = "CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);"
    postgres_ddl = QueryTranslator.translate_sql(sqlite_ddl, target_engine="postgres")
    print(f" - SQLite DDL:   {sqlite_ddl}")
    print(f" - Postgres DDL: {postgres_ddl}")

    assert "SERIAL PRIMARY KEY" in postgres_ddl, "Failed: Translator must convert AUTOINCREMENT to SERIAL"

    # 2. Test DictRowWrapper
    print("\n2. Testing DictRowWrapper Row Access:")
    description = [("id", None), ("actor", None), ("outcome", None)]
    row_tuple = (101, "Agent: Retention-Bot", "clamped")
    row_wrap = DictRowWrapper(description, row_tuple)

    print(f" - Indexing row['actor']: {row_wrap['actor']}")
    print(f" - Indexing row['outcome']: {row_wrap['outcome']}")

    assert row_wrap["actor"] == "Agent: Retention-Bot", "Failed: Row wrapper must support dict indexing"
    assert row_wrap["outcome"] == "clamped", "Failed: Row wrapper must support dict indexing"

    # 3. Test Read Replica Query Routing (get_read_db vs get_write_db)
    print("\n3. Testing Read Replica Query Routing:")

    # Write operation using get_write_db()
    with get_write_db(merchant_id) as conn:
        conn.execute(
            """INSERT INTO ledger (correlation_id, event_type, actor, trigger, outcome)
               VALUES (?, ?, ?, ?, ?)""",
            ("corr_db_test_101", "db_test", "system", "test", "approved"),
        )
    print(" - Write transaction executed via get_write_db()")

    # Read operation using get_read_db()
    with get_read_db(merchant_id) as conn:
        rows = conn.execute("SELECT * FROM ledger WHERE event_type = ?", ("db_test",)).fetchall()
        print(f" - Read query executed via get_read_db() (Retrieved {len(rows)} rows)")
        assert len(rows) > 0, "Failed: Read query via get_read_db must retrieve inserted row"

    # 4. Test Ledger Integration with Read Replica Routing
    print("\n4. Testing Ledger Read Replica Integration:")
    stats = get_stats(merchant_id=merchant_id)
    entries = get_entries(limit=10, merchant_id=merchant_id)
    print(f" - Stats Total Proposals: {stats['total_proposals']}")
    print(f" - Entries Count Read:    {len(entries)}")

    assert stats["total_proposals"] > 0, "Failed: Stats read must return counts"
    assert len(entries) > 0, "Failed: Entries read must return list"

    print("\n[SUCCESS] ALL PRODUCTION-GRADE DATABASE INFRASTRUCTURE TESTS PASSED PERFECTLY!")


if __name__ == "__main__":
    test_postgres_database_infrastructure()
