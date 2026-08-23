"""Comprehensive unit tests for the Cage — deterministic policy engine.

Tests cover:
- evaluate_upsell_proposal: discount clamping, SKU allowlist, approval thresholds, edge cases
- evaluate_campaign_proposal: discount/duration limits, SKU filtering, approval thresholds, edge cases
"""
import pytest
from backend.cage.policy_engine import (
    evaluate_upsell_proposal,
    evaluate_campaign_proposal,
    MAX_DISCOUNT_PCT,
    AUTO_APPROVE_THRESHOLD_PCT,
    DISCOUNTABLE_SKUS,
    MAX_CAMPAIGN_DURATION_HOURS,
    MAX_CAMPAIGN_DISCOUNT_PCT,
)


# =============================================================================
# evaluate_upsell_proposal — Happy Path
# =============================================================================


class TestUpsellHappyPath:
    """Proposals that pass cleanly with no violations."""

    def test_clean_proposal_within_limits(self):
        """10% discount on valid SKUs — should pass with no violations."""
        result = evaluate_upsell_proposal({
            "discount_pct": 10,
            "skus": ["SKU_101", "SKU_102"],
            "reasoning": "Customers who bought earbuds often add cables.",
        })
        assert result["passed"] is True
        assert result["violations"] == []
        assert result["final_action"]["discount_pct"] == 10
        assert result["final_action"]["skus"] == ["SKU_101", "SKU_102"]
        assert result["needs_human_approval"] is False

    def test_single_valid_sku(self):
        """Single SKU, low discount — clean pass."""
        result = evaluate_upsell_proposal({
            "discount_pct": 5,
            "skus": ["SKU_103"],
            "reasoning": "Phone case pairs well with earbuds.",
        })
        assert result["passed"] is True
        assert result["final_action"]["skus"] == ["SKU_103"]
        assert result["needs_human_approval"] is False

    def test_zero_discount_valid_skus(self):
        """0% discount is allowed (no discount applied)."""
        result = evaluate_upsell_proposal({
            "discount_pct": 0,
            "skus": ["SKU_101"],
            "reasoning": "Just suggesting a bundle, no discount.",
        })
        assert result["passed"] is True
        assert result["final_action"]["discount_pct"] == 0
        assert result["needs_human_approval"] is False

    def test_all_six_discountable_skus(self):
        """All 6 discountable SKUs in one proposal — should pass."""
        result = evaluate_upsell_proposal({
            "discount_pct": 10,
            "skus": list(DISCOUNTABLE_SKUS),
            "reasoning": "Bundle everything.",
        })
        assert result["passed"] is True
        assert len(result["final_action"]["skus"]) == 6


# =============================================================================
# evaluate_upsell_proposal — Discount Clamping
# =============================================================================


class TestUpsellDiscountClamping:
    """Discount exceeding MAX_DISCOUNT_PCT should be clamped."""

    def test_discount_exceeds_max(self):
        """25% exceeds max 20% — should clamp to 20%."""
        result = evaluate_upsell_proposal({
            "discount_pct": 25,
            "skus": ["SKU_101"],
            "reasoning": "Aggressive upsell.",
        })
        assert result["passed"] is False
        assert len(result["violations"]) == 1
        assert "exceeds max" in result["violations"][0]
        assert "25%" in result["violations"][0]
        assert result["final_action"]["discount_pct"] == MAX_DISCOUNT_PCT
        assert result["final_action"]["skus"] == ["SKU_101"]

    def test_discount_far_exceeds_max(self):
        """50% discount — should clamp to 20%."""
        result = evaluate_upsell_proposal({
            "discount_pct": 50,
            "skus": ["SKU_102"],
            "reasoning": "Way too generous.",
        })
        assert result["passed"] is False
        assert result["final_action"]["discount_pct"] == MAX_DISCOUNT_PCT

    def test_discount_exactly_at_max(self):
        """20% is exactly at max — should pass, no clamping needed."""
        result = evaluate_upsell_proposal({
            "discount_pct": MAX_DISCOUNT_PCT,
            "skus": ["SKU_101"],
            "reasoning": "Max allowed.",
        })
        assert result["passed"] is True
        assert result["violations"] == []
        assert result["final_action"]["discount_pct"] == MAX_DISCOUNT_PCT

    def test_discount_one_over_max(self):
        """21% — one over max, should still clamp."""
        result = evaluate_upsell_proposal({
            "discount_pct": 21,
            "skus": ["SKU_101"],
            "reasoning": "Just over.",
        })
        assert result["passed"] is False
        assert result["final_action"]["discount_pct"] == MAX_DISCOUNT_PCT

    def test_negative_discount_not_clamped(self):
        """Negative discount — no violation, passes through."""
        result = evaluate_upsell_proposal({
            "discount_pct": -5,
            "skus": ["SKU_101"],
            "reasoning": "Surcharge?",
        })
        assert result["passed"] is True
        assert result["final_action"]["discount_pct"] == -5


