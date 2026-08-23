"""The Cage — deterministic policy engine.

No external calls. No LLM. Pure functions that clamp or reject proposals.
This layer is boring on purpose — it's the approval workflow.
"""
from typing import Optional

# === HARD LIMITS (the LLM cannot override these) ===
MAX_DISCOUNT_PCT = 20
AUTO_APPROVE_THRESHOLD_PCT = 15
DISCOUNTABLE_SKUS = {"SKU_101", "SKU_102", "SKU_103", "SKU_104", "SKU_105", "SKU_106"}
MAX_CAMPAIGN_DURATION_HOURS = 48
MAX_CAMPAIGN_DISCOUNT_PCT = 25


def evaluate_upsell_proposal(proposal: dict) -> dict:
    """Evaluate an upsell proposal against hard limits.

    Args:
        proposal: dict with keys discount_pct, skus, reasoning

    Returns:
        dict with keys:
            passed (bool): True if no violations
            violations (list[str]): human-readable violation descriptions
            final_action (dict): the clamped/approved action
            needs_human_approval (bool): True if above auto-approve threshold
    """
    pct = proposal.get("discount_pct", 0)
    skus = list(proposal.get("skus", []))
    violations = []

    # Check discount cap
    if pct > MAX_DISCOUNT_PCT:
        violations.append(f"discount {pct}% exceeds max {MAX_DISCOUNT_PCT}%")
        pct = MAX_DISCOUNT_PCT

    # Check SKU allowlist
    non_discountable = [s for s in skus if s not in DISCOUNTABLE_SKUS]
    if non_discountable:
        violations.append(
            f"proposal includes non-discountable SKU(s): {', '.join(non_discountable)}"
        )
        skus = [s for s in skus if s in DISCOUNTABLE_SKUS]

    # Check if empty after clamping
    if not skus and pct > 0:
        violations.append("no discountable SKUs remaining after clamping")
        pct = 0

    needs_approval = pct > AUTO_APPROVE_THRESHOLD_PCT

    return {
        "passed": len(violations) == 0,
        "violations": violations,
        "final_action": {"discount_pct": pct, "skus": skus},
        "needs_human_approval": needs_approval,
    }


def evaluate_campaign_proposal(proposal: dict) -> dict:
    """Evaluate a campaign proposal against hard limits.

    Args:
        proposal: dict with keys name, discount_pct, target_skus, reasoning, duration_hours

    Returns:
        dict with same structure as evaluate_upsell_proposal
    """
    pct = proposal.get("discount_pct", 0)
    skus = list(proposal.get("target_skus", proposal.get("skus", [])))
    duration = proposal.get("duration_hours", 48)
    violations = []

    if pct > MAX_CAMPAIGN_DISCOUNT_PCT:
        violations.append(
            f"campaign discount {pct}% exceeds max {MAX_CAMPAIGN_DISCOUNT_PCT}%"
        )
        pct = MAX_CAMPAIGN_DISCOUNT_PCT

    if duration > MAX_CAMPAIGN_DURATION_HOURS:
        violations.append(
            f"campaign duration {duration}h exceeds max {MAX_CAMPAIGN_DURATION_HOURS}h"
        )
        duration = MAX_CAMPAIGN_DURATION_HOURS

    non_discountable = [s for s in skus if s not in DISCOUNTABLE_SKUS]
    if non_discountable:
        violations.append(
            f"campaign targets non-discountable SKU(s): {', '.join(non_discountable)}"
        )
        skus = [s for s in skus if s in DISCOUNTABLE_SKUS]

    needs_approval = pct > AUTO_APPROVE_THRESHOLD_PCT

    return {
        "passed": len(violations) == 0,
        "violations": violations,
        "final_action": {
            "discount_pct": pct,
            "target_skus": skus,
            "duration_hours": duration,
        },
        "needs_human_approval": needs_approval,
    }
