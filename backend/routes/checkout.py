"""Checkout routes — split into propose, approve, create-order per spec."""
import os
from fastapi import APIRouter, HTTPException
from backend.models import (
    CheckoutProposeRequest, CheckoutApproveRequest, CheckoutCreateOrderRequest,
)
from backend.services.checkout_service import (
    propose_checkout, approve_checkout, create_order_from_proposal,
)

router = APIRouter(prefix="/api", tags=["checkout"])


@router.post("/checkout/propose")
def checkout_propose(req: CheckoutProposeRequest):
    """Step 1: Brain proposes, Cage evaluates, result stored.

    Does NOT create a Razorpay order. Returns proposal for display.
    """
    if not req.cart:
        raise HTTPException(status_code=400, detail="Cart is empty")

    try:
        result = propose_checkout(
            cart=[item.model_dump() for item in req.cart],
            idempotency_key=req.idempotency_key,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Checkout proposal failed: {e}")

    return result


@router.post("/checkout/approve")
def checkout_approve(req: CheckoutApproveRequest):
    """Step 2: Merchant approves a pending proposal.

    Only works for proposals with outcome=awaiting_approval.
    Creates the Razorpay order after approval.
    """
    try:
        result = approve_checkout(req.ledger_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Approval failed: {e}")

    return result


@router.post("/checkout/create-order")
def checkout_create_order(req: CheckoutCreateOrderRequest):
    """Step 3: Create Razorpay order for auto-approved proposals.

    For proposals that don't need approval (approved/clamped).
    """
    try:
        result = create_order_from_proposal(
            req.ledger_id, idempotency_key=req.idempotency_key,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Order creation failed: {e}")

    return result
