"""Comprehensive unit tests for the Cage — deterministic policy engine.

Tests cover ALL scenarios from the spec:
- evaluate_upsell_proposal: malformed, negative discount, >100%, >20% clamp,
  SKU validation, empty SKUs, approval threshold, catalog validation
- evaluate_campaign_proposal: malformed, rejection (not clamping) for >25%,
  duration >48h, SKU validation, approval threshold
- calculate_final_amount: server-side amount calculation
"""
import pytest
from backend.cage.policy_engine import (
    evaluate_upsell_proposal,
    evaluate_campaign_proposal,
    calculate_final_amount,
)
from backend.config import (
    MAX_DISCOUNT_PCT,
    AUTO_APPROVE_THRESHOLD_PCT,
    DISCOUNTABLE_SKUS,
    MAX_CAMPAIGN_DURATION_HOURS,
    MAX_CAMPAIGN_DISCOUNT_PCT,
)

# Sample catalog for tests
CATALOG = [
    {"id": "SKU_101", "name": "Earbuds", "price": 299900, "category": "Electronics", "discountable": 1},
    {"id": "SKU_102", "name": "Cable", "price": 49900, "category": "Accessories", "discountable": 1},
    {"id": "SKU_103", "name": "Phone Case", "price": 99900, "category": "Accessories", "discountable": 1},
    {"id": "SKU_104", "name": "Power Bank", "price": 149900, "category": "Electronics", "discountable": 1},
    {"id": "SKU_105", "name": "Speaker", "price": 199900, "category": "Electronics", "discountable": 1},
    {"id": "SKU_106", "name": "Wallet", "price": 129900, "category": "Fashion", "discountable": 1},
]


# ═══════════════════════════════════════════════════════════════════════
# 1. VALID UPSSELL PROPOSAL
# ═══════════════════════════════════════════════════════════════════════

class TestValidUpsell:
    def test_clean_proposal_within_limits(self):
        result = evaluate_upsell_proposal({
            "action": "upsell",
            "discount_pct": 10,
            "skus": ["SKU_101", "SKU_102"],
            "reasoning": "Customers who bought earbuds often add cables.",
        }, CATALOG)
        assert result["decision"] == "approved"
        assert result["violations"] == []
        assert result["final_action"]["discount_pct"] == 10
        assert result["final_action"]["skus"] == ["SKU_101", "SKU_102"]
        assert result["needs_human_approval"] is False
        assert result["policy_version"] == "policy-v1"

    def test_single_valid_sku(self):
        result = evaluate_upsell_proposal({
            "action": "upsell", "discount_pct": 5, "skus": ["SKU_103"],
            "reasoning": "Phone case pairs well.",
        }, CATALOG)
        assert result["decision"] == "approved"

    def test_zero_discount_no_offer(self):
        result = evaluate_upsell_proposal({
            "action": "no_offer", "discount_pct": 0, "skus": [],
            "reasoning": "No relevant offer.",
        }, CATALOG)
        assert result["decision"] == "approved"
        assert result["final_action"]["discount_pct"] == 0

    def test_exactly_at_max_discount_needs_approval(self):
        """20% is at max but above 15% threshold — needs approval."""
        result = evaluate_upsell_proposal({
            "action": "upsell", "discount_pct": MAX_DISCOUNT_PCT, "skus": ["SKU_101"],
            "reasoning": "Max allowed.",
        }, CATALOG)
        assert result["decision"] == "awaiting_approval"
        assert result["final_action"]["discount_pct"] == MAX_DISCOUNT_PCT
        assert result["needs_human_approval"] is True


# ═══════════════════════════════════════════════════════════════════════
# 2. DISCOUNT ABOVE 20% BEING CLAMPED
# ═══════════════════════════════════════════════════════════════════════

class TestDiscountClamping:
    def test_25_pct_clamped_to_20(self):
        result = evaluate_upsell_proposal({
            "action": "upsell", "discount_pct": 25, "skus": ["SKU_101"],
            "reasoning": "Aggressive upsell.",
        }, CATALOG)
        assert result["decision"] == "awaiting_approval"  # 20% > 15% threshold
        assert result["final_action"]["discount_pct"] == MAX_DISCOUNT_PCT
        assert "exceeds maximum" in result["violations"][0]

    def test_50_pct_clamped_to_20(self):
        result = evaluate_upsell_proposal({
            "action": "upsell", "discount_pct": 50, "skus": ["SKU_102"],
            "reasoning": "Way too generous.",
        }, CATALOG)
        assert result["decision"] == "awaiting_approval"
        assert result["final_action"]["discount_pct"] == MAX_DISCOUNT_PCT

    def test_21_pct_clamped(self):
        result = evaluate_upsell_proposal({
            "action": "upsell", "discount_pct": 21, "skus": ["SKU_101"],
            "reasoning": "Just over.",
        }, CATALOG)
        assert result["decision"] == "awaiting_approval"
        assert result["final_action"]["discount_pct"] == MAX_DISCOUNT_PCT