# =============================================================================
# evaluate_upsell_proposal — Auto-Approve Threshold
# =============================================================================


class TestUpsellApprovalThreshold:
    """Discount above AUTO_APPROVE_THRESHOLD_PCT requires human approval."""

    def test_below_threshold_no_approval(self):
        """10% < 15% threshold — no approval needed."""
        result = evaluate_upsell_proposal({
            "discount_pct": 10,
            "skus": ["SKU_101"],
            "reasoning": "Safe discount.",
        })
        assert result["needs_human_approval"] is False

    def test_exactly_at_threshold_no_approval(self):
        """15% == threshold — NOT above, so no approval needed."""
        result = evaluate_upsell_proposal({
            "discount_pct": AUTO_APPROVE_THRESHOLD_PCT,
            "skus": ["SKU_101"],
            "reasoning": "At the line.",
        })
        assert result["needs_human_approval"] is False

    def test_one_above_threshold_needs_approval(self):
        """16% > 15% — needs human approval."""
        result = evaluate_upsell_proposal({
            "discount_pct": 16,
            "skus": ["SKU_101"],
            "reasoning": "Just above threshold.",
        })
        assert result["needs_human_approval"] is True
        assert result["passed"] is True  # Still passes, just needs approval

    def test_max_discount_needs_approval(self):
        """20% (after clamping from 25%) > 15% — needs approval."""
        result = evaluate_upsell_proposal({
            "discount_pct": 25,
            "skus": ["SKU_101"],
            "reasoning": "Over max, will be clamped but still needs approval.",
        })
        assert result["final_action"]["discount_pct"] == MAX_DISCOUNT_PCT
        assert result["needs_human_approval"] is True

    def test_clamped_to_below_threshold_no_approval(self):
        """If clamping brings discount below threshold, no approval needed."""
        # This can't happen with current limits (20 > 15), but test the logic
        result = evaluate_upsell_proposal({
            "discount_pct": 16,
            "skus": ["SKU_101"],
            "reasoning": "16% needs approval.",
        })
        assert result["needs_human_approval"] is True


# =============================================================================
# evaluate_upsell_proposal — SKU Allowlist
# =============================================================================


