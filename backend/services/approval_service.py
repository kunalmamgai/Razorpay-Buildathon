"""Approval service — handles merchant approval/rejection of pending proposals."""
import json
import logging
from backend.db import get_db
from backend.ledger.ledger import (
    get_entry_by_id, get_pending_approvals, update_approval, log_entry,
)

logger = logging.getLogger(__name__)


def list_pending_approvals() -> list[dict]:
    """Get all entries awaiting merchant approval."""
    return get_pending_approvals()


def approve_proposal(ledger_id: int) -> dict:
    """Approve a pending proposal. Returns updated entry info."""
    entry = get_entry_by_id(ledger_id)
    if not entry:
        raise ValueError(f"Ledger entry {ledger_id} not found")

    if entry["outcome"] != "awaiting_approval":
        raise ValueError(
            f"Entry {ledger_id} is not awaiting approval (current: {entry['outcome']})"
        )

    # Check if already approved
    if entry.get("approval_status") == "approved":
        raise ValueError(f"Entry {ledger_id} has already been approved")

    update_approval(ledger_id, "approved", "merchant")

    return {
        "ledger_id": ledger_id,
        "correlation_id": entry["correlation_id"],
        "status": "approved",
        "message": "Proposal approved. You can now proceed to create the order.",
    }


def reject_proposal(ledger_id: int) -> dict:
    """Reject a pending proposal."""
    entry = get_entry_by_id(ledger_id)
    if not entry:
        raise ValueError(f"Ledger entry {ledger_id} not found")

    if entry["outcome"] != "awaiting_approval":
        raise ValueError(
            f"Entry {ledger_id} is not awaiting approval (current: {entry['outcome']})"
        )

    update_approval(ledger_id, "rejected", "merchant")

    # Log the rejection
    log_entry(
        correlation_id=entry["correlation_id"],
        event_type="approval_decision",
        actor="merchant",
        trigger="approval",
        reasoning="Merchant rejected the proposal",
        razorpay_order_id=entry.get("razorpay_order_id"),
        outcome="rejected",
        approval_status="rejected",
    )

    return {
        "ledger_id": ledger_id,
        "correlation_id": entry["correlation_id"],
        "status": "rejected",
        "message": "Proposal rejected. No order will be created.",
    }
