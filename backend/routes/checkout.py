"""Checkout routes — split into propose, approve, create-order per spec with multi-tenant merchant context."""
from fastapi import APIRouter, HTTPException, Depends
from backend.models import (
    CheckoutProposeRequest, CheckoutApproveRequest, CheckoutCreateOrderRequest,
)
from backend.services.checkout_service import (
    propose_checkout, approve_checkout, create_order_from_proposal,
)
from backend.tenant_context import get_current_merchant_id

router = APIRouter(prefix="/api", tags=["checkout"])


@router.post("/checkout/propose")
def checkout_propose(
    req: CheckoutProposeRequest,
    merchant_id: str = Depends(get_current_merchant_id),
):
    """Step 1: Brain proposes, Cage evaluates with merchant policy, result stored in merchant DB."""
    if not req.cart:
        raise HTTPException(status_code=400, detail="Cart is empty")

    try:
        result = propose_checkout(
            cart=[item.model_dump() for item in req.cart],
            idempotency_key=req.idempotency_key,
            merchant_id=merchant_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Checkout proposal failed: {e}")

    return result


@router.post("/checkout/approve")
def checkout_approve(
    req: CheckoutApproveRequest,
    merchant_id: str = Depends(get_current_merchant_id),
):
    """Step 2: Merchant approves a pending proposal in their isolated DB."""
    try:
        result = approve_checkout(req.ledger_id, merchant_id=merchant_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Approval failed: {e}")

    return result


@router.post("/checkout/create-order")
def checkout_create_order(
    req: CheckoutCreateOrderRequest,
    merchant_id: str = Depends(get_current_merchant_id),
):
    """Step 3: Create Razorpay order for auto-approved proposals in active merchant DB."""
    try:
        result = create_order_from_proposal(
            req.ledger_id,
            idempotency_key=req.idempotency_key,
            merchant_id=merchant_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Order creation failed: {e}")

    return result