class TestUpsellSKUAllowlist:
    """Non-discountable SKUs should be filtered out."""

    def test_all_valid_skus_no_violation(self):
        """All SKUs in allowlist — no violation."""
        result = evaluate_upsell_proposal({
            "discount_pct": 10,
            "skus": ["SKU_101", "SKU_103", "SKU_106"],
            "reasoning": "All valid.",
        })
        assert result["passed"] is True
        assert result["violations"] == []
        assert result["final_action"]["skus"] == ["SKU_101", "SKU_103", "SKU_106"]

    def test_one_invalid_sku_filtered(self):
        """One invalid SKU mixed in — filtered out, violation logged."""
        result = evaluate_upsell_proposal({
            "discount_pct": 10,
            "skus": ["SKU_101", "FAKE_SKU_999"],
            "reasoning": "One bad SKU.",
        })
        assert result["passed"] is False
        assert len(result["violations"]) == 1
        assert "FAKE_SKU_999" in result["violations"][0]
        assert result["final_action"]["skus"] == ["SKU_101"]

    def test_multiple_invalid_skus_all_filtered(self):
        """Multiple invalid SKUs — all filtered, only valid remain."""
        result = evaluate_upsell_proposal({
            "discount_pct": 10,
            "skus": ["SKU_101", "BAD_A", "BAD_B", "BAD_C"],
            "reasoning": "Mostly bad.",
        })
        assert result["passed"] is False
        assert result["final_action"]["skus"] == ["SKU_101"]
        assert "BAD_A" in result["violations"][0]
        assert "BAD_B" in result["violations"][0]
        assert "BAD_C" in result["violations"][0]

    def test_all_invalid_skus_empty_after_clamp(self):
        """All SKUs invalid — filtered to empty, discount zeroed."""
        result = evaluate_upsell_proposal({
            "discount_pct": 15,
            "skus": ["FAKE_A", "FAKE_B"],
            "reasoning": "All bad SKUs.",
        })
        assert result["passed"] is False
        assert len(result["violations"]) == 2  # non-discountable + empty after clamping
        assert "non-discountable" in result["violations"][0]
        assert "no discountable" in result["violations"][1]
        assert result["final_action"]["skus"] == []
        assert result["final_action"]["discount_pct"] == 0  # Zeroed because no valid SKUs

    def test_empty_sku_list_no_discount(self):
        """Empty SKU list with 0% discount — passes cleanly."""
        result = evaluate_upsell_proposal({
            "discount_pct": 0,
            "skus": [],
            "reasoning": "No suggestion.",
        })
        assert result["passed"] is True
        assert result["final_action"]["skus"] == []

    def test_empty_sku_list_with_discount(self):
        """Empty SKU list with non-zero discount — discount zeroed."""
        result = evaluate_upsell_proposal({
            "discount_pct": 10,
            "skus": [],
            "reasoning": "Discount but no SKUs.",
        })
        assert result["passed"] is False
        assert result["final_action"]["discount_pct"] == 0
        assert "no discountable" in result["violations"][0]


# =============================================================================
# evaluate_upsell_proposal — Edge Cases / Missing Keys
# =============================================================================


class TestUpsellEdgeCases:
    """Missing keys, empty proposals, malformed data."""

    def test_empty_proposal(self):
        """Empty dict — should handle gracefully with defaults."""
        result = evaluate_upsell_proposal({})
        assert result["passed"] is True
        assert result["final_action"]["discount_pct"] == 0
        assert result["final_action"]["skus"] == []
        assert result["needs_human_approval"] is False

    def test_missing_skus_key_with_discount(self):
        """Proposal with no 'skus' key but a discount — flags as violation (no SKUs to discount)."""
        result = evaluate_upsell_proposal({
            "discount_pct": 10,
            "reasoning": "Forgot SKUs.",
        })
        assert result["passed"] is False
        assert result["final_action"]["skus"] == []
        assert result["final_action"]["discount_pct"] == 0
        assert "no discountable" in result["violations"][0]

    def test_missing_skus_key_no_discount(self):
        """Proposal with no 'skus' key and 0% discount — passes (nothing to validate)."""
        result = evaluate_upsell_proposal({
            "discount_pct": 0,
            "reasoning": "No SKUs, no discount.",
        })
        assert result["passed"] is True
        assert result["final_action"]["skus"] == []

    def test_missing_discount_pct_key(self):
        """Proposal with no 'discount_pct' key — defaults to 0."""
        result = evaluate_upsell_proposal({
            "skus": ["SKU_101"],
            "reasoning": "Forgot discount.",
        })
        assert result["passed"] is True
        assert result["final_action"]["discount_pct"] == 0

    def test_missing_reasoning_key(self):
        """Proposal with no 'reasoning' — still evaluates correctly."""
        result = evaluate_upsell_proposal({
            "discount_pct": 10,
            "skus": ["SKU_101"],
        })
        assert result["passed"] is True

    def test_both_discount_and_sku_violations(self):
        """Proposal with both over-max discount AND non-discountable SKUs."""
        result = evaluate_upsell_proposal({
            "discount_pct": 30,
            "skus": ["SKU_101", "INVALID_X"],
            "reasoning": "Double violation.",
        })
        assert result["passed"] is False
        assert len(result["violations"]) == 2
        assert result["final_action"]["discount_pct"] == MAX_DISCOUNT_PCT
        assert result["final_action"]["skus"] == ["SKU_101"]

    def test_skus_preserve_order(self):
        """SKU order should be preserved after filtering."""
        result = evaluate_upsell_proposal({
            "discount_pct": 10,
            "skus": ["SKU_103", "INVALID", "SKU_101", "ALSO_INVALID", "SKU_105"],
            "reasoning": "Mixed bag.",
        })
        assert result["final_action"]["skus"] == ["SKU_103", "SKU_101", "SKU_105"]


