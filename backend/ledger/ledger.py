"""The Ledger — immutable audit trail of every decision and API call.

Every entry answers: what was proposed, why, what the cage did, what happened with money.
Entries are INSERT-ONLY — we never erase rejected proposals or failed payments.

Each entry has a correlation_id that groups related events for the same checkout/campaign.
"""
import json
import uuid
from backend.db import get_db


def log_entry(
    correlation_id: str,
    event_type: str,
    actor: str,
    trigger: str,
    proposal: dict | None = None,
    reasoning: str = "",
    policy_result: dict | None = None,
    razorpay_order_id: str | None = None,
    razorpay_payment_id: str | None = None,
    idempotency_key: str | None = None,
    outcome: str = "pending",
    error_code: str | None = None,
    error_message: str | None = None,
    approval_status: str | None = None,
) -> int:
    """Write a single ledger entry and return its ID."""
    violations = []
    final_action = None
    policy_decision = None
    policy_version = "policy-v1"

    if policy_result is not None:
        policy_decision = policy_result.get("decision")
        violations = policy_result.get("violations", [])
        final_action = policy_result.get("final_action")
        policy_version = policy_result.get("policy_version", "policy-v1")

    with get_db() as conn:
        cursor = conn.execute(
            """INSERT INTO ledger
               (correlation_id, event_type, actor, trigger,
                proposal_json, reasoning, policy_decision,
                policy_violations_json, final_action_json, policy_version,
                razorpay_order_id, razorpay_payment_id,
                idempotency_key, outcome, error_code, error_message,
                approval_status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                correlation_id,
                event_type,
                actor,
                trigger,
                json.dumps(proposal) if proposal else None,
                reasoning,
                policy_decision,
                json.dumps(violations) if violations else None,
                json.dumps(final_action) if final_action else None,
                policy_version,
                razorpay_order_id,
                razorpay_payment_id,
                idempotency_key,
                outcome,
                error_code,
                error_message,
                approval_status,
            ),
        )
        return cursor.lastrowid


def update_approval(entry_id: int, approval_status: str, approval_actor: str) -> bool:
    """Update a ledger entry with approval decision."""
    from datetime import datetime
    with get_db() as conn:
        cursor = conn.execute(
            """UPDATE ledger
               SET approval_status = ?, approval_actor = ?, approval_timestamp = ?
               WHERE id = ?""",
            (approval_status, approval_actor, datetime.utcnow().isoformat(), entry_id),
        )
        return cursor.rowcount > 0


def update_outcome(entry_id: int, outcome: str, razorpay_payment_id: str | None = None,
                   error_code: str | None = None, error_message: str | None = None) -> bool:
    """Update a ledger entry's outcome (e.g., after payment result)."""
    with get_db() as conn:
        updates = ["outcome = ?"]
        params = [outcome]
        if razorpay_payment_id:
            updates.append("razorpay_payment_id = ?")
            params.append(razorpay_payment_id)
        if error_code:
            updates.append("error_code = ?")
            params.append(error_code)
        if error_message:
            updates.append("error_message = ?")
            params.append(error_message)
        params.append(entry_id)
        cursor = conn.execute(
            f"UPDATE ledger SET {', '.join(updates)} WHERE id = ?",
            params,
        )
        return cursor.rowcount > 0


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


def get_entries_by_correlation(correlation_id: str) -> list[dict]:
    """Get all ledger entries for a correlation_id — full lifecycle view."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM ledger WHERE correlation_id = ? ORDER BY id ASC",
            (correlation_id,),
        ).fetchall()
        return [dict(row) for row in rows]


def get_entries_by_order(order_id: str) -> list[dict]:
    """Get all ledger entries for a specific Razorpay order, ordered chronologically."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM ledger WHERE razorpay_order_id = ? ORDER BY id ASC",
            (order_id,),
        ).fetchall()
        return [dict(row) for row in rows]


def get_entry_by_id(entry_id: int) -> dict | None:
    """Read a single ledger entry by ID."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM ledger WHERE id = ?", (entry_id,)
        ).fetchone()
        return dict(row) if row else None


def get_pending_approvals() -> list[dict]:
    """Get ledger entries awaiting merchant approval."""
    with get_db() as conn:
        rows = conn.execute(
            """SELECT * FROM ledger
               WHERE outcome = 'awaiting_approval'
               AND (approval_status IS NULL OR approval_status = 'pending')
               ORDER BY id DESC""",
        ).fetchall()
        return [dict(row) for row in rows]


def get_stats() -> dict:
    """Return aggregate stats for the dashboard stat strip."""
    with get_db() as conn:
        total = conn.execute("SELECT COUNT(*) FROM ledger").fetchone()[0]
        approved = conn.execute(
            "SELECT COUNT(*) FROM ledger WHERE outcome = 'approved'"
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
        paid = conn.execute(
            "SELECT COUNT(*) FROM ledger WHERE outcome = 'paid'"
        ).fetchone()[0]
        failed = conn.execute(
            "SELECT COUNT(*) FROM ledger WHERE outcome = 'failed'"
        ).fetchone()[0]

        return {
            "total_proposals": total,
            "approved": approved,
            "clamped": clamped,
            "rejected": rejected,
            "awaiting_approval": awaiting,
            "paid": paid,
            "failed": failed,
            "rejection_rate": round(rejected / total * 100, 1) if total > 0 else 0,
        }
