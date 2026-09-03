"""Payment service — handles payment verification, webhooks, and failure recovery with merchant DB isolation and reliability infrastructure."""
import json
import logging
from backend.db import get_db
from backend.ledger.ledger import log_entry, update_outcome, get_entries_by_order
from backend.razorpay_client import sync_verify_payment_signature as verify_payment_signature
from backend.services.webhook_reliability import (
    DeduplicationEngine, RetryEngine, DLQService
)

logger = logging.getLogger("marlin.payment_service")


def verify_and_record_payment(
    order_id: str,
    payment_id: str,
    signature: str,
    merchant_id: str = "merchant_default",
) -> dict:
    """Verify Razorpay payment signature and record result in active merchant DB."""
    is_valid = verify_payment_signature(payment_id, order_id, signature, merchant_id=merchant_id)

    if not is_valid:
        _record_failure(order_id, payment_id, "INVALID_SIGNATURE", "Payment signature verification failed", merchant_id=merchant_id)
        return {"status": "rejected", "reason": "Invalid payment signature"}

    with get_db(merchant_id) as conn:
        order = conn.execute(
            "SELECT * FROM orders WHERE razorpay_order_id = ?", (order_id,)
        ).fetchone()

        if not order:
            return {"status": "error", "reason": f"Order {order_id} not found for merchant '{merchant_id}'"}

        order_dict = dict(order)
        if order_dict["status"] == "paid":
            return {"status": "already_processed", "outcome": "paid"}

        conn.execute(
            """UPDATE orders
               SET razorpay_payment_id = ?, status = 'paid', updated_at = CURRENT_TIMESTAMP
               WHERE razorpay_order_id = ?""",
            (payment_id, order_id),
        )

    correlation_id = _get_correlation_for_order(order_id, merchant_id=merchant_id)
    log_entry(
        correlation_id=correlation_id,
        event_type="payment_captured",
        actor="razorpay",
        trigger="payment_verification",
        reasoning=f"Payment {payment_id} verified and captured for order {order_id}",
        razorpay_order_id=order_id,
        razorpay_payment_id=payment_id,
        outcome="paid",
        merchant_id=merchant_id,
    )

    return {"status": "paid", "order_id": order_id, "payment_id": payment_id, "merchant_id": merchant_id}


def process_webhook(
    event: str,
    payload: dict,
    raw_body: bytes = None,
    webhook_signature: str = None,
    merchant_id: str = "merchant_default",
) -> dict:
    """Process a Razorpay webhook event with idempotency deduplication, backoff retries, and DLQ support."""
    order_entity = payload.get("payload", {}).get("order", {}).get("entity", {})
    payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})

    order_id = order_entity.get("id", "")
    payment_id = payment_entity.get("id", "")

    event_id = payload.get("event_id") or payload.get("id") or (f"evt_{order_id}_{event}" if order_id else None)

    # 1. Idempotency Key Deduplication Check
    if event_id:
        is_dup, cached = DeduplicationEngine.check_and_lock_event(event_id, merchant_id, event)
        if is_dup and cached:
            return cached

    # Handler function to be wrapped in exponential backoff retry loop
    def _execute_webhook_logic():
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

        with get_db(merchant_id) as conn:
            order = conn.execute(
                "SELECT status FROM orders WHERE razorpay_order_id = ?", (order_id,)
            ).fetchone()

            if order:
                current_status = dict(order)["status"]
                if current_status == order_status:
                    return {"status": "already_processed", "outcome": outcome}

            conn.execute(
                """UPDATE orders
                   SET razorpay_payment_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                   WHERE razorpay_order_id = ?""",
                (payment_id, order_status, order_id),
            )

        if outcome == "failed":
            _handle_payment_failure(order_id, payment_id, merchant_id=merchant_id)

        correlation_id = _get_correlation_for_order(order_id, merchant_id=merchant_id)
        log_entry(
            correlation_id=correlation_id,
            event_type="payment_webhook",
            actor="razorpay",
            trigger="webhook",
            reasoning=f"Payment {outcome} for order {order_id}",
            razorpay_order_id=order_id,
            razorpay_payment_id=payment_id,
            outcome=outcome,
            merchant_id=merchant_id,
        )

        return {"status": "processed", "outcome": outcome, "merchant_id": merchant_id, "event_id": event_id}

    # 2. Execute with Retry & DLQ Fallback
    try:
        result = RetryEngine.execute_with_retry(_execute_webhook_logic, max_retries=3)
        if event_id:
            DeduplicationEngine.mark_event_processed(event_id, merchant_id, result)
        return result
    except Exception as e:
        logger.error(f"Webhook processing failed after retries for event '{event_id}': {e}")
        if event_id:
            dlq_id = DLQService.push_to_dlq(
                event_id=event_id,
                merchant_id=merchant_id,
                event_type=event,
                payload=payload,
                error_message=str(e),
                attempts=3,
            )
            return {
                "status": "dlq_pushed",
                "event_id": event_id,
                "dlq_id": dlq_id,
                "error": str(e),
                "merchant_id": merchant_id,
            }
        raise


def simulate_payment_failure(order_id: str, merchant_id: str = "merchant_default") -> dict:
    """Simulate a payment failure for demo purposes in active merchant DB."""
    with get_db(merchant_id) as conn:
        order = conn.execute(
            "SELECT * FROM orders WHERE razorpay_order_id = ?", (order_id,)
        ).fetchone()

        if not order:
            raise ValueError(f"Order {order_id} not found for merchant '{merchant_id}'")

        order_dict = dict(order)
        offer_id = order_dict.get("offer_id")

        conn.execute(
            """UPDATE orders
               SET status = 'payment_failed', updated_at = CURRENT_TIMESTAMP
               WHERE razorpay_order_id = ?""",
            (order_id,),
        )

    correlation_id = _get_correlation_for_order(order_id, merchant_id=merchant_id)

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
        merchant_id=merchant_id,
    )

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
        merchant_id=merchant_id,
    )

    return {
        "status": "simulated",
        "outcome": "failed",
        "order_id": order_id,
        "offer_id": offer_id,
        "merchant_id": merchant_id,
        "message": f"Payment failure simulated for order {order_id} (Merchant: {merchant_id}).",
    }


def _record_failure(order_id: str, payment_id: str, code: str, msg: str, merchant_id: str = "merchant_default"):
    correlation_id = _get_correlation_for_order(order_id, merchant_id=merchant_id)
    log_entry(
        correlation_id=correlation_id,
        event_type="payment_verification_failed",
        actor="razorpay",
        trigger="payment_verification",
        reasoning=msg,
        razorpay_order_id=order_id,
        razorpay_payment_id=payment_id,
        outcome="failed",
        error_code=code,
        error_message=msg,
        merchant_id=merchant_id,
    )


def _handle_payment_failure(order_id: str, payment_id: str, merchant_id: str = "merchant_default"):
    with get_db(merchant_id) as conn:
        order = conn.execute(
            "SELECT offer_id FROM orders WHERE razorpay_order_id = ?", (order_id,)
        ).fetchone()

        if order:
            offer_id = dict(order).get("offer_id")
            if offer_id:
                logger.info(f"Offer {offer_id} invalidated for merchant {merchant_id}")


def _get_correlation_for_order(order_id: str, merchant_id: str = "merchant_default") -> str:
    entries = get_entries_by_order(order_id, merchant_id=merchant_id)
    if entries:
        return entries[0].get("correlation_id", f"corr_{order_id}")
    return f"corr_{order_id}"
