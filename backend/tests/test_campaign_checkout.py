"""Campaign-at-checkout tests — active campaigns must apply as a pre-approved
discount layer at checkout, stack under the Brain's upsell, and keep the
storefront deal price, cart subtotal, and payable amount consistent.

Uses the real seed pipeline (TestClient lifespan seeds products + demo
campaigns into the isolated temp DB), so campaign state comes from
backend/seed_data.py:
    merchant_default active campaigns: SKU_101 @ 10%, SKU_102 @ 15%
    merchant_default pending campaign:  SKU_104 @ 20%
"""
from unittest.mock import patch
import pytest


def make_proposal(discount_pct: int, skus: list[str], reasoning: str = "Test reasoning"):
    return {
        "action": "upsell",
        "discount_pct": discount_pct,
        "skus": skus,
        "reasoning": reasoning,
        "confidence": 0.8,
        "expected_benefit": "Test benefit",
    }


def no_offer_proposal():
    """Deterministic stand-in for the Brain when no Gemini key is configured."""
    return {
        "action": "no_offer",
        "discount_pct": 0,
        "skus": [],
        "reasoning": "",
        "confidence": 0.0,
        "expected_benefit": "",
    }


def propose_cart(client, cart: list[dict]) -> dict:
    resp = client.post("/api/checkout/propose", json={"cart": cart})
    assert resp.status_code == 200, resp.text
    return resp.json()


class TestCampaignAtCheckout:
    def test_campaign_discount_applied_at_checkout(self, client):
        """Live 10% campaign on SKU_101 applies even when the Brain returns no_offer."""
        with patch("backend.services.checkout_service.propose_upsell", return_value=no_offer_proposal()):
            data = propose_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        assert data["original_amount_paise"] == 299900
        assert data["final_amount_paise"] == 269900       # whole-rupee deal price
        assert data["discount_amount_paise"] == 30000
        assert data["discount_pct"] == 10
        assert data["policy_result"]["decision"] == "approved"  # 10% <= 15% threshold

        applied = data["campaigns_applied"]
        assert applied and applied[0]["sku"] == "SKU_101"
        assert applied[0]["discount_pct"] == 10
        assert applied[0]["campaign_id"] == "camp_demo_active_01"

    def test_campaign_discount_per_sku_in_mixed_cart(self, client):
        """SKU_101 @ 10% and SKU_102 @ 15% apply per-line, not blended over the cart."""
        with patch("backend.services.checkout_service.propose_upsell", return_value=no_offer_proposal()):
            data = propose_cart(client, [
            {"sku": "SKU_101", "quantity": 1},
            {"sku": "SKU_102", "quantity": 2},
        ])

        assert data["original_amount_paise"] == 299900 + 49900 * 2
        # 2699.10 -> 2699, 424.15 -> 424 (per line, whole rupee)
        assert data["final_amount_paise"] == 269900 + 42400 * 2
        assert len(data["campaigns_applied"]) == 2

    def test_campaign_plus_upsell_stack(self, client):
        """Brain upsell stacks on top of the campaign baseline; amounts are server-computed."""
        with patch(
            "backend.services.checkout_service.propose_upsell",
            return_value=make_proposal(10, ["SKU_101"]),
        ):
            data = propose_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        # 2999 - 10% campaign = 2699; then 10% upsell on the remaining 2699 = 2429
        assert data["final_amount_paise"] == 242900
        assert data["discount_amount_paise"] == 57000
        assert data["policy_result"]["decision"] == "approved"  # upsell portion 10% <= 15%

    def test_campaign_upsell_above_threshold_gates(self, client):
        """Only the AI upsell portion triggers the human gate; the campaign layer stays pre-approved."""
        with patch(
            "backend.services.checkout_service.propose_upsell",
            return_value=make_proposal(16, ["SKU_101"]),
        ):
            data = propose_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        assert data["policy_result"]["decision"] == "awaiting_approval"
        assert data["policy_result"]["needs_human_approval"] is True
        # 2699 after campaign; 16% upsell -> 432.0... -> 2267
        assert data["final_amount_paise"] == 226700

    def test_pending_campaign_not_applied(self, client):
        """A pending (not-yet-approved) campaign must NOT discount at checkout."""
        with patch("backend.services.checkout_service.propose_upsell", return_value=no_offer_proposal()):
            data = propose_cart(client, [{"sku": "SKU_104", "quantity": 1}])

        assert data["campaigns_applied"] == []
        assert data["discount_pct"] == 0
        assert data["final_amount_paise"] == data["original_amount_paise"] == 149900

    def test_approved_campaign_applies_without_regate(self, client):
        """After the merchant approves the SKU_104 campaign, it discounts at checkout
        with no second approval gate (it was gated at activation)."""
        resp = client.post("/api/campaigns/camp_demo_pending_02/approve")
        assert resp.status_code == 200, resp.text

        with patch("backend.services.checkout_service.propose_upsell", return_value=no_offer_proposal()):
            data = propose_cart(client, [{"sku": "SKU_104", "quantity": 1}])

        assert data["campaigns_applied"][0]["discount_pct"] == 20
        assert data["final_amount_paise"] == 119900       # 1499 - 20% = 1199
        assert data["discount_amount_paise"] == 30000
        assert data["policy_result"]["decision"] == "approved"  # no re-gate
