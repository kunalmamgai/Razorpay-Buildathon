"""Checkout route — cart -> Brain -> Cage -> Razorpay order -> Ledger."""
import json
import os
from fastapi import APIRouter, HTTPException
from backend.models import CheckoutRequest
from backend.brain.gemini_agent import propose_upsell
from backend.cage.policy_engine import evaluate_upsell_proposal
from backend.ledger.ledger import log_entry, get_entry_by_id
from backend.razorpay_client import create_order
from backend.db import get_db

router = APIRouter(prefix="/api", tags=["checkout"])


def get_catalog() -> list[dict]:
    """Fetch all products from DB."""
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM products").fetchall()
        return [dict(row) for row in rows]


@router.post("/checkout")
def checkout(req: CheckoutRequest):
    """Full checkout flow: Brain proposes -> Cage evaluates -> Order created -> Ledger logged."""
    catalog = get_catalog()
    catalog_map = {p["id"]: p for p in catalog}

    cart_detail = []
    original_total = 0
    for item in req.cart:
        product = catalog_map.get(item.sku)
        if not product:
            raise HTTPException(status_code=400, detail=f"Unknown SKU: {item.sku}")
        line_total = product["price"] * item.quantity
        cart_detail.append({
            "sku": item.sku,
            "name": product["name"],
            "price": product["price"],
            "quantity": item.quantity,
            "line_total": line_total,
        })
        original_total += line_total

    proposal = propose_upsell(cart_detail, catalog)
    policy_result = evaluate_upsell_proposal(proposal)

    discount_pct = policy_result["final_action"]["discount_pct"]
    discount_amount = int(original_total * discount_pct / 100)
    final_amount = original_total - discount_amount

    # Determine outcome based on the final action after clamping
    final_skus = policy_result["final_action"].get("skus", [])
    final_discount = policy_result["final_action"].get("discount_pct", 0)

    if not policy_result["passed"]:
        # There were violations — check if the clamped result is still usable
        if final_skus and final_discount > 0:
            # Proposal was clamped but still has valid SKUs and discount
            if policy_result["needs_human_approval"]:
                outcome = "awaiting_approval"
            else:
                outcome = "clamped"
        else:
            # All SKUs filtered out or discount zeroed — truly rejected
            outcome = "rejected"
            final_amount = original_total
            discount_pct = 0
            discount_amount = 0
    elif policy_result["needs_human_approval"]:
        outcome = "awaiting_approval"
    else:
        if final_discount > 0:
            outcome = "approved"
        else:
            outcome = "approved"

    order_data = create_order(
        final_amount,
        notes={"marlin_proposal": json.dumps(proposal), "marlin_outcome": outcome},
    )

    with get_db() as conn:
        conn.execute(
            """INSERT INTO orders (id, razorpay_order_id, cart_json, final_amount,
               original_amount, status) VALUES (?, ?, ?, ?, ?, ?)""",
            (order_data["id"], order_data["id"], json.dumps(cart_detail),
             final_amount, original_total, "created"),
        )

    entry_id = log_entry(
        actor="brain",
        trigger="checkout",
        proposal=proposal,
        reasoning=proposal.get("reasoning", ""),
        policy_result=policy_result,
        razorpay_order_id=order_data["id"],
        outcome=outcome,
    )

    entry = get_entry_by_id(entry_id)

    return {
        "entry_id": entry_id,
        "order_id": order_data["id"],
        "razorpay_key_id": os.getenv("RAZORPAY_KEY_ID", "rzp_test_demo"),
        "original_amount": original_total,
        "discount_amount": discount_amount,
        "discount_pct": discount_pct,
        "final_amount": final_amount,
        "outcome": outcome,
        "proposal": proposal,
        "policy_result": policy_result,
        "entry": entry,
    }
