"""Webhook and payment routes — Razorpay payment verification and simulation."""
from fastapi import APIRouter, Request, HTTPException
from backend.models import PaymentVerifyRequest, PaymentSimulateRequest
from backend.services.payment_service import (
    verify_and_record_payment, process_webhook, simulate_payment_failure,
)

router = APIRouter(prefix="/api", tags=["payment"])


@router.post("/payment/verify")
def payment_verify(req: PaymentVerifyRequest):
    """Verify a Razorpay payment signature and record the result.

    Does NOT trust the frontend — always verifies server-side.
    """
    try:
        result = verify_and_record_payment(
            order_id=req.razorpay_order_id,
            payment_id=req.razorpay_payment_id,
            signature=req.razorpay_signature,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment verification failed: {e}")

    if result["status"] == "rejected":
        raise HTTPException(status_code=400, detail=result["reason"])

    return result


@router.post("/webhooks/razorpay")
async def razorpay_webhook(request: Request):
    """Handle Razorpay payment status webhook.

    Idempotent — duplicate webhooks don't create duplicate records.
    Verifies webhook signature when configured.
    """
    raw_body = await request.body()
    payload = await request.json()

    event = payload.get("event", "")
    signature = request.headers.get("x-razorpay-signature", "")

    try:
        result = process_webhook(
            event=event,
            payload=payload,
            raw_body=raw_body,
            webhook_signature=signature,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Webhook processing failed: {e}")

    return result


@router.post("/simulate/payment-failure")
def payment_failure_simulation(order_id: str):
    """Simulate a payment failure for demo purposes.

    1. Marks the order as PAYMENT_FAILED
    2. Records the failure in the ledger
    3. Marks the offer as INVALIDATED
    4. Prevents reuse of the same offer ID
    """
    try:
        result = simulate_payment_failure(order_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {e}")

    return result
