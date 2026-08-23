"""Razorpay webhook handler — payment status updates."""
import json
from fastapi import APIRouter, Request
from backend.ledger.ledger import log_entry
from backend.db import get_db

router = APIRouter(prefix="/api", tags=["webhook"])


@router.post("/webhook/razorpay")
async def razorpay_webhook(request: Request):
    """Handle Razorpay payment status webhook.

    Updates order status in DB and logs to ledger.
    """
    payload = await request.json()

    # Extract key fields (Razorpay webhook format)
    event = payload.get("event", "")
    order_id = payload.get("payload", {}).get("order", {}).get("entity", {}).get("id", "")
    payment_id = payload.get("payload", {}).get("payment", {}).get("entity", {}).get("id", "")

    if not order_id:
        return {"status": "ignored", "reason": "no order_id"}

    # Determine outcome from event
    if "payment.captured" in event or "payment.authorized" in event:
        outcome = "paid"
        order_status = "paid"
    elif "payment.failed" in event:
        outcome = "failed"
        order_status = "failed"
    else:
        return {"status": "ignored", "reason": f"unhandled event: {event}"}

    # Update order in DB
    with get_db() as conn:
        conn.execute(
            "UPDATE orders SET razorpay_payment_id = ?, status = ? WHERE razorpay_order_id = ?",
            (payment_id, order_status, order_id),
        )

    # Log to ledger
    log_entry(
        actor="razorpay",
        trigger="webhook",
        reasoning=f"Payment {outcome} for order {order_id}",
        razorpay_order_id=order_id,
        razorpay_payment_id=payment_id,
        outcome=outcome,
    )

    return {"status": "processed", "outcome": outcome}


@router.post("/simulate/payment-failure")
def simulate_payment_failure(order_id: str):
    """Simulate a payment failure for demo purposes.

    Updates the order to failed status and logs the failure.
    Used for the 'graceful failure handling' demo.
    """
    with get_db() as conn:
        conn.execute(
            "UPDATE orders SET status = 'failed' WHERE razorpay_order_id = ?",
            (order_id,),
        )

    # Log the failure
    log_entry(
        actor="razorpay",
        trigger="webhook",
        reasoning=f"Simulated payment failure for order {order_id}. Reverted to standard price, no retry with discount.",
        razorpay_order_id=order_id,
        outcome="failed",
    )

    # Also log the recovery
    log_entry(
        actor="system",
        trigger="recovery",
        reasoning="Payment failed. Agent reverted to standard price. No retry with discount applied.",
        razorpay_order_id=order_id,
        outcome="reverted",
    )

    return {"status": "simulated", "outcome": "failed"}
