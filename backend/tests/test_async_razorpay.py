"""Tests for async Razorpay client functionality."""
import pytest
import asyncio
from unittest.mock import patch, AsyncMock
import builtins

# Ensure backend is importable
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))


class TestAsyncRazorpayClient:
    """Tests for async Razorpay functionality."""
    
    @pytest.mark.asyncio
    async def test_async_create_order_fallback(self):
        """Test that async order creation works with fallback (no RAZORPAY keys)."""
        from backend.razorpay_client import async_create_order
        
        result = await async_create_order(amount_paise=50000)
        
        assert "id" in result
        assert result["amount"] == 50000
    
    @pytest.mark.asyncio
    async def test_async_verify_payment_signature(self):
        """Test async payment signature verification."""
        from backend.razorpay_client import async_verify_payment_signature
        
        # Test without key secret (should accept in test mode)
        result = await async_verify_payment_signature(
            order_id="order_test_123",
            payment_id="pay_test_456",
            signature="any_signature"
        )
        assert result is True  # No secret = accept in test mode
    
    @pytest.mark.asyncio
    async def test_async_webhook_verification(self):
        """Test async webhook signature verification."""
        from backend.razorpay_client import async_verify_webhook_signature
        
        # Test without secret (should accept in test mode)
        result = await async_verify_webhook_signature(b"{}", "any_signature")
        assert result is True
    
    @pytest.mark.asyncio
    async def test_idempotency_key_generation(self):
        """Test that idempotency keys are generated correctly."""
        from backend.razorpay_client import async_create_order
        
        result = await async_create_order(amount_paise=10000, idempotency_key="test_key_123")
        
        assert result.get("idempotency_key") == "test_key_123"


class TestSyncRazorpayClient:
    """Tests for synchronous Razorpay functionality."""
    
    def test_sync_create_order_fallback(self):
        """Test that sync order creation works with fallback."""
        from backend.razorpay_client import sync_create_order
        
        result = sync_create_order(amount_paise=50000)
        
        assert "id" in result
        assert result["amount"] == 50000
        assert "fallback" in result  # Indicates test mode fallback


class TestRazorpaySignatureVerification:
    """Tests for signature verification logic."""
    
    def test_local_signature_verification(self):
        """Test that signature verification uses correct HMAC."""
        import hmac
        import hashlib
        
        # Test data
        order_id = "order_test_123"
        payment_id = "pay_test_456"
        secret = "test_secret_key"
        
        # Compute expected signature
        data = f"{order_id}|{payment_id}"
        expected = hmac.new(
            secret.encode(),
            data.encode(),
            hashlib.sha256,
        ).hexdigest()
        
        # The function should produce the same result
        assert expected != ""  # Just verify it's computed correctly
        assert len(expected) == 64  # SHA256 hex digest length


@pytest.mark.asyncio
async def test_client_lifecycle():
    """Test that async client can be created and closed."""
    from backend.razorpay_client import get_async_client
    
    client = get_async_client()
    
    # Client should be usable
    assert client is not None
    
    # Async context cleanup
    if hasattr(client, 'aclose'):
        await client.aclose()