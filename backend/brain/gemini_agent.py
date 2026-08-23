"""The Brain — calls Gemini to generate structured upsell/campaign proposals.

Returns structured JSON proposals. The Brain is creative and allowed to be wrong;
the Cage will clamp or reject its output downstream.
"""
import json
import os
from typing import Optional

_client = None
MODEL = "gemini-2.5-flash"


def _get_client():
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            return None
        try:
            from google import genai
            _client = genai.Client(api_key=api_key)
        except (ImportError, Exception):
            return None
    return _client


def _get_types():
    try:
        from google.genai import types
        return types
    except ImportError:
        return None


UPSELL_SYSTEM_PROMPT = """You are Marlin, an AI upsell agent for an e-commerce store.
Given a customer's cart and the product catalog, suggest ONE relevant bundle upsell.

Rules:
- Only suggest products from the catalog
- Be specific about which SKUs to bundle
- Provide a discount percentage between 5-30
- Give a clear, short reasoning in plain English

Respond ONLY with valid JSON:
{
  "discount_pct": <int>,
  "skus": ["SKU_XXX", ...],
  "reasoning": "<plain English, max 2 sentences>"
}"""

CAMPAIGN_SYSTEM_PROMPT = """You are Marlin, an AI campaign orchestrator for an e-commerce store.
Given recent order history and the product catalog, suggest ONE discount campaign.

Rules:
- Target 1-3 related products
- Provide a discount percentage between 5-25
- Campaign should run for 24-48 hours
- Give a clear, short reasoning

Respond ONLY with valid JSON:
{
  "name": "<campaign name>",
  "discount_pct": <int>,
  "target_skus": ["SKU_XXX", ...],
  "reasoning": "<plain English, max 2 sentences>"
}"""


def propose_upsell(cart: list[dict], catalog: list[dict]) -> dict:
    """Generate an upsell proposal for a given cart.

    Returns dict with keys: discount_pct, skus, reasoning.
    Falls back to a safe default if Gemini is unavailable or returns malformed output.
    """
    fallback = {"discount_pct": 0, "skus": [], "reasoning": "No upsell suggestion available."}

    gemini_client = _get_client()
    gemini_types = _get_types()
    if gemini_client is None or gemini_types is None:
        return fallback

    user_msg = f"Cart: {json.dumps(cart)}\nCatalog: {json.dumps(catalog)}"

    try:
        response = gemini_client.models.generate_content(
            model=MODEL,
            contents=user_msg,
            config=gemini_types.GenerateContentConfig(
                system_instruction=UPSELL_SYSTEM_PROMPT,
                temperature=0.7,
                max_output_tokens=300,
            ),
        )
        text = response.text.strip()
        # Strip markdown code fences if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()

        proposal = json.loads(text)
        # Validate shape
        assert "discount_pct" in proposal
        assert "skus" in proposal and isinstance(proposal["skus"], list)
        assert "reasoning" in proposal
        return proposal
    except Exception:
        return fallback


def propose_campaign(order_history: list[dict], catalog: list[dict]) -> dict:
    """Generate a campaign proposal based on order history.

    Returns dict with keys: name, discount_pct, target_skus, reasoning.
    """
    fallback = {
        "name": "No campaign",
        "discount_pct": 0,
        "target_skus": [],
        "reasoning": "No campaign suggestion available.",
    }

    gemini_client = _get_client()
    gemini_types = _get_types()
    if gemini_client is None or gemini_types is None:
        return fallback

    user_msg = f"Recent orders: {json.dumps(order_history[-20:])}\nCatalog: {json.dumps(catalog)}"

    try:
        response = gemini_client.models.generate_content(
            model=MODEL,
            contents=user_msg,
            config=gemini_types.GenerateContentConfig(
                system_instruction=CAMPAIGN_SYSTEM_PROMPT,
                temperature=0.7,
                max_output_tokens=300,
            ),
        )
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()

        proposal = json.loads(text)
        assert "name" in proposal
        assert "discount_pct" in proposal
        assert "target_skus" in proposal
        assert "reasoning" in proposal
        return proposal
    except Exception:
        return fallback