# ═══════════════════════════════════════════════════════════════════════
# 3. CLAMPED PROPOSAL REQUIRING APPROVAL ABOVE 15%
# ═══════════════════════════════════════════════════════════════════════

class TestApprovalThreshold:
    def test_16_pct_needs_approval(self):
        result = evaluate_upsell_proposal({
            "action": "upsell", "discount_pct": 16, "skus": ["SKU_101"],
            "reasoning": "Above threshold.",
        }, CATALOG)
        assert result["decision"] == "awaiting_approval"
        assert result["needs_human_approval"] is True

    def test_15_pct_at_threshold_no_approval(self):
        result = evaluate_upsell_proposal({
            "action": "upsell", "discount_pct": AUTO_APPROVE_THRESHOLD_PCT, "skus": ["SKU_101"],
            "reasoning": "At the line.",
        }, CATALOG)
        assert result["decision"] == "approved"
        assert result["needs_human_approval"] is False

    def test_10_pct_below_threshold(self):
        result = evaluate_upsell_proposal({
            "action": "upsell", "discount_pct": 10, "skus": ["SKU_101"],
            "reasoning": "Safe.",
        }, CATALOG)
        assert result["decision"] == "approved"
        assert result["needs_human_approval"] is False


# ═══════════════════════════════════════════════════════════════════════
# 4. REJECTED NON-DISCOUNTABLE SKU PROPOSAL
# ═══════════════════════════════════════════════════════════════════════

class TestRejectedSKU:
    def test_all_invalid_skus_rejected(self):
        result = evaluate_upsell_proposal({
            "action": "upsell", "discount_pct": 15, "skus": ["FAKE_SKU"],
            "reasoning": "Bad recommendation.",
        }, CATALOG)
        assert result["decision"] == "rejected"
        assert result["final_action"] == {}

    def test_unknown_sku_with_catalog(self):
        result = evaluate_upsell_proposal({
            "action": "upsell", "discount_pct": 10, "skus": ["SKU_101", "NONEXISTENT"],
            "reasoning": "Mix.",
        }, CATALOG)
        assert result["decision"] == "clamped"
        assert result["final_action"]["skus"] == ["SKU_101"]
        assert "unknown SKU" in result["violations"][0]

    def test_mixed_valid_invalid_filters_out(self):
        result = evaluate_upsell_proposal({
            "action": "upsell", "discount_pct": 10,
            "skus": ["SKU_101", "BAD_A", "BAD_B"],
            "reasoning": "Mostly bad.",
        }, CATALOG)
        assert result["decision"] == "clamped"
        assert result["final_action"]["skus"] == ["SKU_101"]


# ═══════════════════════════════════════════════════════════════════════
# 5. REJECTED EMPTY SKU PROPOSAL
# ═══════════════════════════════════════════════════════════════════════

class TestEmptySKU:
    def test_empty_skus_with_discount_rejected(self):
        result = evaluate_upsell_proposal({
            "action": "upsell", "discount_pct": 10, "skus": [],
            "reasoning": "Discount but no SKUs.",
        }, CATALOG)
        assert result["decision"] == "rejected"
        assert "no discountable SKUs" in result["violations"][0]

    def test_empty_skus_no_discount_approved(self):
        result = evaluate_upsell_proposal({
            "action": "upsell", "discount_pct": 0, "skus": [],
            "reasoning": "Nothing to offer.",
        }, CATALOG)
        assert result["decision"] == "approved"
        assert result["final_action"]["discount_pct"] == 0


# ═══════════════════════════════════════════════════════════════════════
# 6. NEGATIVE DISCOUNT
# ═══════════════════════════════════════════════════════════════════════

