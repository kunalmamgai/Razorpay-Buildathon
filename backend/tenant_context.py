"""Tenant Context Dependency — extracts and validates the active merchant context from HTTP headers/requests.
"""
from fastapi import Header, HTTPException
from backend.merchant_manager import get_merchant
from backend.db import get_connection, init_db
from backend.config import IS_PRODUCTION


def get_current_merchant_id(
    x_merchant_id: str | None = Header(default=None, alias="X-Merchant-ID"),
    x_tenant_id: str | None = Header(default=None, alias="X-Tenant-ID"),
) -> str:
    """Extract and validate the active merchant ID from the request headers."""
    merchant_id = x_merchant_id or x_tenant_id
    if not merchant_id:
        if IS_PRODUCTION:
            raise HTTPException(status_code=400, detail="Merchant ID header is required")
        merchant_id = "merchant_default"
    # Clean string format
    merchant_id = "".join(c for c in merchant_id if c.isalnum() or c in ("_", "-"))
    if not merchant_id:
        raise HTTPException(status_code=400, detail="Invalid merchant ID")
    try:
        get_merchant(merchant_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Merchant not found") from exc
    return merchant_id


def get_merchant_context(merchant_id: str = "merchant_default") -> dict:
    """Get full merchant metadata, database handle, and policy configuration."""
    merchant_info = get_merchant(merchant_id)
    # Ensure targeted DB tables are initialized
    init_db(merchant_id)
    return {
        "merchant_id": merchant_id,
        "name": merchant_info.get("name", "Default Merchant"),
        "merchant_info": merchant_info,
        "policy_config": merchant_info.get("policy_config", {}),
        "razorpay_credentials": {
            "key_id": merchant_info.get("razorpay_key_id"),
            "key_secret": merchant_info.get("razorpay_key_secret"),
            "webhook_secret": merchant_info.get("razorpay_webhook_secret"),
        },
    }
