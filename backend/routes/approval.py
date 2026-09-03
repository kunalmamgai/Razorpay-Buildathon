"""Approval routes — merchant approve/reject pending proposals with multi-tenant context."""
from fastapi import APIRouter, HTTPException, Depends
from backend.services.approval_service import (
    list_pending_approvals, approve_proposal, reject_proposal,
)
from backend.tenant_context import get_current_merchant_id

router = APIRouter(prefix="/api", tags=["approvals"])


@router.get("/approvals")
def get_approvals(merchant_id: str = Depends(get_current_merchant_id)):
    """Get all entries awaiting merchant approval in the active merchant database."""
    approvals = list_pending_approvals(merchant_id=merchant_id)
    return {"approvals": approvals, "count": len(approvals), "merchant_id": merchant_id}


@router.post("/approvals/{ledger_id}/approve")
def approve(
    ledger_id: int,
    merchant_id: str = Depends(get_current_merchant_id),
):
    """Approve a pending proposal in active merchant DB."""
    try:
        result = approve_proposal(ledger_id, merchant_id=merchant_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result


@router.post("/approvals/{ledger_id}/reject")
def reject(
    ledger_id: int,
    merchant_id: str = Depends(get_current_merchant_id),
):
    """Reject a pending proposal in active merchant DB."""
    try:
        result = reject_proposal(ledger_id, merchant_id=merchant_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result
