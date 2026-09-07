"""Checkout service — orchestrates Brain → Cage → Razorpay pipeline with multi-tenant merchant isolation.
"""
import json
import uuid
import logging
from datetime import datetime
from typing import Optional

from backend.db import get_db, get_connection
from backend.brain.gemini_agent import propose_upsell
from backend.cage.policy_engine import evaluate_upsell_proposal, calculate_final_amount
from backend.merchant_manager import get_merchant
from backend.ledger.ledger import log_entry, get_entry_by_id
from backend.razorpay_client import sync_create_order, resolve_merchant_credentials

logger = logging.getLogger("marlin.checkout_service")


def get_catalog(merchant_id: str = "merchant_default") -> list[dict]:
    """Fetch all products from the isolated merchant database."""
    with get_db(merchant_id) as conn:
        rows = conn.execute("SELECT * FROM products").fetchall()
        return [dict(row) for row in rows]


def _get_active_campaigns(merchant_id: str = "merchant_default") -> list[dict]:
    """Return status='active' campaigns that have not expired yet."""
    with get_db(merchant_id) as conn:
        rows = conn.execute(
            "SELECT * FROM campaigns WHERE status = 'active'"
        ).fetchall()

    now = datetime.utcnow()
    campaigns = []
    for row in rows:
        c = dict(row)
        try:
            exp = datetime.fromisoformat(c.get("expires_at") or "").replace(tzinfo=None)
        except (ValueError, TypeError):
            exp = None
        if exp is not None and exp < now:
            continue
        try:
            c["target_skus"] = json.loads(c.get("target_skus_json") or "[]")
        except (json.JSONDecodeError, TypeError):
            c["target_skus"] = []
        campaigns.append(c)
    return campaigns


def _campaign_map_for_cart(cart_skus: list[str], active_campaigns: list[dict]) -> tuple[dict, list[dict]]:
    """Best campaign discount per cart SKU, plus summaries of the campaigns applied.

    Returns (sku -> pct map, list of applied campaign summaries).
    """
    best = {}
    for c in active_campaigns:
        pct = int(c.get("discount_pct") or 0)
        if pct <= 0:
            continue
        for sku in c.get("target_skus", []):
            if sku in cart_skus and pct > best.get(sku, {}).get("discount_pct", 0):
                best[sku] = {
                    "discount_pct": pct,
                    "campaign_name": c.get("name") or "Live campaign",
                    "campaign_id": c.get("id"),
                }
    campaign_map = {sku: info["discount_pct"] for sku, info in best.items()}
    applied = [{"sku": sku, **info} for sku, info in best.items()]
    return campaign_map, applied


def _join_campaign_reasoning(applied_campaigns: list[dict], brain_reasoning: str) -> str:
    """Human-readable reasoning line mentioning every applied campaign."""
    parts = [
        f"{a['discount_pct']}% live campaign '{a['campaign_name']}' applied to {a['sku']}"
        for a in applied_campaigns
    ]
    campaign_line = "Active campaign discount: " + "; ".join(parts) + "."
    return f"{campaign_line} {brain_reasoning}".strip()


