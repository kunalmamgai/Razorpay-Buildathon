"""Webhook signature verification for Razorpay webhooks with timing-safe HMAC & replay protection."""
import hmac
import hashlib
import time
import logging
from typing import Optional, Union

from backend.config import RAZORPAY_WEBHOOK_SECRET
from backend.logging_config import get_logger

logger = get_logger(__name__)

# Replay attack tolerance window (default 5 minutes / 300 seconds)
DEFAULT_TIMESTAMP_TOLERANCE_SECONDS = 300


def verify_webhook_signature(
    raw_body: bytes,
    signature: str,
    secret: Optional[str] = None,
    timestamp: Optional[Union[str, int]] = None,
    tolerance_seconds: int = DEFAULT_TIMESTAMP_TOLERANCE_SECONDS,
) -> bool:
    """Verify Razorpay webhook signature with timing-safe comparison and replay timestamp check.

    Args:
        raw_body: Raw webhook request body (bytes)
        signature: Signature string from x-razorpay-signature header
        secret: Webhook secret (defaults to global config or merchant secret)
        timestamp: Optional request timestamp (unix epoch seconds) from header
        tolerance_seconds: Maximum allowed timestamp skew to prevent replay attacks (default 300s)

    Returns:
        True if signature and timestamp are valid, False otherwise
    """
    if not secret:
        secret = RAZORPAY_WEBHOOK_SECRET

    if not secret:
        logger.warning("Webhook secret not configured — accepting signature in test mode")
        return True

    if not signature:
        logger.warning("No webhook signature provided in request headers")
        return False

    # 1. Replay Attack Timestamp Check (if timestamp header provided)
    if timestamp is not None:
        try:
            ts = int(timestamp)
            current_time = int(time.time())
            if abs(current_time - ts) > tolerance_seconds:
                logger.warning(
                    f"Webhook timestamp skew ({abs(current_time - ts)}s) exceeds tolerance window ({tolerance_seconds}s)"
                )
                return False
        except (ValueError, TypeError):
            logger.warning(f"Invalid webhook timestamp format: {timestamp}")

    # 2. Timing-Safe HMAC Verification
    try:
        expected_signature = hmac.new(
            secret.encode("utf-8"),
            raw_body,
            hashlib.sha256,
        ).hexdigest()

        is_valid = hmac.compare_digest(expected_signature, signature)
        if not is_valid:
            logger.warning("Webhook HMAC signature mismatch")
        return is_valid
    except Exception as e:
        logger.error(f"Webhook signature verification exception: {e}")
        return False


def verify_payment_signature(
    order_id: str,
    payment_id: str,
    signature: str,
    key_secret: Optional[str] = None,
) -> bool:
    """Verify Razorpay payment signature using timing-safe HMAC comparison."""
    from backend.config import RAZORPAY_KEY_SECRET

    if not key_secret:
        key_secret = RAZORPAY_KEY_SECRET

    if not key_secret:
        logger.warning("Razorpay key secret not configured — skipping payment signature verification")
        return True

    if not signature or not order_id or not payment_id:
        return False

    try:
        data = f"{order_id}|{payment_id}"
        expected_signature = hmac.new(
            key_secret.encode("utf-8"),
            data.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(expected_signature, signature)
    except Exception as e:
        logger.error(f"Payment signature verification error: {e}")
        return False