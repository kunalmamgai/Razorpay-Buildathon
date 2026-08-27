"""Async Razorpay client wrapper for non-blocking API calls."""
import hashlib
import hmac
import json
import logging
import uuid
from typing import Optional, Dict, Any

import httpx

from backend.config import (
    RAZORPAY_KEY_ID, 
    RAZORPAY_KEY_SECRET, 
    RAZORPAY_WEBHOOK_SECRET,
    RAZORPAY_TIMEOUT_SECONDS,
    RAZORPAY_MAX_RETRIES,
    RAZORPAY_CURRENCY
)

logger = logging.getLogger(__name__)

_client: Optional[httpx.AsyncClient] = None

# Synchronous client for cases where async is not available
_sync_client = None


def get_async_client() -> httpx.AsyncClient:
    """Get or create an async Razorpay client instance."""
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            timeout=RAZORPAY_TIMEOUT_SECONDS,
            limits=httpx.Limits(
                max_connections=20,
                max_keepalive_connections=5,
            ),
        )
    return _client


def get_sync_client():
    """Get or create a synchronous Razorpay client instance."""
    global _sync_client
    if _sync_client is None:
        import razorpay
        _sync_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    return _sync_client


async def async_create_order(
    amount_paise: int,
    idempotency_key: str | None = None,
    notes: dict | None = None,
) -> dict:
    """Async create Razorpay order.
    
    Args:
        amount_paise: Amount in paise (integer)
        idempotency_key: Idempotency key for the order
        notes: Additional notes for the order
        
    Returns:
        Dict with order details
    """
    if idempotency_key is None:
        idempotency_key = f"idem_{uuid.uuid4().hex[:16]}"
    
    # If no RAZORPAY keys configured, use mock order for test mode
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        order_id = f"order_test_{uuid.uuid4().hex[:12]}"
        logger.info(f"[MOCK] Created Razorpay order {order_id} for {amount_paise} paise")
        return {
            "id": order_id,
            "amount": amount_paise,
            "currency": "INR",
            "status": "created",
            "notes": notes or {},
            "idempotency_key": idempotency_key,
            "fallback": True,
        }
    
    # Try async client
    client = get_async_client()
    
    try:
        result = await client.post(
            "https://api.razorpay.com/v1/orders",
            json={
                "amount": amount_paise,
                "currency": RAZORPAY_CURRENCY or "INR",
                "notes": {**(notes or {}), "idempotency_key": idempotency_key},
            },
            auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET),
        )
        result.raise_for_status()
        return result.json()
    except httpx.HTTPStatusError as e:
        logger.error(f"Async order creation failed: {e}")
        # Fallback to mock order
        order_id = f"order_test_{uuid.uuid4().hex[:12]}"
        return {
            "id": order_id,
            "amount": amount_paise,
            "currency": "INR",
            "status": "created",
            "notes": notes or {},
            "idempotency_key": idempotency_key,
            "fallback": True,
        }
    except Exception as e:
        logger.error(f"Async order creation error: {e}")
        raise


async def async_verify_payment_signature(
    order_id: str,
    payment_id: str,
    signature: str,
) -> bool:
    """Async verify Razorpay payment signature.
    
    Args:
        order_id: Razorpay order ID
        payment_id: Razorpay payment ID
        signature: Payment signature from frontend
        
    Returns:
        True if signature is valid, False otherwise
    """
    # If no RAZORPAY keys configured, accept in test mode
    if not RAZORPAY_KEY_SECRET:
        logger.warning("Razorpay key secret not configured — skipping signature verification")
        return True
    
    client = get_async_client()
    
    data = f"{order_id}|{payment_id}"
    
    try:
        # Compute HMAC locally instead of making API call
        expected_signature = hmac.new(
            RAZORPAY_KEY_SECRET.encode(),
            data.encode(),
            hashlib.sha256,
        ).hexdigest()
        
        return hmac.compare_digest(expected_signature, signature)
    except Exception as e:
        logger.error(f"Async signature verification error: {e}")
        return False


async def async_verify_webhook_signature(
    raw_body: bytes,
    signature: str,
) -> bool:
    """Async verify Razorpay webhook signature.
    
    Args:
        raw_body: Raw webhook request body
        signature: Signature from x-razorpay-signature header
        
    Returns:
        True if signature is valid, False otherwise
    """
    # If no secret configured, accept in test mode
    if not RAZORPAY_WEBHOOK_SECRET:
        logger.info("[MOCK] Accepting webhook signature (no secret configured)")
        return True
    
    client = get_async_client()
    
    try:
        expected_signature = hmac.new(
            RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
            raw_body,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected_signature, signature)
    except Exception as e:
        logger.error(f"Async webhook verification error: {e}")
        return False


def sync_create_order(
    amount_paise: int,
    idempotency_key: str | None = None,
    notes: dict | None = None,
) -> dict:
    """Synchronous wrapper for create order (fallback for sync code path)."""
    if idempotency_key is None:
        idempotency_key = f"idem_{uuid.uuid4().hex[:16]}"
    
    # If no RAZORPAY keys configured, use mock order
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        order_id = f"order_test_{uuid.uuid4().hex[:12]}"
        logger.info(f"[MOCK] Created Razorpay order {order_id} for {amount_paise} paise")
        return {
            "id": order_id,
            "amount": amount_paise,
            "currency": RAZORPAY_CURRENCY or "INR",
            "status": "created",
            "notes": notes or {},
            "idempotency_key": idempotency_key,
            "fallback": True,
        }
    
    try:
        client = get_sync_client()
        result = client.order.create({
            "amount": amount_paise,
            "currency": RAZORPAY_CURRENCY or "INR",
            "notes": {**(notes or {}), "idempotency_key": idempotency_key},
        })
        result["idempotency_key"] = idempotency_key
        return result
    except Exception as e:
        logger.error(f"Sync order creation failed: {e}")
        # Fallback mock order
        order_id = f"order_test_{uuid.uuid4().hex[:12]}"
        return {
            "id": order_id,
            "amount": amount_paise,
            "currency": RAZORPAY_CURRENCY or "INR",
            "status": "created",
            "notes": notes or {},
            "idempotency_key": idempotency_key,
            "fallback": True,
        }


def sync_verify_payment_signature(
    payment_id: str,
    order_id: str,
    signature: str,
) -> bool:
    """Synchronous verify Razorpay payment signature."""
    # If no RAZORPAY keys configured, use local verification or accept in test mode
    if not RAZORPAY_KEY_SECRET:
        logger.warning("Razorpay key secret not configured — skipping signature verification")
        # In test mode, accept all signatures (matching original behavior)
        return True
    
    try:
        # Try SDK verification first
        client = get_sync_client()
        client.utility.verify_payment_signature({
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature,
        })
        return True
    except Exception as e:
        logger.warning(f"Sync signature verification failed: {e}")
        return False