"""The Brain — calls Gemini to generate structured upsell and campaign proposals.

Gemini is untrusted and advisory only. It must never:
- Create Razorpay orders
- Call payment APIs
- Calculate the authoritative payable amount
- Approve its own proposal
- Invent products, prices, analytics, or customer behavior

The Brain returns structured JSON. If Gemini is unavailable or returns
malformed output, we fall back to safe defaults (no_offer / no_campaign).
"""
import json
import os
import logging
from typing import Optional

from backend.config import GEMINI_API_KEY, GEMINI_MODEL

logger = logging.getLogger(__name__)

_client = None


def _get_client():
    """Lazy-initialize the Gemini client. Returns None if unavailable."""
    global _client
    if _client is not None:
        return _client
    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set — Brain disabled, returning fallback proposals.")
        return None
    try:
        from google import genai
        _client = genai.Client(api_key=GEMINI_API_KEY)
        return _client
    except (ImportError, Exception) as e:
        logger.error(f"Failed to initialize Gemini client: {e}")
        return None


def _get_types():
    try:
        from google.genai import types
        return types
    except ImportError:
        return None


def _strip_markdown_fences(text: str) -> str:
    """Strip markdown code fences from Gemini output."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()
    return text


# ═══════════════════════════════════════════════════════════════════════
# UPSELL BRAIN
# ═══════════════════════════════════════════════════════════════════════

UPSELL_SYSTEM_PROMPT = """You are an advisory upsell recommendation agent for a merchant revenue-growth platform.

Your job is to propose at most ONE relevant bundle using only the supplied cart, catalog, and customer signals.

CRITICAL CONSTRAINTS — you are NOT authorized to:
- Create orders or process payments
- Approve discounts or calculate final payable amounts
- Override merchant policy
- Invent products, prices, analytics, or customer behavior
- Claim a proposal has already been executed

The policy engine will evaluate your output downstream. It may clamp or reject your proposal.

Return valid JSON ONLY in this exact schema:
{
  "action": "upsell" or "no_offer",
  "skus": ["SKU_ID"],
  "discount_pct": integer (5-30 range recommended),
  "reasoning": "One or two evidence-based sentences explaining why.",
  "confidence": number between 0 and 1,
  "expected_benefit": "Short business explanation of expected outcome."
}

Rules:
- Only use product IDs from the provided catalog
- Provide a discount percentage between 5-30
- If no relevant offer exists, return {"action": "no_offer", ...}
- Be specific about which SKUs to bundle and why"""


def propose_upsell(cart: list[dict], catalog: list[dict], customer_signals: dict | None = None) -> dict:
    """Generate an upsell proposal for a given cart.

    Returns a dict matching the UpsellProposal schema.
    Falls back to no_offer if Gemini is unavailable or returns malformed output.
    """
    from backend.models import UpsellProposal

    fallback = UpsellProposal(action="no_offer").model_dump()

    gemini_client = _get_client()
    gemini_types = _get_types()
    if gemini_client is None or gemini_types is None:
        return fallback

    user_parts = [
        f"Cart: {json.dumps(cart, default=str)}",
        f"Catalog: {json.dumps(catalog, default=str)}",
    ]
    if customer_signals:
        user_parts.append(f"Customer signals: {json.dumps(customer_signals, default=str)}")
    user_parts.append("Remember: you are advisory only. The policy engine will validate your output.")
    user_msg = "\n".join(user_parts)

    try:
        response = gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=user_msg,
            config=gemini_types.GenerateContentConfig(
                system_instruction=UPSELL_SYSTEM_PROMPT,
                temperature=0.7,
                max_output_tokens=400,
            ),
        )
        text = _strip_markdown_fences(response.text)
        raw = json.loads(text)

        # Validate with Pydantic
        proposal = UpsellProposal(**raw)
        return proposal.model_dump()

    except json.JSONDecodeError as e:
        logger.warning(f"Gemini returned malformed JSON: {e}")
        return fallback
    except Exception as e:
        logger.warning(f"Gemini upsell proposal failed: {e}")
        return fallback


# ═══════════════════════════════════════════════════════════════════════
# CAMPAIGN BRAIN
# ═══════════════════════════════════════════════════════════════════════

CAMPAIGN_SYSTEM_PROMPT = """You are an advisory campaign orchestrator for a merchant revenue-growth platform.

Given recent order history and the product catalog, suggest ONE promotional campaign or return no_campaign.

CRITICAL CONSTRAINTS — you are NOT authorized to:
- Activate campaigns directly
- Create payment orders
- Invent metrics or analytics
- Override merchant policy

The policy engine and merchant approval workflow control activation.

Return valid JSON ONLY in this exact schema:
{
  "action": "create_campaign" or "no_campaign",
  "name": "Short campaign name",
  "target_skus": ["SKU_ID"],
  "discount_pct": integer (5-25 recommended),
  "duration_hours": integer (1-48 recommended),
  "reasoning": "Two or three evidence-based sentences.",
  "objective": "increase_aov | reduce_abandonment | clear_inventory | reactivate_customers",
  "confidence": number between 0 and 1,
  "success_metric": "Specific measurable metric."
}

Rules:
- Target 1-3 related products
- Use only product IDs from the catalog
- Duration must not exceed 48 hours
- If no campaign opportunity exists, return {"action": "no_campaign", ...}
- Base recommendations on actual patterns in the order history"""


def propose_campaign(order_history: list[dict], catalog: list[dict],
                     current_campaigns: list[dict] | None = None) -> dict:
    """Generate a campaign proposal based on order history.

    Returns a dict matching the CampaignProposal schema.
    Falls back to no_campaign if Gemini is unavailable or returns malformed output.
    """
    from backend.models import CampaignProposal

    fallback = CampaignProposal(action="no_campaign").model_dump()

    gemini_client = _get_client()
    gemini_types = _get_types()
    if gemini_client is None or gemini_types is None:
        return fallback

    # Limit order history to recent 30 entries
    recent = order_history[-30:] if len(order_history) > 30 else order_history

    user_parts = [
        f"Recent order history ({len(recent)} orders): {json.dumps(recent, default=str)}",
        f"Product catalog: {json.dumps(catalog, default=str)}",
    ]
    if current_campaigns:
        user_parts.append(f"Current active campaigns: {json.dumps(current_campaigns, default=str)}")
    user_parts.append("Remember: you are advisory only. The policy engine and merchant approval workflow control activation.")
    user_msg = "\n".join(user_parts)

    try:
        response = gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=user_msg,
            config=gemini_types.GenerateContentConfig(
                system_instruction=CAMPAIGN_SYSTEM_PROMPT,
                temperature=0.7,
                max_output_tokens=500,
            ),
        )
        text = _strip_markdown_fences(response.text)
        raw = json.loads(text)

        proposal = CampaignProposal(**raw)
        return proposal.model_dump()

    except json.JSONDecodeError as e:
        logger.warning(f"Gemini returned malformed JSON for campaign: {e}")
        return fallback
    except Exception as e:
        logger.warning(f"Gemini campaign proposal failed: {e}")
        return fallback
