"""Ledger read endpoints for the dashboard."""
from fastapi import APIRouter, Query
from backend.ledger.ledger import (
    get_entries, get_entry_by_id, get_entries_by_correlation,
    get_entries_by_order, get_stats,
)

router = APIRouter(prefix="/api", tags=["ledger"])


@router.get("/ledger/stats")
def ledger_stats():
    """Aggregate stats for the dashboard stat strip."""
    return get_stats()


@router.get("/ledger")
def list_ledger(
    limit: int = Query(default=50, le=200),
    outcome: str = Query(default=None),
):
    """Recent ledger entries, optionally filtered by outcome."""
    entries = get_entries(limit=limit, filter_outcome=outcome)
    return {"entries": entries, "count": len(entries)}


@router.get("/ledger/{correlation_id}")
def get_ledger_by_correlation(correlation_id: str):
    """Get all entries for a correlation_id — full lifecycle view."""
    entries = get_entries_by_correlation(correlation_id)
    return {"correlation_id": correlation_id, "entries": entries, "count": len(entries)}


@router.get("/ledger/order/{order_id}")
def get_order_lifecycle(order_id: str):
    """Get all ledger entries for a specific Razorpay order — vertical stepper view."""
    entries = get_entries_by_order(order_id)
    return {"order_id": order_id, "entries": entries, "count": len(entries)}
