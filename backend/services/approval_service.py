"""Approval service — handles merchant approval/rejection of pending proposals per tenant DB."""
import json
import logging
from backend.db import get_db
from backend.ledger.ledger import (
    get_entry_by_id, get_pending_approvals, update_approval, log_entry,
)

logger = logging.getLogger("marlin.approval_service")


def list_pending_approvals(merchant_id: str = "merchant_default") -> list[dict]:
    """Get all entries awaiting merchant approval in merchant database."""
    return get_pending_approvals(merchant_id=merchant_id)


def approve_proposal(ledger_id: int, merchant_id: str = "merchant_default") -> dict:
    """Approve a pending proposal. Returns updated entry info."""
    entry = get_entry_by_id(ledger_id, merchant_id=merchant_id)
    if not entry:
        raise ValueError(f"Ledger entry {ledger_id} not found for merchant '{merchant_id}'")

    if entry["outcome"] != "awaiting_approval":
        raise ValueError(
            f"Entry {ledger_id} is not awaiting approval (current: {entry['outcome']})"
        )

    if entry.get("approval_status") == "approved":
        raise ValueError(f"Entry {ledger_id} has already been approved")

    update_approval(ledger_id, "approved", "merchant", merchant_id=merchant_id)

    return {
        "ledger_id": ledger_id,
        "correlation_id": entry["correlation_id"],
        "status": "approved",
        "message": "Proposal approved. You can now proceed to create the order.",
        "merchant_id": merchant_id,
    }


def reject_proposal(ledger_id: int, merchant_id: str = "merchant_default") -> dict:
    """Reject a pending proposal."""
    entry = get_entry_by_id(ledger_id, merchant_id=merchant_id)
    if not entry:
        raise ValueError(f"Ledger entry {ledger_id} not found for merchant '{merchant_id}'")

    if entry["outcome"] != "awaiting_approval":
        raise ValueError(
            f"Entry {ledger_id} is not awaiting approval (current: {entry['outcome']})"
        )

    update_approval(ledger_id, "rejected", "merchant", merchant_id=merchant_id)

    log_entry(
        correlation_id=entry["correlation_id"],
        event_type="approval_decision",
        actor="merchant",
        trigger="approval",
        reasoning="Merchant rejected the proposal",
        razorpay_order_id=entry.get("razorpay_order_id"),
        outcome="rejected",
        approval_status="rejected",
        merchant_id=merchant_id,
    )

    return {
        "ledger_id": ledger_id,
        "correlation_id": entry["correlation_id"],
        "status": "rejected",
        "message": "Proposal rejected. No order will be created.",
        "merchant_id": merchant_id,
    }
