"""Ledger read endpoints for the dashboard with multi-tenant merchant context."""
from fastapi import APIRouter, Query, Depends
from backend.ledger.ledger import (
    get_entries, get_entry_by_id, get_entries_by_correlation,
    get_entries_by_order, get_stats,
)
from backend.tenant_context import get_current_merchant_id

router = APIRouter(prefix="/api", tags=["ledger"])


@router.get("/ledger/stats")
def ledger_stats(merchant_id: str = Depends(get_current_merchant_id)):
    """Aggregate stats for the active merchant's dashboard."""
    return get_stats(merchant_id=merchant_id)


@router.get("/ledger")
def list_ledger(
    limit: int = Query(default=50, le=200),
    outcome: str = Query(default=None),
    merchant_id: str = Depends(get_current_merchant_id),
):
    """Recent ledger entries from the active merchant's database."""
    entries = get_entries(limit=limit, filter_outcome=outcome, merchant_id=merchant_id)
    return {"entries": entries, "count": len(entries), "merchant_id": merchant_id}


@router.get("/ledger/{correlation_id}")
def get_ledger_by_correlation(
    correlation_id: str,
    merchant_id: str = Depends(get_current_merchant_id),
):
    """Get all entries for a correlation_id in active merchant DB."""
    entries = get_entries_by_correlation(correlation_id, merchant_id=merchant_id)
    return {"correlation_id": correlation_id, "entries": entries, "count": len(entries), "merchant_id": merchant_id}


@router.get("/ledger/order/{order_id}")
def get_order_lifecycle(
    order_id: str,
    merchant_id: str = Depends(get_current_merchant_id),
):
    """Get all ledger entries for a specific Razorpay order."""
    entries = get_entries_by_order(order_id, merchant_id=merchant_id)
    return {"order_id": order_id, "entries": entries, "count": len(entries), "merchant_id": merchant_id}
