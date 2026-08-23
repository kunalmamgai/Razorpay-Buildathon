"""Checkout service — orchestrates the Brain → Cage → Razorpay pipeline.

This is the core business logic that the checkout routes delegate to.
It keeps routes thin and logic testable.
"""
import json
import uuid
import logging
from typing import Optional

from backend.db import get_db
from backend.brain.gemini_agent import propose_upsell
from backend.cage.policy_engine import evaluate_upsell_proposal, calculate_final_amount
from backend.ledger.ledger import log_entry, get_entry_by_id
from backend.razorpay_client import create_order

logger = logging.getLogger(__name__)


def get_catalog() -> list[dict]:
    """Fetch all products from the database."""
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM products").fetchall()
        return [dict(row) for row in rows]


def propose_checkout(cart: list[dict], idempotency_key: str | None = None) -> dict:
    """Step 1: Brain proposes → Cage evaluates → store pending result.

    Does NOT create a Razorpay order yet. Returns the proposal and
    policy result for the frontend to display.
    """
    if idempotency_key is None:
        idempotency_key = f"idem_{uuid.uuid4().hex[:16]}"

    correlation_id = f"corr_{uuid.uuid4().hex[:12]}"

    catalog = get_catalog()
    catalog_map = {p["id"]: p for p in catalog}

    # Build cart detail with authoritative prices from DB
    cart_detail = []
    original_total = 0
    for item in cart:
        product = catalog_map.get(item["sku"])
        if not product:
            raise ValueError(f"Unknown SKU: {item['sku']}")
        line_total = product["price"] * item.get("quantity", 1)
        cart_detail.append({
            "sku": item["sku"],
            "name": product["name"],
            "price": product["price"],
            "quantity": item.get("quantity", 1),
            "line_total": line_total,
        })
        original_total += line_total

    # Brain proposes
    proposal = propose_upsell(cart_detail, catalog)

    # Cage evaluates
    policy_result = evaluate_upsell_proposal(proposal, catalog)

    # Calculate amounts server-side (NEVER trust frontend)
    final_action = policy_result.get("final_action", {})
    amounts = calculate_final_amount(cart, final_action, catalog)

    # Determine outcome
    decision = policy_result["decision"]

    # Log the proposal to ledger
    entry_id = log_entry(
        correlation_id=correlation_id,
        event_type="checkout_proposal",
        actor="brain",
        trigger="checkout",
        proposal=proposal,
        reasoning=proposal.get("reasoning", ""),
        policy_result=policy_result,
        idempotency_key=idempotency_key,
        outcome=decision,
    )

    return {
        "entry_id": entry_id,
        "correlation_id": correlation_id,
        "proposal": proposal,
        "policy_result": policy_result,
        "original_amount_paise": amounts["original_amount_paise"],
        "final_amount_paise": amounts["final_amount_paise"],
        "discount_amount_paise": amounts["discount_amount_paise"],
        "discount_pct": amounts["discount_pct"],
        "razorpay_key_id": None,  # Only provided when creating order
        "idempotency_key": idempotency_key,
    }