# =============================================================================
# evaluate_campaign_proposal — Happy Path
# =============================================================================


class TestCampaignHappyPath:
    """Campaign proposals that pass cleanly."""

    def test_clean_campaign(self):
        """Campaign within all limits — passes."""
        result = evaluate_campaign_proposal({
            "name": "Summer Sale",
            "discount_pct": 15,
            "target_skus": ["SKU_101", "SKU_102"],
            "reasoning": "Boost summer electronics.",
            "duration_hours": 24,
        })
        assert result["passed"] is True
        assert result["violations"] == []
        assert result["final_action"]["discount_pct"] == 15
        assert result["final_action"]["target_skus"] == ["SKU_101", "SKU_102"]
        assert result["final_action"]["duration_hours"] == 24
        assert result["needs_human_approval"] is False

    def test_campaign_at_max_discount(self):
        """25% (at max) — passes."""
        result = evaluate_campaign_proposal({
            "name": "Max Discount",
            "discount_pct": MAX_CAMPAIGN_DISCOUNT_PCT,
            "target_skus": ["SKU_101"],
            "reasoning": "Pushing limits.",
            "duration_hours": 12,
        })
        assert result["passed"] is True
        assert result["final_action"]["discount_pct"] == MAX_CAMPAIGN_DISCOUNT_PCT

    def test_campaign_at_max_duration(self):
        """48h (at max) — passes."""
        result = evaluate_campaign_proposal({
            "name": "Long Campaign",
            "discount_pct": 10,
            "target_skus": ["SKU_101"],
            "reasoning": "Weekend sale.",
            "duration_hours": MAX_CAMPAIGN_DURATION_HOURS,
        })
        assert result["passed"] is True
        assert result["final_action"]["duration_hours"] == MAX_CAMPAIGN_DURATION_HOURS

    def test_zero_discount_campaign(self):
        """0% discount campaign — passes (just awareness, no discount)."""
        result = evaluate_campaign_proposal({
            "name": "Awareness Campaign",
            "discount_pct": 0,
            "target_skus": ["SKU_101"],
            "reasoning": "Brand awareness.",
            "duration_hours": 48,
        })
        assert result["passed"] is True
        assert result["final_action"]["discount_pct"] == 0


# =============================================================================
# evaluate_campaign_proposal — Discount Clamping
# =============================================================================


class TestCampaignDiscountClamping:
    """Campaign discount exceeding MAX_CAMPAIGN_DISCOUNT_PCT."""

    def test_campaign_discount_exceeds_max(self):
        """30% exceeds max 25% — clamped."""
        result = evaluate_campaign_proposal({
            "name": "Too Generous",
            "discount_pct": 30,
            "target_skus": ["SKU_101"],
            "reasoning": "Aggressive campaign.",
            "duration_hours": 24,
        })
        assert result["passed"] is False
        assert result["final_action"]["discount_pct"] == MAX_CAMPAIGN_DISCOUNT_PCT
        assert "exceeds max" in result["violations"][0]

    def test_campaign_discount_far_exceeds_max(self):
        """100% discount — clamped to 25%."""
        result = evaluate_campaign_proposal({
            "name": "Free Everything",
            "discount_pct": 100,
            "target_skus": ["SKU_101"],
            "reasoning": "Give it away.",
            "duration_hours": 1,
        })
        assert result["passed"] is False
        assert result["final_action"]["discount_pct"] == MAX_CAMPAIGN_DISCOUNT_PCT


# =============================================================================
# evaluate_campaign_proposal — Duration Limits
# =============================================================================