class TestNegativeDiscount:
    def test_negative_discount_rejected(self):
        result = evaluate_upsell_proposal({
            "action": "upsell", "discount_pct": -5, "skus": ["SKU_101"],
            "reasoning": "Surcharge?",
        }, CATALOG)
        assert result["decision"] == "rejected"
        assert "negative discount" in result["violations"][0]


# ═══════════════════════════════════════════════════════════════════════
# 7. DISCOUNT ABOVE 100%
# ═══════════════════════════════════════════════════════════════════════

class TestDiscountAbove100:
    def test_150_pct_rejected(self):
        result = evaluate_upsell_proposal({
            "action": "upsell", "discount_pct": 150, "skus": ["SKU_101"],
            "reasoning": "Impossible.",
        }, CATALOG)
        assert result["decision"] == "rejected"
        assert "exceeds 100%" in result["violations"][0]

    def test_101_pct_rejected(self):
        result = evaluate_upsell_proposal({
            "action": "upsell", "discount_pct": 101, "skus": ["SKU_101"],
            "reasoning": "Just over.",
        }, CATALOG)
        assert result["decision"] == "rejected"


# ═══════════════════════════════════════════════════════════════════════
# 8. UNKNOWN SKU
# ═══════════════════════════════════════════════════════════════════════

class TestUnknownSKU:
    def test_all_unknown_skus_rejected(self):
        result = evaluate_upsell_proposal({
            "action": "upsell", "discount_pct": 10,
            "skus": ["UNKNOWN_A", "UNKNOWN_B"],
            "reasoning": "All bad.",
        }, CATALOG)
        assert result["decision"] == "rejected"

    def test_unknown_action_rejected(self):
        result = evaluate_upsell_proposal({
            "action": "invalid_action", "discount_pct": 10, "skus": ["SKU_101"],
            "reasoning": "Malformed.",
        }, CATALOG)
        assert result["decision"] == "rejected"
        assert "unknown action" in result["violations"][0]


# ═══════════════════════════════════════════════════════════════════════
# 9. VALID CAMPAIGN
# ═══════════════════════════════════════════════════════════════════════

class TestValidCampaign:
    def test_clean_campaign(self):
        result = evaluate_campaign_proposal({
            "action": "create_campaign",
            "name": "Summer Sale",
            "discount_pct": 10,
            "target_skus": ["SKU_101", "SKU_102"],
            "reasoning": "Boost summer sales.",
            "duration_hours": 24,
        }, CATALOG)
        assert result["decision"] == "approved"
        assert result["final_action"]["discount_pct"] == 10
        assert result["final_action"]["duration_hours"] == 24

    def test_campaign_at_max_discount_needs_approval(self):
        """25% is at max but above 15% threshold — needs approval."""
        result = evaluate_campaign_proposal({
            "action": "create_campaign",
            "name": "Max Campaign",
            "discount_pct": MAX_CAMPAIGN_DISCOUNT_PCT,
            "target_skus": ["SKU_101"],
            "reasoning": "Pushing limits.",
            "duration_hours": 12,
        }, CATALOG)
        assert result["decision"] == "awaiting_approval"
        assert result["needs_human_approval"] is True


# ═══════════════════════════════════════════════════════════════════════
# 10. CAMPAIGN ABOVE MAXIMUM DISCOUNT → REJECTED (not clamped!)
# ═══════════════════════════════════════════════════════════════════════

class TestCampaignExceedsMax:
    def test_30_pct_campaign_rejected(self):
        """Per spec: campaigns exceeding hard limits are REJECTED, not clamped."""
        result = evaluate_campaign_proposal({
            "action": "create_campaign",
            "name": "Too Generous",
            "discount_pct": 30,
            "target_skus": ["SKU_101"],
            "reasoning": "Aggressive.",
            "duration_hours": 24,
        }, CATALOG)
        assert result["decision"] == "rejected"
        assert "exceeds maximum" in result["violations"][0]

    def test_100_pct_campaign_rejected(self):
        result = evaluate_campaign_proposal({
            "action": "create_campaign",
            "name": "Free Everything",
            "discount_pct": 100,
            "target_skus": ["SKU_101"],
            "reasoning": "Give it away.",
            "duration_hours": 1,
        }, CATALOG)
        assert result["decision"] == "rejected"


# ═══════════════════════════════════════════════════════════════════════
# 11. CAMPAIGN DURATION ABOVE 48 HOURS → REJECTED
# ═══════════════════════════════════════════════════════════════════════

