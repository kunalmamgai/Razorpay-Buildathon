"""The Cage — deterministic policy engine with dynamic multi-tenant policy configuration support.

No external calls. No LLM. Pure functions that clamp or reject proposals.
This layer is the approval workflow & safety guardrail authority.

The Cage is the ONLY authority for executable discounts and campaigns.
Gemini output is always evaluated here before any money movement.
"""
from backend.config import (
    MAX_DISCOUNT_PCT as DEFAULT_MAX_DISCOUNT_PCT,
    AUTO_APPROVE_THRESHOLD_PCT as DEFAULT_AUTO_APPROVE_THRESHOLD_PCT,
    DISCOUNTABLE_SKUS as DEFAULT_DISCOUNTABLE_SKUS,
    MAX_CAMPAIGN_DISCOUNT_PCT as DEFAULT_MAX_CAMPAIGN_DISCOUNT_PCT,
    MAX_CAMPAIGN_DURATION_HOURS as DEFAULT_MAX_CAMPAIGN_DURATION_HOURS,
)


def evaluate_upsell_proposal(
    proposal: dict,
    catalog: list[dict] | None = None,
    policy_config: dict | None = None,
) -> dict:
    """Evaluate an upsell proposal against hard limits for a specific merchant configuration.

    Args:
        proposal: dict with keys action, discount_pct, skus, reasoning
        catalog: optional list of product dicts for SKU validation
        policy_config: optional dict with merchant-specific policy limits

    Returns:
        dict with keys:
            decision: "approved" | "clamped" | "rejected" | "awaiting_approval"
            violations: list of human-readable violation strings
            final_action: the safe executable action
            needs_human_approval: bool
            policy_version: "policy-v1"
    """
    cfg = policy_config or {}
    max_discount_pct = cfg.get("max_discount_pct", DEFAULT_MAX_DISCOUNT_PCT)
    auto_approve_threshold_pct = cfg.get("auto_approve_threshold_pct", DEFAULT_AUTO_APPROVE_THRESHOLD_PCT)
    discountable_skus = set(cfg.get("discountable_skus", DEFAULT_DISCOUNTABLE_SKUS))

    action = proposal.get("action", "no_offer")
    pct = proposal.get("discount_pct", 0)
    skus = list(proposal.get("skus", []))
    violations = []

    # ── Reject malformed proposals ──
    if action not in ("upsell", "no_offer"):
        violations.append(f"unknown action '{action}' — expected 'upsell' or 'no_offer'")
        return _rejected(violations)

    if action == "no_offer" or (pct == 0 and not skus):
        return _approved(violations=[], final_action={"discount_pct": 0, "skus": []})

    # ── Reject negative discounts ──
    if pct < 0:
        violations.append(f"negative discount {pct}% is not allowed")
        return _rejected(violations)

    # ── Reject discounts above 100% ──
    if pct > 100:
        violations.append(f"discount {pct}% exceeds 100% — invalid")
        return _rejected(violations)

    # ── Clamp discounts above max_discount_pct ──
    if pct > max_discount_pct:
        violations.append(
            f"discount {pct}% exceeds maximum allowed merchant discount of {max_discount_pct}%"
        )
        pct = max_discount_pct

    # ── Validate SKU IDs against catalog / discountable list ──
    if catalog:
        catalog_ids = {p["id"] for p in catalog}
        unknown_skus = [s for s in skus if s not in catalog_ids]
        if unknown_skus:
            violations.append(
                f"unknown SKU(s): {', '.join(unknown_skus)} — not in catalog"
            )
            skus = [s for s in skus if s in catalog_ids]
    else:
        non_discountable = [s for s in skus if s not in discountable_skus]
        if non_discountable:
            violations.append(
                f"non-discountable SKU(s): {', '.join(non_discountable)}"
            )
            skus = [s for s in skus if s in discountable_skus]

    # ── Reject if no valid SKUs remain ──
    if not skus and pct > 0:
        violations.append("no discountable SKUs remaining after validation")
        pct = 0
        return _rejected(violations)

    # ── Empty SKU list with 0% discount is fine ──
    if not skus:
        return _approved(violations=violations, final_action={"discount_pct": 0, "skus": []})

    # ── Determine approval status ──
    final_action = {"discount_pct": pct, "skus": skus}
    needs_approval = pct > auto_approve_threshold_pct

    if violations:
        if needs_approval:
            return _awaiting_approval(violations, final_action)
        return _clamped(violations, final_action)
    else:
        if needs_approval:
            return _awaiting_approval(violations, final_action)
        return _approved(violations, final_action)


