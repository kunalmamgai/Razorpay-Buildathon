"""Merchants API router — list and inspect active merchant tenant policy configurations."""
from fastapi import APIRouter, Depends, HTTPException
from backend.merchant_manager import list_merchants, get_merchant
from backend.tenant_context import get_current_merchant_id

router = APIRouter(prefix="/api/merchants", tags=["merchants"])


@router.get("")
def get_all_merchants():
    """List all registered merchant tenants with their custom policy configs."""
    merchants = list_merchants()
    return {
        "merchants": merchants,
        "total": len(merchants),
    }


@router.get("/current")
def get_current_merchant_info(merchant_id: str = Depends(get_current_merchant_id)):
    """Get active merchant tenant details and policy limits based on X-Merchant-ID header."""
    try:
        info = get_merchant(merchant_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Merchant not found") from exc
    info.pop("razorpay_key_secret", None)
    info.pop("razorpay_webhook_secret", None)
    info["razorpay_key_secret_masked"] = "***" if info.get("razorpay_key_id") else ""
    return {
        "merchant": info,
    }


@router.get("/{merchant_id}")
def get_merchant_by_id(merchant_id: str):
    """Get specific merchant configuration by ID."""
    try:
        info = get_merchant(merchant_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Merchant not found") from exc
    info.pop("razorpay_key_secret", None)
    info.pop("razorpay_webhook_secret", None)
    info["razorpay_key_secret_masked"] = "***" if info.get("razorpay_key_id") else ""
    return {
        "merchant": info,
    }
