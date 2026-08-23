"""Approval routes — merchant approve/reject pending proposals."""
from fastapi import APIRouter, HTTPException
from backend.services.approval_service import (
    list_pending_approvals, approve_proposal, reject_proposal,
)

router = APIRouter(prefix="/api", tags=["approvals"])


@router.get("/approvals")
def get_approvals():
    """Get all entries awaiting merchant approval."""
    approvals = list_pending_approvals()
    return {"approvals": approvals, "count": len(approvals)}


@router.post("/approvals/{ledger_id}/approve")
def approve(ledger_id: int):
    """Approve a pending proposal."""
    try:
        result = approve_proposal(ledger_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result


@router.post("/approvals/{ledger_id}/reject")
def reject(ledger_id: int):
    """Reject a pending proposal."""
    try:
        result = reject_proposal(ledger_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result