def evaluate_campaign_proposal(
    proposal: dict,
    catalog: list[dict] | None = None,
    current_time=None,
    policy_config: dict | None = None,
) -> dict:
    """Evaluate a campaign proposal against hard limits for a merchant.

    Args:
        proposal: dict with keys action, name, discount_pct, target_skus, duration_hours
        catalog: optional list of product dicts for SKU validation
        current_time: optional datetime for duration validation
        policy_config: optional dict with merchant-specific policy limits

    Returns:
        dict with same structure as evaluate_upsell_proposal
    """
    cfg = policy_config or {}
    max_campaign_discount_pct = cfg.get("max_campaign_discount_pct", DEFAULT_MAX_CAMPAIGN_DISCOUNT_PCT)
    max_campaign_duration_hours = cfg.get("max_campaign_duration_hours", DEFAULT_MAX_CAMPAIGN_DURATION_HOURS)
    auto_approve_threshold_pct = cfg.get("auto_approve_threshold_pct", DEFAULT_AUTO_APPROVE_THRESHOLD_PCT)
    discountable_skus = set(cfg.get("discountable_skus", DEFAULT_DISCOUNTABLE_SKUS))

    action = proposal.get("action", "create_campaign")
    pct = proposal.get("discount_pct", 0)
    skus = list(proposal.get("target_skus", proposal.get("skus", [])))
    duration = proposal.get("duration_hours", 48)
    violations = []

    # ── Reject malformed proposals ──
    if action not in ("create_campaign", "no_campaign"):
        violations.append(f"unknown action '{action}' — expected 'create_campaign' or 'no_campaign'")
        return _rejected(violations)

    if action == "no_campaign":
        return _approved(violations=[], final_action={
            "discount_pct": 0, "target_skus": [], "duration_hours": 0
        })

    # ── Reject negative discounts ──
    if pct < 0:
        violations.append(f"negative discount {pct}% is not allowed")
        return _rejected(violations)

    # ── Reject discounts above 100% ──
    if pct > 100:
        violations.append(f"discount {pct}% exceeds 100% — invalid")
        return _rejected(violations)

    # ── Reject campaigns exceeding max_campaign_discount_pct ──
    if pct > max_campaign_discount_pct:
        violations.append(
            f"campaign discount {pct}% exceeds maximum allowed merchant campaign discount of {max_campaign_discount_pct}%"
        )
        return _rejected(violations)

    # ── Reject campaigns exceeding max_campaign_duration_hours ──
    if duration > max_campaign_duration_hours:
        violations.append(
            f"campaign duration {duration}h exceeds maximum allowed merchant duration of {max_campaign_duration_hours}h"
        )
        return _rejected(violations)

    # ── Validate SKUs ──
    if catalog:
        catalog_ids = {p["id"] for p in catalog}
        unknown_skus = [s for s in skus if s not in catalog_ids]
        if unknown_skus:
            violations.append(
                f"unknown SKU(s): {', '.join(unknown_skus)} — not in catalog"
            )
            skus = [s for s in skus if s in catalog_ids]
    else:
        non_discountable = [s for s in skus if s not in discountable_skus]
        if non_discountable:
            violations.append(
                f"campaign targets non-discountable SKU(s): {', '.join(non_discountable)}"
            )
            skus = [s for s in skus if s in discountable_skus]

    # ── Reject if no valid SKUs remain ──
    if not skus and pct > 0:
        violations.append("no discountable SKUs remaining after validation")
        return _rejected(violations)

    # ── Determine approval status ──
    final_action = {
        "discount_pct": pct,
        "target_skus": skus,
        "duration_hours": duration,
    }
    needs_approval = pct > auto_approve_threshold_pct

    if violations:
        if needs_approval:
            return _awaiting_approval(violations, final_action)
        return _clamped(violations, final_action)
    else:
        if needs_approval:
            return _awaiting_approval(violations, final_action)
        return _approved(violations, final_action)


def calculate_final_amount(cart: list[dict], approved_action: dict,
                           catalog: list[dict]) -> dict:
    """Calculate payable amount server-side."""
    catalog_map = {p["id"]: p for p in catalog}

    original_total = 0
    for item in cart:
        product = catalog_map.get(item["sku"])
        if product:
            original_total += product["price"] * item.get("quantity", 1)

    discount_pct = approved_action.get("discount_pct", 0)
    discount_amount = int(original_total * discount_pct / 100)
    final_amount = original_total - discount_amount

    if final_amount < 0:
        final_amount = 0
    if discount_pct == 0:
        discount_amount = 0
        final_amount = original_total

    return {
        "original_amount_paise": original_total,
        "final_amount_paise": final_amount,
        "discount_amount_paise": discount_amount,
        "discount_pct": discount_pct,
    }


def _approved(violations: list, final_action: dict) -> dict:
    return {
        "decision": "approved",
        "violations": violations,
        "final_action": final_action,
        "needs_human_approval": False,
        "policy_version": "policy-v1",
    }


def _clamped(violations: list, final_action: dict) -> dict:
    return {
        "decision": "clamped",
        "violations": violations,
        "final_action": final_action,
        "needs_human_approval": False,
        "policy_version": "policy-v1",
    }


def _rejected(violations: list) -> dict:
    return {
        "decision": "rejected",
        "violations": violations,
        "final_action": {},
        "needs_human_approval": False,
        "policy_version": "policy-v1",
    }


def _awaiting_approval(violations: list, final_action: dict) -> dict:
    return {
        "decision": "awaiting_approval",
        "violations": violations,
        "final_action": final_action,
        "needs_human_approval": True,
        "policy_version": "policy-v1",
    }