def _amounts_from_snapshot(entry: dict, final_action: dict, merchant_id: str = "merchant_default") -> dict:
    """Restore amount snapshot persisted at proposal time."""
    raw = entry.get("amounts_json")
    if raw:
        try:
            snap = json.loads(raw)
            if snap.get("original_amount_paise") is not None and \
               snap.get("final_amount_paise") is not None:
                return {
                    "original_total": snap["original_amount_paise"],
                    "final_amount": snap["final_amount_paise"],
                    "discount_amount": snap.get("discount_amount_paise", 0),
                    "discount_pct": snap.get("discount_pct", 0),
                }
        except (json.JSONDecodeError, TypeError):
            pass

    catalog = get_catalog(merchant_id)
    catalog_map = {p["id"]: p for p in catalog}
    original_total = 0
    cart_raw = entry.get("cart_json")
    if cart_raw:
        try:
            cart_items = json.loads(cart_raw) if isinstance(cart_raw, str) else cart_raw
            for item in cart_items:
                sku = item.get("sku") if isinstance(item, dict) else item
                product = catalog_map.get(sku)
                if product:
                    qty = item.get("quantity", 1) if isinstance(item, dict) else 1
                    original_total += product["price"] * qty
        except (json.JSONDecodeError, TypeError):
            pass

    if original_total == 0:
        for sku in final_action.get("skus", []):
            product = catalog_map.get(sku)
            if product:
                original_total += product["price"]
    if original_total == 0:
        original_total = 100000

    # Mirror calculate_final_amount: campaign layer per-SKU, then upsell layer.
    campaign_map = final_action.get("campaign_discounts", {}) or {}
    after_campaign = original_total
    if campaign_map:
        after_campaign = 0
        cart_items = []
        if cart_raw:
            try:
                cart_items = json.loads(cart_raw) if isinstance(cart_raw, str) else cart_raw
            except (json.JSONDecodeError, TypeError):
                cart_items = []
        for item in cart_items:
            sku = item.get("sku") if isinstance(item, dict) else item
            product = catalog_map.get(sku)
            if not product:
                continue
            qty = item.get("quantity", 1) if isinstance(item, dict) else 1
            line_total = product["price"] * qty
            campaign_pct = campaign_map.get(sku, 0)
            if campaign_pct > 0:
                line_total = int(round(line_total * (100 - campaign_pct) / 100 / 100)) * 100
            after_campaign += line_total

    upsell_pct = final_action.get("discount_pct", 0)
    if after_campaign > 0 and upsell_pct > 0:
        discount_amount = int(round(after_campaign * upsell_pct / 100 / 100)) * 100
    else:
        discount_amount = 0
    final_amount = after_campaign - discount_amount
    if final_amount <= 0:
        final_amount = original_total
        discount_amount = 0
        upsell_pct = 0
    return {
        "original_total": original_total,
        "final_amount": final_amount,
        "discount_amount": discount_amount,
        "discount_pct": upsell_pct,
    }


def _ensure_offer_not_invalidated(offer_id: str, merchant_id: str = "merchant_default") -> None:
    """Reject checkout if this offer was already used by a failed payment."""
    with get_db(merchant_id) as conn:
        existing = conn.execute(
            "SELECT status FROM orders WHERE offer_id = ?", (offer_id,)
        ).fetchone()
        if existing and dict(existing)["status"] == "payment_failed":
            raise ValueError(
                f"Offer {offer_id} was invalidated after payment failure. "
                "Please create a new checkout."
            )


def propose_checkout(
    cart: list[dict],
    idempotency_key: str | None = None,
    merchant_id: str = "merchant_default",
) -> dict:
    """Step 1: Brain proposes → Cage evaluates (using merchant policies) → store pending result."""
    if idempotency_key is None:
        idempotency_key = f"idem_{uuid.uuid4().hex[:16]}"

    correlation_id = f"corr_{uuid.uuid4().hex[:12]}"
    merchant_info = get_merchant(merchant_id)
    policy_config = merchant_info.get("policy_config", {})

    catalog = get_catalog(merchant_id)
    catalog_map = {p["id"]: p for p in catalog}

    cart_detail = []
    original_total = 0
    for item in cart:
        product = catalog_map.get(item["sku"])
        if not product:
            raise ValueError(f"Unknown SKU: {item['sku']} for merchant '{merchant_id}'")
        line_total = product["price"] * item.get("quantity", 1)
        cart_detail.append({
            "sku": item["sku"],
            "name": product["name"],
            "price": product["price"],
            "quantity": item.get("quantity", 1),
            "line_total": line_total,
        })
        original_total += line_total

    # ── Live campaign baseline: active campaigns targeting cart SKUs ──
    # These were already approved by the merchant when the campaign was
    # activated, so they are a guaranteed, pre-approved discount layer.
    active_campaigns = _get_active_campaigns(merchant_id)
    cart_skus = [item["sku"] for item in cart_detail]
    campaign_map, applied_campaigns = _campaign_map_for_cart(cart_skus, active_campaigns)

    # Brain proposes (given campaign context so it stacks, not duplicates)
    proposal = propose_upsell(cart_detail, catalog, active_campaigns=active_campaigns)

    # Fold the campaign baseline into the proposal. The Cage still evaluates
    # the AI upsell portion; the campaign portion was gated at activation.
    if applied_campaigns:
        upsell_pct = proposal.get("discount_pct", 0) if proposal.get("action") == "upsell" else 0
        upsell_skus = list(proposal.get("skus", [])) if proposal.get("action") == "upsell" else []
        proposal = {
            "action": "upsell",
            "skus": sorted(set(cart_skus) | set(upsell_skus)),
            "discount_pct": upsell_pct,
            "reasoning": _join_campaign_reasoning(applied_campaigns, proposal.get("reasoning", "")),
            "confidence": proposal.get("confidence", 0.0),
            "expected_benefit": proposal.get("expected_benefit", ""),
            "campaign_discounts": campaign_map,
        }

    # Cage evaluates using merchant's policy rules
    policy_result = evaluate_upsell_proposal(proposal, catalog, policy_config=policy_config)

    # Calculate amounts server-side (campaign layer + upsell layer)
    final_action = dict(policy_result.get("final_action", {}))
    final_action["campaign_discounts"] = campaign_map
    amounts = calculate_final_amount(cart, final_action, catalog)

    decision = policy_result["decision"]

    # Display copy: expose the effective blended rate (campaign + upsell) so
    # the UI shows the real savings. The Cage evaluated the upsell portion.
    if applied_campaigns:
        proposal = dict(proposal)
        proposal["discount_pct"] = amounts["discount_pct"]

    # Persist the campaign layer with the final action so order flows can
    # recompute amounts even when the snapshot is missing. The response keeps
    # the Cage's pure output; only the ledger copy carries the extra key.
    ledger_policy_result = dict(policy_result)
    ledger_policy_result["final_action"] = final_action

    # Log entry to merchant's isolated ledger
    entry_id = log_entry(
        correlation_id=correlation_id,
        event_type="checkout_proposal",
        actor="brain",
        trigger="checkout",
        proposal=proposal,
        reasoning=proposal.get("reasoning", ""),
        policy_result=ledger_policy_result,
        idempotency_key=idempotency_key,
        outcome=decision,
        amounts=amounts,
        merchant_id=merchant_id,
    )

    key_id, _, _ = resolve_merchant_credentials(merchant_id)

    return {
        "entry_id": entry_id,
        "correlation_id": correlation_id,
        "proposal": proposal,
        "policy_result": policy_result,
        "original_amount_paise": amounts["original_amount_paise"],
        "final_amount_paise": amounts["final_amount_paise"],
        "discount_amount_paise": amounts["discount_amount_paise"],
        "discount_pct": amounts["discount_pct"],
        "razorpay_key_id": key_id,
        "idempotency_key": idempotency_key,
        "merchant_id": merchant_id,
        "campaigns_applied": applied_campaigns,
        "campaign_discount_pct": amounts["discount_pct"] if applied_campaigns else 0,
    }