class TestCampaignDurationLimits:
    """Campaign duration exceeding MAX_CAMPAIGN_DURATION_HOURS."""

    def test_duration_exceeds_max(self):
        """72h exceeds 48h max — clamped."""
        result = evaluate_campaign_proposal({
            "name": "Long Running",
            "discount_pct": 10,
            "target_skus": ["SKU_101"],
            "reasoning": "Week-long sale.",
            "duration_hours": 72,
        })
        assert result["passed"] is False
        assert result["final_action"]["duration_hours"] == MAX_CAMPAIGN_DURATION_HOURS
        assert "exceeds max" in result["violations"][0]

    def test_duration_far_exceeds_max(self):
        """168h (1 week) — clamped to 48h."""
        result = evaluate_campaign_proposal({
            "name": "Monthly Campaign",
            "discount_pct": 10,
            "target_skus": ["SKU_101"],
            "reasoning": "Month-long promotion.",
            "duration_hours": 168,
        })
        assert result["passed"] is False
        assert result["final_action"]["duration_hours"] == MAX_CAMPAIGN_DURATION_HOURS

    def test_missing_duration_defaults_to_48(self):
        """No duration_hours key — defaults to 48 (at max, passes)."""
        result = evaluate_campaign_proposal({
            "name": "No Duration",
            "discount_pct": 10,
            "target_skus": ["SKU_101"],
            "reasoning": "Forgot duration.",
        })
        assert result["passed"] is True
        assert result["final_action"]["duration_hours"] == 48


# =============================================================================
# evaluate_campaign_proposal — SKU Filtering
# =============================================================================


class TestCampaignSKUs:
    """Campaign SKU allowlist enforcement."""

    def test_campaign_all_valid_skus(self):
        """All valid SKUs — passes."""
        result = evaluate_campaign_proposal({
            "name": "Valid SKUs",
            "discount_pct": 10,
            "target_skus": ["SKU_101", "SKU_102", "SKU_103"],
            "reasoning": "Good mix.",
            "duration_hours": 24,
        })
        assert result["passed"] is True
        assert len(result["final_action"]["target_skus"]) == 3

    def test_campaign_mix_valid_invalid(self):
        """Mix of valid and invalid — invalid filtered out."""
        result = evaluate_campaign_proposal({
            "name": "Mixed",
            "discount_pct": 10,
            "target_skus": ["SKU_101", "FAKE_SKU"],
            "reasoning": "One bad one.",
            "duration_hours": 24,
        })
        assert result["passed"] is False
        assert result["final_action"]["target_skus"] == ["SKU_101"]

    def test_campaign_all_invalid_skus(self):
        """All invalid SKUs — filtered to empty."""
        result = evaluate_campaign_proposal({
            "name": "All Invalid",
            "discount_pct": 10,
            "target_skus": ["BAD_A", "BAD_B"],
            "reasoning": "All bad.",
            "duration_hours": 24,
        })
        assert result["passed"] is False
        assert result["final_action"]["target_skus"] == []

    def test_campaign_uses_skus_fallback(self):
        """Fallback to 'skus' key if 'target_skus' missing."""
        result = evaluate_campaign_proposal({
            "name": "Fallback",
            "discount_pct": 10,
            "skus": ["SKU_101", "SKU_102"],
            "reasoning": "Used skus key.",
            "duration_hours": 24,
        })
        assert result["passed"] is True
        assert result["final_action"]["target_skus"] == ["SKU_101", "SKU_102"]

    def test_campaign_empty_target_skus(self):
        """Empty target_skus — passes (no SKU filtering needed)."""
        result = evaluate_campaign_proposal({
            "name": "No SKUs",
            "discount_pct": 10,
            "target_skus": [],
            "reasoning": "General campaign.",
            "duration_hours": 24,
        })
        assert result["passed"] is True


# =============================================================================
# evaluate_campaign_proposal — Approval Threshold
# =============================================================================


class TestCampaignApproval:
    """Campaign approval threshold behavior."""

    def test_campaign_below_threshold_no_approval(self):
        """10% < 15% — no approval."""
        result = evaluate_campaign_proposal({
            "name": "Low Discount",
            "discount_pct": 10,
            "target_skus": ["SKU_101"],
            "reasoning": "Safe.",
            "duration_hours": 24,
        })
        assert result["needs_human_approval"] is False

    def test_campaign_at_threshold_no_approval(self):
        """15% == threshold — NOT above, no approval."""
        result = evaluate_campaign_proposal({
            "name": "At Threshold",
            "discount_pct": AUTO_APPROVE_THRESHOLD_PCT,
            "target_skus": ["SKU_101"],
            "reasoning": "Right at the line.",
            "duration_hours": 24,
        })
        assert result["needs_human_approval"] is False

    def test_campaign_above_threshold_needs_approval(self):
        """16% > 15% — needs approval."""
        result = evaluate_campaign_proposal({
            "name": "Needs Approval",
            "discount_pct": 16,
            "target_skus": ["SKU_101"],
            "reasoning": "Above threshold.",
            "duration_hours": 24,
        })
        assert result["needs_human_approval"] is True

    def test_campaign_clamped_still_needs_approval(self):
        """Clamped from 30% to 25% — still above threshold, needs approval."""
        result = evaluate_campaign_proposal({
            "name": "Clamped + Approval",
            "discount_pct": 30,
            "target_skus": ["SKU_101"],
            "reasoning": "Over max, clamped.",
            "duration_hours": 24,
        })
        assert result["final_action"]["discount_pct"] == MAX_CAMPAIGN_DISCOUNT_PCT
        assert result["needs_human_approval"] is True