def approve_checkout(ledger_id: int) -> dict:
    """Step 2: Merchant approves a pending proposal.

    Updates the ledger entry and creates the Razorpay order.
    A proposal requiring approval MUST NOT create a Razorpay order until this succeeds.
    """
    entry = get_entry_by_id(ledger_id)
    if not entry:
        raise ValueError(f"Ledger entry {ledger_id} not found")

    if entry["outcome"] != "awaiting_approval":
        raise ValueError(f"Entry {ledger_id} is not awaiting approval (current: {entry['outcome']})")

    # Check if already approved (idempotency guard)
    if entry.get("approval_status") == "approved":
        raise ValueError(f"Entry {ledger_id} has already been approved")

    # Update ledger with approval
    from backend.ledger.ledger import update_approval
    update_approval(ledger_id, "approved", "merchant")

    # Now create the Razorpay order
    final_action = json.loads(entry["final_action_json"]) if entry["final_action_json"] else {}
    proposal = json.loads(entry["proposal_json"]) if entry["proposal_json"] else {}
    correlation_id = entry["correlation_id"]

    # Rebuild cart from proposal SKUs (for amount calculation)
    # We need to look up prices from catalog
    catalog = get_catalog()
    catalog_map = {p["id"]: p for p in catalog}

    cart_skus = final_action.get("skus", proposal.get("skus", []))
    discount_pct = final_action.get("discount_pct", 0)

    # Calculate amount from catalog prices
    original_total = 0
    for sku in cart_skus:
        product = catalog_map.get(sku)
        if product:
            original_total += product["price"]  # 1 unit each for simplicity
    # If no SKU prices, use a fallback from the original proposal
    if original_total == 0:
        original_total = 100000  # ₹1,000 fallback

    discount_amount = int(original_total * discount_pct / 100)
    final_amount = original_total - discount_amount
    if final_amount <= 0:
        final_amount = original_total
        discount_amount = 0
        discount_pct = 0

    # Check for reused invalidated offers
    offer_id = f"offer_{correlation_id}"
    with get_db() as conn:
        existing = conn.execute(
            "SELECT status FROM orders WHERE offer_id = ?", (offer_id,)
        ).fetchone()
        if existing and dict(existing)["status"] == "payment_failed":
            raise ValueError(
                f"Offer {offer_id} was invalidated after payment failure. "
                "Please create a new checkout."
            )

    # Create Razorpay order
    idempotency_key = entry.get("idempotency_key") or f"idem_{uuid.uuid4().hex[:16]}"
    order_data = create_order(
        final_amount,
        idempotency_key=idempotency_key,
        notes={
            "correlation_id": correlation_id,
            "offer_id": offer_id,
            "discount_pct": str(discount_pct),
        },
    )

    # Store order in DB
    with get_db() as conn:
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

    # Log order creation to ledger
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
    )

    return {
        "entry_id": ledger_id,
        "correlation_id": correlation_id,
        "order_id": order_data["id"],
        "razorpay_key_id": order_data.get("id", "")[:3] if not order_data["id"].startswith("order_test_") else "rzp_test_demo",
        "final_amount_paise": final_amount,
        "discount_pct": discount_pct,
    }


def create_order_from_proposal(ledger_id: int, idempotency_key: str | None = None) -> dict:
    """Step 3: Create Razorpay order for auto-approved proposals.

    For proposals that don't need approval (decision == "approved" or "clamped"),
    create the order directly.
    """
    entry = get_entry_by_id(ledger_id)
    if not entry:
        raise ValueError(f"Ledger entry {ledger_id} not found")

    if entry["outcome"] not in ("approved", "clamped"):
        raise ValueError(
            f"Entry {ledger_id} cannot create order (current: {entry['outcome']}). "
            "Only approved or clamped proposals can proceed."
        )

    correlation_id = entry["correlation_id"]
    final_action = json.loads(entry["final_action_json"]) if entry["final_action_json"] else {}
    proposal = json.loads(entry["proposal_json"]) if entry["proposal_json"] else {}

    catalog = get_catalog()
    catalog_map = {p["id"]: p for p in catalog}

    cart_skus = final_action.get("skus", proposal.get("skus", []))
    discount_pct = final_action.get("discount_pct", 0)

    original_total = 0
    for sku in cart_skus:
        product = catalog_map.get(sku)
        if product:
            original_total += product["price"]
    if original_total == 0:
        original_total = 100000

    discount_amount = int(original_total * discount_pct / 100)
    final_amount = original_total - discount_amount
    if final_amount <= 0:
        final_amount = original_total
        discount_amount = 0
        discount_pct = 0

    offer_id = f"offer_{correlation_id}"
    if idempotency_key is None:
        idempotency_key = entry.get("idempotency_key") or f"idem_{uuid.uuid4().hex[:16]}"

    order_data = create_order(
        final_amount,
        idempotency_key=idempotency_key,
        notes={
            "correlation_id": correlation_id,
            "offer_id": offer_id,
            "discount_pct": str(discount_pct),
        },
    )

    with get_db() as conn:
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
    )

    return {
        "entry_id": ledger_id,
        "correlation_id": correlation_id,
        "order_id": order_data["id"],
        "razorpay_key_id": "rzp_test_demo",
        "final_amount_paise": final_amount,
        "discount_pct": discount_pct,
    }
