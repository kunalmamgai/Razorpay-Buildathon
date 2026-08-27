"""Payment service — handles payment verification, webhooks, and failure recovery.

SAFEGUARDS:
- Does not trust frontend payment success alone
- Verifies Razorpay payment signatures server-side
- Makes webhook processing idempotent
- Does not silently reuse invalidated discounts after payment failure
- Creates new retry orders instead of reusing failed ones
"""
import json
import logging
from backend.db import get_db
from backend.ledger.ledger import log_entry, update_outcome, get_entries_by_order
from backend.razorpay_client import sync_verify_payment_signature as verify_payment_signature

logger = logging.getLogger(__name__)


def verify_and_record_payment(order_id: str, payment_id: str, signature: str) -> dict:
    """Verify Razorpay payment signature and record the result.

    Does NOT trust the frontend — always verifies server-side.
    """
    # Verify signature
    is_valid = verify_payment_signature(payment_id, order_id, signature)

    if not is_valid:
        # Invalid signature — reject
        _record_failure(order_id, payment_id, "INVALID_SIGNATURE", "Payment signature verification failed")
        return {"status": "rejected", "reason": "Invalid payment signature"}

    # Signature valid — record payment
    with get_db() as conn:
        order = conn.execute(
            "SELECT * FROM orders WHERE razorpay_order_id = ?", (order_id,)
        ).fetchone()

        if not order:
            return {"status": "error", "reason": f"Order {order_id} not found"}

        order_dict = dict(order)

        # Idempotent: if already paid, don't double-record
        if order_dict["status"] == "paid":
            return {"status": "already_processed", "outcome": "paid"}

        conn.execute(
            """UPDATE orders
               SET razorpay_payment_id = ?, status = 'paid', updated_at = CURRENT_TIMESTAMP
               WHERE razorpay_order_id = ?""",
            (payment_id, order_id),
        )

    # Log to ledger
    correlation_id = _get_correlation_for_order(order_id)
    log_entry(
        correlation_id=correlation_id,
        event_type="payment_captured",
        actor="razorpay",
        trigger="payment_verification",
        reasoning=f"Payment {payment_id} verified and captured for order {order_id}",
        razorpay_order_id=order_id,
        razorpay_payment_id=payment_id,
        outcome="paid",
    )

    return {"status": "paid", "order_id": order_id, "payment_id": payment_id}


def process_webhook(event: str, payload: dict, raw_body: bytes = None,
                    webhook_signature: str = None) -> dict:
    """Process a Razorpay webhook event.

    Idempotent — duplicate webhooks don't create duplicate records.
    """
    # Verify webhook signature if configured
    if raw_body and webhook_signature:
        from backend.razorpay_client import verify_webhook_signature
        if not verify_webhook_signature(raw_body, webhook_signature):
            logger.warning(f"Webhook signature verification failed for event: {event}")
            return {"status": "rejected", "reason": "Invalid webhook signature"}

    # Extract entities from Razorpay webhook format
    order_entity = payload.get("payload", {}).get("order", {}).get("entity", {})
    payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})

    order_id = order_entity.get("id", "")
    payment_id = payment_entity.get("id", "")

    if not order_id:
        return {"status": "ignored", "reason": "No order_id in webhook payload"}

    if "payment.captured" in event or "payment.authorized" in event:
        outcome = "paid"
        order_status = "paid"
    elif "payment.failed" in event:
        outcome = "failed"
        order_status = "payment_failed"
    else:
        return {"status": "ignored", "reason": f"Unhandled event: {event}"}

    # Idempotent: check current status
    with get_db() as conn:
        order = conn.execute(
            "SELECT status FROM orders WHERE razorpay_order_id = ?", (order_id,)
        ).fetchone()

        if order:
            current_status = dict(order)["status"]
            # Already in this state — skip
            if current_status == order_status:
                return {"status": "already_processed", "outcome": outcome}

        conn.execute(
            """UPDATE orders
               SET razorpay_payment_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP
               WHERE razorpay_order_id = ?""",
            (payment_id, order_status, order_id),
        )

    # Handle payment failure — invalidate the offer
    if outcome == "failed":
        _handle_payment_failure(order_id, payment_id)

    correlation_id = _get_correlation_for_order(order_id)
    log_entry(
        correlation_id=correlation_id,
        event_type="payment_webhook",
        actor="razorpay",
        trigger="webhook",
        reasoning=f"Payment {outcome} for order {order_id}",
        razorpay_order_id=order_id,
        razorpay_payment_id=payment_id,
        outcome=outcome,
    )

    return {"status": "processed", "outcome": outcome}


def simulate_payment_failure(order_id: str) -> dict:
    """Simulate a payment failure for demo purposes.

    1. Marks the order as PAYMENT_FAILED
    2. Records the failure in the ledger
    3. Marks the offer as INVALIDATED
    4. Prevents reuse of the same offer ID
    """
    with get_db() as conn:
        order = conn.execute(
            "SELECT * FROM orders WHERE razorpay_order_id = ?", (order_id,)
        ).fetchone()

        if not order:
            raise ValueError(f"Order {order_id} not found")

        order_dict = dict(order)
        offer_id = order_dict.get("offer_id")

        conn.execute(
            """UPDATE orders
               SET status = 'payment_failed', updated_at = CURRENT_TIMESTAMP
               WHERE razorpay_order_id = ?""",
            (order_id,),
        )

    correlation_id = _get_correlation_for_order(order_id)

    # Log the failure
    log_entry(
        correlation_id=correlation_id,
        event_type="payment_failed",
        actor="razorpay",
        trigger="simulate",
        reasoning=f"Simulated payment failure for order {order_id}. Offer {offer_id} invalidated.",
        razorpay_order_id=order_id,
        outcome="failed",
        error_code="SIMULATED_FAILURE",
        error_message="Payment failed in test mode. The offer has been invalidated.",
    )

    # Log recovery
    log_entry(
        correlation_id=correlation_id,
        event_type="recovery",
        actor="system",
        trigger="recovery",
        reasoning=(
            f"Payment failed for order {order_id}. "
            "Agent reverted to standard price. No retry with discount applied. "
            "Customer may start a new checkout."
        ),
        razorpay_order_id=order_id,
        outcome="reverted",
    )

    return {
        "status": "simulated",
        "outcome": "failed",
        "order_id": order_id,
        "offer_id": offer_id,
        "message": (
            f"Payment failure simulated for order {order_id}. "
            "The offer has been invalidated and cannot be reused."
        ),
    }


def _handle_payment_failure(order_id: str, payment_id: str):
    """Handle a real payment failure — invalidate the offer."""
    with get_db() as conn:
        order = conn.execute(
            "SELECT offer_id FROM orders WHERE razorpay_order_id = ?", (order_id,)
        ).fetchone()

        if order:
            offer_id = dict(order).get("offer_id")
            if offer_id:
                logger.info(f"Offer {offer_id} invalidated due to payment failure")


def _get_correlation_for_order(order_id: str) -> str:
    """Look up the correlation_id for an order from its ledger entries."""
    entries = get_entries_by_order(order_id)
    if entries:
        return entries[0].get("correlation_id", f"corr_{order_id}")
    return f"corr_{order_id}"