# =============================================================================
# evaluate_campaign_proposal — Combined Violations
# =============================================================================


class TestCampaignCombined:
    """Multiple violations in a single proposal."""

    def test_all_three_violations(self):
        """Over-max discount + over-max duration + invalid SKUs."""
        result = evaluate_campaign_proposal({
            "name": "Triple Violation",
            "discount_pct": 50,
            "target_skus": ["SKU_101", "INVALID_A", "INVALID_B"],
            "reasoning": "Everything wrong.",
            "duration_hours": 100,
        })
        assert result["passed"] is False
        assert len(result["violations"]) == 3
        assert result["final_action"]["discount_pct"] == MAX_CAMPAIGN_DISCOUNT_PCT
        assert result["final_action"]["duration_hours"] == MAX_CAMPAIGN_DURATION_HOURS
        assert result["final_action"]["target_skus"] == ["SKU_101"]

    def test_discount_plus_invalid_skus(self):
        """Over-max discount + invalid SKUs."""
        result = evaluate_campaign_proposal({
            "name": "Two Violations",
            "discount_pct": 40,
            "target_skus": ["FAKE_1"],
            "reasoning": "Two problems.",
            "duration_hours": 24,
        })
        assert result["passed"] is False
        assert len(result["violations"]) == 2


# =============================================================================
# evaluate_campaign_proposal — Edge Cases
# =============================================================================


class TestCampaignEdgeCases:
    """Missing keys, empty proposals."""

    def test_empty_campaign_proposal(self):
        """Empty dict — should handle gracefully."""
        result = evaluate_campaign_proposal({})
        assert result["passed"] is True
        assert result["final_action"]["discount_pct"] == 0
        assert result["final_action"]["target_skus"] == []
        assert result["final_action"]["duration_hours"] == 48

    def test_missing_duration_and_skus(self):
        """Only discount_pct provided — other fields default."""
        result = evaluate_campaign_proposal({
            "name": "Minimal",
            "discount_pct": 10,
            "reasoning": "Bare minimum.",
        })
        assert result["passed"] is True
        assert result["final_action"]["target_skus"] == []
        assert result["final_action"]["duration_hours"] == 48

    def test_campaign_negative_discount(self):
        """Negative discount — passes through (surcharge logic)."""
        result = evaluate_campaign_proposal({
            "name": "Negative",
            "discount_pct": -10,
            "target_skus": ["SKU_101"],
            "reasoning": "Surcharge campaign.",
            "duration_hours": 24,
        })
        assert result["passed"] is True
        assert result["final_action"]["discount_pct"] == -10


# =============================================================================
# Cross-cutting: Constants sanity checks
# =============================================================================


class TestConstants:
    """Verify the hard limits are sensible."""

    def test_max_discount_above_threshold(self):
        """Max discount must be above auto-approve threshold."""
        assert MAX_DISCOUNT_PCT > AUTO_APPROVE_THRESHOLD_PCT

    def test_campaign_max_above_upsell_max(self):
        """Campaign max discount can be higher than upsell max."""
        assert MAX_CAMPAIGN_DISCOUNT_PCT >= MAX_DISCOUNT_PCT

    def test_all_expected_skus_in_allowlist(self):
        """All 6 seed products should be discountable."""
        assert len(DISCOUNTABLE_SKUS) == 6
        for i in range(1, 7):
            assert f"SKU_10{i}" in DISCOUNTABLE_SKUS

    def test_campaign_duration_positive(self):
        """Max campaign duration should be positive."""
        assert MAX_CAMPAIGN_DURATION_HOURS > 0
