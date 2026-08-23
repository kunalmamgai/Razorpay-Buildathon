"""Pydantic models — request/response validation for every external boundary.

Gemini responses are validated here too. If Gemini returns malformed JSON,
we fall back to safe defaults. The Brain is untrusted.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════════════
# Request Models — what the frontend sends
# ═══════════════════════════════════════════════════════════════════════

class CartItem(BaseModel):
    sku: str
    quantity: int = Field(default=1, ge=1)


class CheckoutProposeRequest(BaseModel):
    """Step 1: Frontend sends cart, Brain proposes, Cage evaluates."""
    cart: list[CartItem]
    idempotency_key: Optional[str] = None


class CheckoutApproveRequest(BaseModel):
    """Step 2: Merchant approves a pending proposal."""
    ledger_id: int


class CheckoutCreateOrderRequest(BaseModel):
    """Step 3: Create Razorpay order after approval (or auto-approval)."""
    ledger_id: int
    idempotency_key: Optional[str] = None


class PaymentVerifyRequest(BaseModel):
    """Frontend submits Razorpay payment verification."""
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class WebhookPayload(BaseModel):
    """Razorpay webhook raw payload (we extract what we need)."""
    event: str
    payload: dict


class CampaignCreateRequest(BaseModel):
    """Manual campaign creation."""
    name: str
    discount_pct: int
    target_skus: list[str]
    duration_hours: int = 48


class PaymentSimulateRequest(BaseModel):
    """Simulate a payment failure for demo."""
    order_id: str


# ═══════════════════════════════════════════════════════════════════════
# Gemini Response Models — validated before execution
# ═══════════════════════════════════════════════════════════════════════

class UpsellProposal(BaseModel):
    """What the Brain returns for upsell suggestions."""
    action: Literal["upsell", "no_offer"] = "upsell"
    skus: list[str] = Field(default_factory=list)
    discount_pct: int = Field(default=0, ge=0, le=100)
    reasoning: str = ""
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    expected_benefit: str = ""


class CampaignProposal(BaseModel):
    """What the Brain returns for campaign suggestions."""
    action: Literal["create_campaign", "no_campaign"] = "no_campaign"
    name: str = ""
    target_skus: list[str] = Field(default_factory=list)
    discount_pct: int = Field(default=0, ge=0, le=100)
    duration_hours: int = Field(default=48, ge=1, le=168)
    reasoning: str = ""
    objective: str = ""
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    success_metric: str = ""


# ═══════════════════════════════════════════════════════════════════════
# Policy Engine Result — the Cage's output
# ═══════════════════════════════════════════════════════════════════════

class PolicyResult(BaseModel):
    """Deterministic output from the Cage."""
    decision: Literal["approved", "clamped", "rejected", "awaiting_approval"]
    violations: list[str] = Field(default_factory=list)
    final_action: dict = Field(default_factory=dict)
    needs_human_approval: bool = False
    policy_version: str = "policy-v1"


# ═══════════════════════════════════════════════════════════════════════
# Amount Calculation Result
# ═══════════════════════════════════════════════════════════════════════

class AmountResult(BaseModel):
    """Server-calculated amounts — never trust the frontend."""
    original_amount_paise: int
    final_amount_paise: int
    discount_amount_paise: int
    discount_pct: int


# ═══════════════════════════════════════════════════════════════════════
# Ledger Entry Read Model
# ═══════════════════════════════════════════════════════════════════════

class LedgerEntryResponse(BaseModel):
    """What the dashboard receives."""
    id: int
    correlation_id: str
    event_type: str
    timestamp: str
    actor: str
    trigger: str
    proposal_json: Optional[str] = None
    reasoning: Optional[str] = None
    policy_decision: Optional[str] = None
    policy_violations_json: Optional[str] = None
    final_action_json: Optional[str] = None
    policy_version: Optional[str] = None
    approval_status: Optional[str] = None
    approval_actor: Optional[str] = None
    approval_timestamp: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    idempotency_key: Optional[str] = None
    outcome: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════
# Dashboard Response Models
# ═══════════════════════════════════════════════════════════════════════

class LedgerStats(BaseModel):
    total_proposals: int = 0
    approved: int = 0
    clamped: int = 0
    rejected: int = 0
    awaiting_approval: int = 0
    paid: int = 0
    failed: int = 0
    rejection_rate: float = 0.0
