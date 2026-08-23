"""The Ledger — full audit log of every decision and API call.

Every entry answers: what was proposed, why, what the cage did, what happened with money.
"""
import json
from backend.db import get_db


def log_entry(
    actor: str,
    trigger: str,
    proposal: dict | None = None,
    reasoning: str = "",
    policy_result: dict | None = None,
    razorpay_order_id: str | None = None,
    razorpay_payment_id: str | None = None,
    outcome: str = "pending",
) -> int:
    """Write a single ledger entry and return its ID."""
    violations = []
    passed = None
    final_action = None

    if policy_result is not None:
        passed = 1 if policy_result.get("passed") else 0
        violations = policy_result.get("violations", [])
        final_action = policy_result.get("final_action")

    with get_db() as conn:
        cursor = conn.execute(
            """INSERT INTO ledger
               (actor, trigger, proposal_json, reasoning, policy_passed,
                policy_violations, final_action_json,
                razorpay_order_id, razorpay_payment_id, outcome)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                actor,
                trigger,
                json.dumps(proposal) if proposal else None,
                reasoning,
                passed,
                json.dumps(violations) if violations else None,
                json.dumps(final_action) if final_action else None,
                razorpay_order_id,
                razorpay_payment_id,
                outcome,
            ),
        )
        return cursor.lastrowid


def get_entries(limit: int = 50, filter_outcome: str | None = None) -> list[dict]:
    """Read recent ledger entries, optionally filtered by outcome."""
    with get_db() as conn:
        if filter_outcome:
            rows = conn.execute(
                "SELECT * FROM ledger WHERE outcome = ? ORDER BY id DESC LIMIT ?",
                (filter_outcome, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM ledger ORDER BY id DESC LIMIT ?",
                (limit,),
            ).fetchall()
        return [dict(row) for row in rows]


def get_entry_by_id(entry_id: int) -> dict | None:
    """Read a single ledger entry by ID."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM ledger WHERE id = ?", (entry_id,)
        ).fetchone()
        return dict(row) if row else None


def get_stats() -> dict:
    """Return aggregate stats for the dashboard stat strip."""
    with get_db() as conn:
        total = conn.execute("SELECT COUNT(*) FROM ledger").fetchone()[0]
        approved = conn.execute(
            "SELECT COUNT(*) FROM ledger WHERE outcome = 'approved' OR outcome = 'paid'"
        ).fetchone()[0]
        clamped = conn.execute(
            "SELECT COUNT(*) FROM ledger WHERE outcome = 'clamped'"
        ).fetchone()[0]
        rejected = conn.execute(
            "SELECT COUNT(*) FROM ledger WHERE outcome = 'rejected'"
        ).fetchone()[0]
        awaiting = conn.execute(
            "SELECT COUNT(*) FROM ledger WHERE outcome = 'awaiting_approval'"
        ).fetchone()[0]

        return {
            "total_proposals": total,
            "approved": approved,
            "clamped": clamped,
            "rejected": rejected,
            "awaiting_approval": awaiting,
            "rejection_rate": round(rejected / total * 100, 1) if total > 0 else 0,
        }