class TestCampaignDuration:
    def test_72h_campaign_rejected(self):
        result = evaluate_campaign_proposal({
            "action": "create_campaign",
            "name": "Long Running",
            "discount_pct": 10,
            "target_skus": ["SKU_101"],
            "reasoning": "Week-long sale.",
            "duration_hours": 72,
        }, CATALOG)
        assert result["decision"] == "rejected"
        assert "exceeds maximum" in result["violations"][0]

    def test_168h_campaign_rejected(self):
        result = evaluate_campaign_proposal({
            "action": "create_campaign",
            "name": "Monthly",
            "discount_pct": 10,
            "target_skus": ["SKU_101"],
            "reasoning": "Month-long.",
            "duration_hours": 168,
        }, CATALOG)
        assert result["decision"] == "rejected"

    def test_no_campaign_action(self):
        result = evaluate_campaign_proposal({
            "action": "no_campaign",
        }, CATALOG)
        assert result["decision"] == "approved"


# ═══════════════════════════════════════════════════════════════════════
# 12. BACKEND-ONLY FINAL AMOUNT CALCULATION
# ═══════════════════════════════════════════════════════════════════════

class TestCalculateFinalAmount:
    """Verify calculate_final_amount uses only server-side catalog prices."""

    def test_amount_with_10_pct_discount(self):
        amounts = calculate_final_amount(
            cart=[{"sku": "SKU_101", "quantity": 1}],
            approved_action={"discount_pct": 10, "skus": ["SKU_101"]},
            catalog=CATALOG,
        )
        assert amounts["original_amount_paise"] == 299900
        assert amounts["discount_amount_paise"] == 29990
        assert amounts["final_amount_paise"] == 299900 - 29990
        assert amounts["discount_pct"] == 10

    def test_amount_with_0_pct_discount(self):
        amounts = calculate_final_amount(
            cart=[{"sku": "SKU_101", "quantity": 2}],
            approved_action={"discount_pct": 0, "skus": ["SKU_101"]},
            catalog=CATALOG,
        )
        assert amounts["original_amount_paise"] == 599800
        assert amounts["final_amount_paise"] == 599800
        assert amounts["discount_amount_paise"] == 0

    def test_amount_with_multiple_items(self):
        amounts = calculate_final_amount(
            cart=[
                {"sku": "SKU_101", "quantity": 1},
                {"sku": "SKU_102", "quantity": 3},
            ],
            approved_action={"discount_pct": 15, "skus": ["SKU_101", "SKU_102"]},
            catalog=CATALOG,
        )
        original = 299900 + (49900 * 3)  # 299900 + 149700 = 449600
        discount = int(original * 15 / 100)
        assert amounts["original_amount_paise"] == original
        assert amounts["discount_amount_paise"] == discount
        assert amounts["final_amount_paise"] == original - discount

    def test_amount_never_negative(self):
        amounts = calculate_final_amount(
            cart=[{"sku": "SKU_102", "quantity": 1}],
            approved_action={"discount_pct": 0, "skus": ["SKU_102"]},
            catalog=CATALOG,
        )
        assert amounts["final_amount_paise"] > 0

    def test_amount_with_unknown_sku(self):
        """Unknown SKU is not in catalog, so price is 0."""
        amounts = calculate_final_amount(
            cart=[{"sku": "FAKE_SKU", "quantity": 1}],
            approved_action={"discount_pct": 10, "skus": ["FAKE_SKU"]},
            catalog=CATALOG,
        )
        # Original total is 0 (unknown SKU not in catalog)
        assert amounts["original_amount_paise"] == 0


# ═══════════════════════════════════════════════════════════════════════
# Constants sanity checks
# ═══════════════════════════════════════════════════════════════════════

class TestConstants:
    def test_max_discount_above_threshold(self):
        assert MAX_DISCOUNT_PCT > AUTO_APPROVE_THRESHOLD_PCT

    def test_campaign_max_at_least_as_high_as_upsell_max(self):
        assert MAX_CAMPAIGN_DISCOUNT_PCT >= MAX_DISCOUNT_PCT

    def test_all_expected_skus_in_allowlist(self):
        assert len(DISCOUNTABLE_SKUS) >= 6
        for i in range(1, 7):
            assert f"SKU_10{i}" in DISCOUNTABLE_SKUS

    def test_campaign_duration_positive(self):
        assert MAX_CAMPAIGN_DURATION_HOURS > 0
