"""Pydantic schemas for request/response validation."""
from pydantic import BaseModel
from typing import Optional


class CartItem(BaseModel):
    sku: str
    quantity: int = 1


class CheckoutRequest(BaseModel):
    cart: list[CartItem]


class UpsellProposal(BaseModel):
    discount_pct: int
    skus: list[str]
    reasoning: str


class CampaignCreate(BaseModel):
    name: str
    discount_pct: int
    target_skus: list[str]
    duration_hours: int = 48


class LedgerEntry(BaseModel):
    id: int
    timestamp: str
    actor: str
    trigger: str
    proposal_json: Optional[str] = None
    reasoning: Optional[str] = None
    policy_passed: Optional[bool] = None
    policy_violations: Optional[str] = None
    final_action_json: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    outcome: Optional[str] = None


class WebhookPayload(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    status: str
    amount: int
