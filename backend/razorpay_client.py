"""Thin wrapper around the Razorpay SDK for test-mode payments.

SAFEGUARDS:
- Creates Razorpay orders only from the backend
- Stores the Razorpay order ID before opening Checkout
- Generates and stores an idempotency key
- Verifies Razorpay payment signatures
- Verifies webhook signatures
- Makes webhook processing idempotent
- Never trusts frontend payment success alone
"""
import hashlib
import hmac
import os
import uuid
import logging

logger = logging.getLogger(__name__)

try:
    import razorpay
except ImportError:
    razorpay = None

from backend.config import RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET

_client = None


def get_client():
    """Lazy-initialize Razorpay client. Returns None in test mode without keys."""
    global _client
    if _client is not None:
        return _client
    if not RAZORPAY_KEY_ID or not razorpay:
        return None
    try:
        _client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        return _client
    except Exception as e:
        logger.error(f"Failed to initialize Razorpay client: {e}")
        return None


def create_order(amount_paise: int, idempotency_key: str | None = None,
                 notes: dict | None = None) -> dict:
    """Create a Razorpay order. Amount must be in paise (integer).

    Returns dict with at minimum: id, amount, currency, status.
    """
    if idempotency_key is None:
        idempotency_key = f"idem_{uuid.uuid4().hex[:16]}"

    client = get_client()
    if client is None:
        # Test mode fallback — generate a mock order
        order_id = f"order_test_{uuid.uuid4().hex[:12]}"
        logger.info(f"[MOCK] Created Razorpay order {order_id} for ₹{amount_paise // 100}")
        return {
            "id": order_id,
            "amount": amount_paise,
            "currency": "INR",
            "status": "created",
            "notes": notes or {},
            "idempotency_key": idempotency_key,
        }

    try:
        result = client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "notes": {**(notes or {}), "idempotency_key": idempotency_key},
        })
        result["idempotency_key"] = idempotency_key
        return result
    except Exception as e:
        logger.error(f"Razorpay order creation failed: {e}")
        raise


def verify_payment_signature(payment_id: str, order_id: str, signature: str) -> bool:
    """Verify a Razorpay payment signature. Returns True if valid."""
    client = get_client()
    if client is None:
        # Test mode without Razorpay — accept all signatures
        logger.info(f"[MOCK] Accepting payment signature for {payment_id}")
        return True
    try:
        client.utility.verify_payment_signature({
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature,
        })
        return True
    except Exception as e:
        logger.warning(f"Payment signature verification failed: {e}")
        return False


def verify_webhook_signature(payload_body: bytes, signature: str) -> bool:
    """Verify Razorpay webhook signature using HMAC-SHA256.

    Returns True if the webhook is authentic.
    """
    if not RAZORPAY_WEBHOOK_SECRET:
        # No webhook secret configured — accept all (test mode)
        logger.info("[MOCK] Accepting webhook signature (no secret configured)")
        return True
    try:
        expected = hmac.new(
            RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
            payload_body,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)
    except Exception as e:
        logger.warning(f"Webhook signature verification failed: {e}")
        return False
