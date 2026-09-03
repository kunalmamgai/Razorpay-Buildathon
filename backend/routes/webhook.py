"""Webhook and payment routes — Razorpay payment verification and simulation with multi-tenant context."""
import json
import logging
from fastapi import APIRouter, Request, HTTPException, Depends
from backend.models import PaymentVerifyRequest, PaymentSimulateRequest
from backend.services.payment_service import (
    verify_and_record_payment, process_webhook, simulate_payment_failure,
)
from backend.razorpay_client import async_verify_webhook_signature
from backend.tenant_context import get_current_merchant_id

router = APIRouter(prefix="/api", tags=["payment"])
logger = logging.getLogger("marlin.webhook_route")


@router.post("/payment/verify")
def payment_verify(
    req: PaymentVerifyRequest,
    merchant_id: str = Depends(get_current_merchant_id),
):
    """Verify a Razorpay payment signature and record the result in active merchant DB."""
    try:
        result = verify_and_record_payment(
            order_id=req.razorpay_order_id,
            payment_id=req.razorpay_payment_id,
            signature=req.razorpay_signature,
            merchant_id=merchant_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment verification failed: {e}")

    if result.get("status") == "rejected":
        raise HTTPException(status_code=400, detail=result.get("reason"))

    return result


@router.post("/webhooks/razorpay")
async def razorpay_webhook(
    request: Request,
    merchant_id: str = Depends(get_current_merchant_id),
):
    """Handle Razorpay payment status webhook for active merchant tenant."""
    raw_body = await request.body()
    payload = await request.json()
    
    event = payload.get("event", "")
    signature = request.headers.get("x-razorpay-signature", "")
    
    # Verify webhook signature using merchant credentials
    is_valid = await async_verify_webhook_signature(raw_body, signature, merchant_id=merchant_id)
    if not is_valid:
        logger.warning(f"Invalid webhook signature received for merchant '{merchant_id}'")
        raise HTTPException(status_code=400, detail="Invalid webhook signature")
    
    try:
        result = process_webhook(
            event=event,
            payload=payload,
            raw_body=raw_body,
            webhook_signature=signature,
            merchant_id=merchant_id,
        )
    except Exception as e:
        logger.error(f"Webhook processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Webhook processing failed: {e}")
    
    return result


@router.post("/simulate/payment-failure")
def payment_failure_simulation(
    order_id: str,
    merchant_id: str = Depends(get_current_merchant_id),
):
    """Simulate a payment failure for demo purposes in active merchant DB."""
    try:
        result = simulate_payment_failure(order_id, merchant_id=merchant_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {e}")

    return result