def approve_checkout(ledger_id: int, merchant_id: str = "merchant_default") -> dict:
    """Step 2: Merchant approves a pending proposal in their isolated DB."""
    entry = get_entry_by_id(ledger_id, merchant_id=merchant_id)
    if not entry:
        raise ValueError(f"Ledger entry {ledger_id} not found for merchant '{merchant_id}'")

    if entry["outcome"] != "awaiting_approval":
        raise ValueError(f"Entry {ledger_id} is not awaiting approval (current: {entry['outcome']})")

    if entry.get("approval_status") == "approved":
        raise ValueError(f"Entry {ledger_id} has already been approved")

    # NOTE: ConnectionWrapper is not a context manager — manage the
    # transaction explicitly and always close the connection.
    conn = get_connection(merchant_id)
    try:
        conn.execute("BEGIN IMMEDIATE")
        row = conn.execute(
            "SELECT id FROM ledger WHERE id = ? AND (approval_status IS NULL OR approval_status != 'approved')",
            (ledger_id,)
        ).fetchone()
        if not row:
            conn.execute("ROLLBACK")
            raise ValueError(f"Entry {ledger_id} has already been approved")

        from datetime import datetime
        conn.execute(
            "UPDATE ledger SET approval_status = ?, approval_actor = ?, approval_timestamp = ? WHERE id = ?",
            ("approved", "merchant", datetime.utcnow().isoformat(), ledger_id),
        )
        conn.execute("COMMIT")
    finally:
        conn.close()

    final_action = json.loads(entry["final_action_json"]) if entry["final_action_json"] else {}
    proposal = json.loads(entry["proposal_json"]) if entry["proposal_json"] else {}
    correlation_id = entry["correlation_id"]

    resolved = _amounts_from_snapshot(entry, final_action, merchant_id=merchant_id)
    original_total = resolved["original_total"]
    final_amount = resolved["final_amount"]
    discount_pct = resolved["discount_pct"]
    cart_skus = final_action.get("skus", proposal.get("skus", []))

    offer_id = f"offer_{correlation_id}"
    _ensure_offer_not_invalidated(offer_id, merchant_id=merchant_id)

    idempotency_key = entry.get("idempotency_key") or f"idem_{uuid.uuid4().hex[:16]}"
    order_data = sync_create_order(
        final_amount,
        idempotency_key=idempotency_key,
        notes={
            "correlation_id": correlation_id,
            "offer_id": offer_id,
            "discount_pct": str(discount_pct),
        },
        merchant_id=merchant_id,
    )

    with get_db(merchant_id) as conn:
        conn.execute(
            """INSERT INTO orders
               (id, razorpay_order_id, cart_json, original_amount, final_amount,
                offer_id, status, idempotency_key)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                order_data["id"],
                order_data["id"],
                json.dumps(cart_skus),
                original_total,
                final_amount,
                offer_id,
                "created",
                idempotency_key,
            ),
        )

    log_entry(
        correlation_id=correlation_id,
        event_type="order_created",
        actor="system",
        trigger="checkout",
        proposal=proposal,
        reasoning=f"Order created after merchant approval. Discount: {discount_pct}%",
        policy_result={"decision": "approved", "final_action": final_action},
        razorpay_order_id=order_data["id"],
        idempotency_key=idempotency_key,
        outcome="order_created",
        approval_status="approved",
        merchant_id=merchant_id,
    )

    key_id, _, _ = resolve_merchant_credentials(merchant_id)

    return {
        "entry_id": ledger_id,
        "correlation_id": correlation_id,
        "order_id": order_data["id"],
        "razorpay_key_id": key_id,
        "final_amount_paise": final_amount,
        "discount_pct": discount_pct,
        "merchant_id": merchant_id,
    }


def create_order_from_proposal(
    ledger_id: int,
    idempotency_key: str | None = None,
    merchant_id: str = "merchant_default",
) -> dict:
    """Step 3: Create Razorpay order for auto-approved proposals in isolated DB."""
    entry = get_entry_by_id(ledger_id, merchant_id=merchant_id)
    if not entry:
        raise ValueError(f"Ledger entry {ledger_id} not found for merchant '{merchant_id}'")

    if entry["outcome"] not in ("approved", "clamped"):
        raise ValueError(
            f"Entry {ledger_id} cannot create order (current: {entry['outcome']}). "
            "Only approved or clamped proposals can proceed."
        )

    correlation_id = entry["correlation_id"]
    final_action = json.loads(entry["final_action_json"]) if entry["final_action_json"] else {}
    proposal = json.loads(entry["proposal_json"]) if entry["proposal_json"] else {}

    resolved = _amounts_from_snapshot(entry, final_action, merchant_id=merchant_id)
    original_total = resolved["original_total"]
    final_amount = resolved["final_amount"]
    discount_pct = resolved["discount_pct"]
    cart_skus = final_action.get("skus", proposal.get("skus", []))

    offer_id = f"offer_{correlation_id}"
    _ensure_offer_not_invalidated(offer_id, merchant_id=merchant_id)

    if idempotency_key is None:
        idempotency_key = entry.get("idempotency_key") or f"idem_{uuid.uuid4().hex[:16]}"

    order_data = sync_create_order(
        final_amount,
        idempotency_key=idempotency_key,
        notes={
            "correlation_id": correlation_id,
            "offer_id": offer_id,
            "discount_pct": str(discount_pct),
        },
        merchant_id=merchant_id,
    )

    with get_db(merchant_id) as conn:
        conn.execute(
            """INSERT INTO orders
               (id, razorpay_order_id, cart_json, original_amount, final_amount,
                offer_id, status, idempotency_key)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                order_data["id"],
                order_data["id"],
                json.dumps(cart_skus),
                original_total,
                final_amount,
                offer_id,
                "created",
                idempotency_key,
            ),
        )

    log_entry(
        correlation_id=correlation_id,
        event_type="order_created",
        actor="system",
        trigger="checkout",
        proposal=proposal,
        reasoning=f"Order created (auto-approved). Discount: {discount_pct}%",
        policy_result={"decision": "approved", "final_action": final_action},
        razorpay_order_id=order_data["id"],
        idempotency_key=idempotency_key,
        outcome="order_created",
        approval_status="auto_approved",
        merchant_id=merchant_id,
    )

    key_id, _, _ = resolve_merchant_credentials(merchant_id)

    return {
        "entry_id": ledger_id,
        "correlation_id": correlation_id,
        "order_id": order_data["id"],
        "razorpay_key_id": key_id,
        "final_amount_paise": final_amount,
        "discount_pct": discount_pct,
        "merchant_id": merchant_id,
    }
