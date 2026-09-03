"""Webhook and payment routes — Razorpay payment verification, webhook handling, and DLQ management."""
import json
import logging
from fastapi import APIRouter, Request, HTTPException, Depends, Query
from backend.models import PaymentVerifyRequest, PaymentSimulateRequest
from backend.services.payment_service import (
    verify_and_record_payment, process_webhook, simulate_payment_failure,
)
from backend.services.webhook_reliability import DLQService
from backend.webhook_verifier import verify_webhook_signature
from backend.merchant_manager import get_merchant
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
    """Handle Razorpay payment status webhook for active merchant tenant with reliability & idempotency."""
    raw_body = await request.body()
    try:
        payload = await request.json()
    except Exception:
        payload = {}

    event = payload.get("event", "")
    signature = request.headers.get("x-razorpay-signature", "")
    timestamp = request.headers.get("x-razorpay-event-timestamp") or request.headers.get("x-razorpay-timestamp")

    merchant_info = get_merchant(merchant_id)
    webhook_secret = merchant_info.get("razorpay_webhook_secret")

    # Verify webhook signature with timing-safe comparison and replay timestamp check
    is_valid = verify_webhook_signature(
        raw_body=raw_body,
        signature=signature,
        secret=webhook_secret,
        timestamp=timestamp,
    )

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


@router.get("/webhooks/dlq")
def get_dlq_events(
    status: str = Query(default="pending"),
    limit: int = Query(default=50, le=200),
    merchant_id: str = Depends(get_current_merchant_id),
):
    """List dead-lettered webhook events (DLQ) for active merchant tenant."""
    events = DLQService.list_dlq_events(merchant_id=merchant_id, status=status, limit=limit)
    return {
        "dlq_events": events,
        "count": len(events),
        "merchant_id": merchant_id,
    }


@router.post("/webhooks/dlq/{dlq_id}/replay")
def replay_dlq_event(
    dlq_id: int,
    merchant_id: str = Depends(get_current_merchant_id),
):
    """Replay a dead-lettered webhook event manually."""
    try:
        result = DLQService.replay_dlq_event(dlq_id=dlq_id, merchant_id=merchant_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DLQ replay failed: {e}")

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
