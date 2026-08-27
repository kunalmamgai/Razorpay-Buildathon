"""Webhook signature verification for Razorpay webhooks."""
import hmac
import hashlib
from typing import Optional

from backend.config import RAZORPAY_WEBHOOK_SECRET
from backend.logging_config import get_logger

logger = get_logger(__name__)


def verify_webhook_signature(
    raw_body: bytes,
    signature: str,
    secret: Optional[str] = None,
) -> bool:
    """Verify Razorpay webhook signature.
    
    Args:
        raw_body: Raw webhook request body
        signature: Signature from x-razorpay-signature header
        secret: Webhook secret (defaults to config)
        
    Returns:
        True if signature is valid, False otherwise
    """
    if not secret:
        secret = RAZORPAY_WEBHOOK_SECRET
    
    if not secret:
        # No secret configured — accept in test mode
        logger.warning("Webhook secret not configured — skipping signature verification")
        return True
    
    if not signature:
        logger.warning("No webhook signature provided")
        return False
    
    try:
        expected_signature = hmac.new(
            secret.encode(),
            raw_body,
            hashlib.sha256,
        ).hexdigest()
        
        return hmac.compare_digest(expected_signature, signature)
    except Exception as e:
        logger.error(f"Webhook signature verification error: {e}")
        return False


def verify_payment_signature(
    order_id: str,
    payment_id: str,
    signature: str,
    key_secret: Optional[str] = None,
) -> bool:
    """Verify Razorpay payment signature.
    
    Args:
        order_id: Razorpay order ID
        payment_id: Razorpay payment ID
        signature: Signature from Razorpay
        key_secret: Razorpay key secret (defaults to config)
        
    Returns:
        True if signature is valid, False otherwise
    """
    from backend.config import RAZORPAY_KEY_SECRET
    
    if not key_secret:
        key_secret = RAZORPAY_KEY_SECRET
    
    if not key_secret:
        logger.warning("Razorpay key secret not configured — skipping payment signature verification")
        return False
    
    try:
        data = f"{order_id}|{payment_id}"
        expected_signature = hmac.new(
            key_secret.encode(),
            data.encode(),
            hashlib.sha256,
        ).hexdigest()
        
        return hmac.compare_digest(expected_signature, signature)
    except Exception as e:
        logger.error(f"Payment signature verification error: {e}")
        return False