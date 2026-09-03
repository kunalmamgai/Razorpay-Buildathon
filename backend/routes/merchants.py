"""Merchants API router — list and inspect active merchant tenant policy configurations."""
from fastapi import APIRouter, Depends
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
    info = get_merchant(merchant_id)
    # Mask key secret
    info["razorpay_key_secret_masked"] = "***" if info.get("razorpay_key_secret") else ""
    return {
        "merchant": info,
    }


@router.get("/{merchant_id}")
def get_merchant_by_id(merchant_id: str):
    """Get specific merchant configuration by ID."""
    info = get_merchant(merchant_id)
    info["razorpay_key_secret_masked"] = "***" if info.get("razorpay_key_secret") else ""
    return {
        "merchant": info,
    }
