"""Ledger read endpoints for the dashboard."""
from fastapi import APIRouter, Query
from backend.ledger.ledger import get_entries, get_entry_by_id, get_stats

router = APIRouter(prefix="/api", tags=["ledger"])


@router.get("/ledger/stats")
def ledger_stats():
    """Get aggregate stats for the dashboard stat strip."""
    return get_stats()


@router.get("/ledger")
def list_ledger(
    limit: int = Query(default=50, le=200),
    outcome: str = Query(default=None),
):
    """Get recent ledger entries, optionally filtered by outcome.

    Outcome values: approved, clamped, rejected, awaiting_approval, paid, failed, reverted
    """
    entries = get_entries(limit=limit, filter_outcome=outcome)
    return {"entries": entries, "count": len(entries)}


@router.get("/ledger/{entry_id}")
def get_ledger_entry(entry_id: int):
    """Get a single ledger entry by ID."""
    entry = get_entry_by_id(entry_id)
    if not entry:
        return {"error": "not found"}, 404
    return entry
