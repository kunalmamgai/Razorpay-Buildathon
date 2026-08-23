"""Thin wrapper around the Razorpay SDK for test-mode payments."""
import os

try:
    import razorpay
except ImportError:
    razorpay = None

KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")

_client = None


def get_client():
    global _client
    if _client is None and razorpay is not None and KEY_ID:
        _client = razorpay.Client(auth=(KEY_ID, KEY_SECRET))
    return _client


def create_order(amount_paise: int, notes: dict = None) -> dict:
    """Create a Razorpay order. Amount in paise."""
    client = get_client()
    if client is None:
        # Test mode fallback — return a mock order
        import uuid
        return {
            "id": f"order_test_{uuid.uuid4().hex[:12]}",
            "amount": amount_paise,
            "currency": "INR",
            "status": "created",
            "notes": notes or {},
        }
    return client.order.create(
        {
            "amount": amount_paise,
            "currency": "INR",
            "notes": notes or {},
        }
    )


def verify_payment(payment_id: str, order_id: str, signature: str) -> bool:
    """Verify a Razorpay payment signature."""
    client = get_client()
    if client is None:
        return True  # Test mode — always pass
    try:
        client.utility.verify_payment_signature(
            {"razorpay_order_id": order_id, "razorpay_payment_id": payment_id, "razorpay_signature": signature}
        )
        return True
    except Exception:
        return False
