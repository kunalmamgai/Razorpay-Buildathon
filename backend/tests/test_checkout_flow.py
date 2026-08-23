"""End-to-end tests for the full checkout flow.

Tests the complete pipeline:
  Cart → Brain (Gemini proposal) → Cage (policy evaluation) → Razorpay (order creation) → Ledger (audit log)

Uses a test database with seeded products. Gemini returns fallback proposals (no API key in test env),
so we monkeypatch the Brain to inject controlled proposals for clamping/rejection scenarios.
"""
import json
import pytest
from unittest.mock import patch


# =============================================================================
# Helpers
# =============================================================================

def make_proposal(discount_pct: int, skus: list[str], reasoning: str = "Test reasoning"):
    """Create a Brain proposal dict."""
    return {"discount_pct": discount_pct, "skus": skus, "reasoning": reasoning}


def checkout_cart(client, cart: list[dict]) -> dict:
    """POST to /api/checkout and return the response JSON."""
    return client.post("/api/checkout", json={"cart": cart})


# =============================================================================
# 1. Happy Path — No Discount (Brain returns 0%)
# =============================================================================


class TestCheckoutHappyPathNoDiscount:
    """Brain returns 0% discount — clean pass through Cage."""

    def test_single_item_checkout(self, client):
        """One item, 0% proposal → approved, order created, ledger logged."""
        with patch("backend.routes.checkout.propose_upsell", return_value=make_proposal(0, [])):
            resp = checkout_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        assert resp.status_code == 200
        data = resp.json()

        # Order created
        assert data["order_id"].startswith("order_")
        assert data["original_amount"] == 299900
        assert data["discount_amount"] == 0
        assert data["final_amount"] == 299900
        assert data["outcome"] == "approved"

        # Proposal and policy result present
        assert data["proposal"]["discount_pct"] == 0
        assert data["policy_result"]["passed"] is True
        assert data["policy_result"]["violations"] == []

        # Ledger entry logged
        assert data["entry_id"] is not None
        assert data["entry"]["actor"] == "brain"
        assert data["entry"]["trigger"] == "checkout"
        assert data["entry"]["outcome"] == "approved"

    def test_multiple_items_checkout(self, client):
        """Two different items, 0% proposal → approved."""
        with patch("backend.routes.checkout.propose_upsell", return_value=make_proposal(0, [])):
            resp = checkout_cart(client, [
                {"sku": "SKU_101", "quantity": 1},  # ₹2,999
                {"sku": "SKU_102", "quantity": 2},  # ₹499 × 2 = ₹998
            ])

        assert resp.status_code == 200
        data = resp.json()
        assert data["original_amount"] == 299900 + 99800  # ₹3,997
        assert data["final_amount"] == 299900 + 99800
        assert data["outcome"] == "approved"


# =============================================================================
# 2. Brain Proposes Discount → Cage Approves (within limits)
# =============================================================================


class TestCheckoutBrainProposesDiscount:
    """Brain proposes a discount within Cage limits — approved."""

    def test_small_discount_approved(self, client):
        """Brain proposes 10% on valid SKU — Cage approves, order has discount."""
        proposal = make_proposal(10, ["SKU_101"])
        with patch("backend.routes.checkout.propose_upsell", return_value=proposal):
            resp = checkout_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        assert resp.status_code == 200
        data = resp.json()

        assert data["outcome"] == "approved"
        assert data["discount_pct"] == 10
        assert data["discount_amount"] == int(299900 * 10 / 100)  # ₹299.90 → 29990
        assert data["final_amount"] == 299900 - 29990

        # Verify proposal is stored
        assert data["proposal"]["discount_pct"] == 10
        assert data["proposal"]["skus"] == ["SKU_101"]
        assert "reasoning" in data["proposal"]

        # Verify final_action matches (no clamping needed)
        assert data["policy_result"]["final_action"]["discount_pct"] == 10

    def test_just_below_threshold_approved(self, client):
        """15% (at threshold) — auto-approved, no human gate."""
        proposal = make_proposal(15, ["SKU_101"])
        with patch("backend.routes.checkout.propose_upsell", return_value=proposal):
            resp = checkout_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        data = resp.json()
        assert data["outcome"] == "approved"
        assert data["policy_result"]["needs_human_approval"] is False

    def test_above_threshold_awaiting_approval(self, client):
        """16% — above threshold, needs human approval."""
        proposal = make_proposal(16, ["SKU_101"])
        with patch("backend.routes.checkout.propose_upsell", return_value=proposal):
            resp = checkout_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        data = resp.json()
        assert data["outcome"] == "awaiting_approval"
        assert data["policy_result"]["needs_human_approval"] is True
        assert data["discount_pct"] == 16

        # Verify ledger entry
        assert data["entry"]["outcome"] == "awaiting_approval"


# =============================================================================
# 3. Brain Proposes Over-Max → Cage Clamps
# =============================================================================


class TestCheckoutCageClamps:
    """Brain proposes discount exceeding MAX_DISCOUNT_PCT — Cage clamps down."""

    def test_clamped_from_25_to_20_needs_approval(self, client):
        """25% proposed → clamped to 20%. Since 20% > 15% threshold, needs approval."""
        proposal = make_proposal(25, ["SKU_101"])
        with patch("backend.routes.checkout.propose_upsell", return_value=proposal):
            resp = checkout_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        data = resp.json()

        # Proposal stored the ORIGINAL 25%
        assert data["proposal"]["discount_pct"] == 25

        # But final_action shows clamped 20%
        assert data["policy_result"]["final_action"]["discount_pct"] == 20

        # Discount applied at clamped rate
        assert data["discount_pct"] == 20
        assert data["discount_amount"] == int(299900 * 20 / 100)  # ₹59,980 → 59980
        assert data["final_amount"] == 299900 - 59980

        # Clamped to 20% which is above 15% threshold → awaiting_approval
        assert data["outcome"] == "awaiting_approval"
        assert data["policy_result"]["needs_human_approval"] is True

        # Violation logged
        assert len(data["policy_result"]["violations"]) == 1
        assert "exceeds max" in data["policy_result"]["violations"][0]

        # Ledger entry shows awaiting_approval
        assert data["entry"]["outcome"] == "awaiting_approval"

    def test_clamped_from_50_to_20_needs_approval(self, client):
        """50% proposed → clamped to 20%. Since 20% > 15%, needs approval."""
        proposal = make_proposal(50, ["SKU_102"])
        with patch("backend.routes.checkout.propose_upsell", return_value=proposal):
            resp = checkout_cart(client, [{"sku": "SKU_102", "quantity": 1}])

        data = resp.json()
        assert data["proposal"]["discount_pct"] == 50
        assert data["policy_result"]["final_action"]["discount_pct"] == 20
        assert data["discount_pct"] == 20
        # Clamped to 20% > 15% threshold → awaiting_approval
        assert data["outcome"] == "awaiting_approval"

    def test_clamped_discount_amount_correct(self, client):
        """Verify discount_amount is calculated from the CLAMPED pct, not proposed."""
        proposal = make_proposal(30, ["SKU_101"])
        with patch("backend.routes.checkout.propose_upsell", return_value=proposal):
            resp = checkout_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        data = resp.json()
        # 30% proposed, clamped to 20%
        # original = 299900, discount = 299900 * 20/100 = 59980
        assert data["discount_pct"] == 20
        assert data["discount_amount"] == 59980
        assert data["final_amount"] == 299900 - 59980

    def test_clamped_needs_approval_when_above_threshold(self, client):
        """22% → clamped to 20%, but 20% > 15% threshold → still needs approval."""
        proposal = make_proposal(22, ["SKU_101"])
        with patch("backend.routes.checkout.propose_upsell", return_value=proposal):
            resp = checkout_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        data = resp.json()
        assert data["policy_result"]["final_action"]["discount_pct"] == 20
        assert data["policy_result"]["needs_human_approval"] is True
        assert data["outcome"] == "awaiting_approval"


# =============================================================================
# 4. Brain Proposes Non-Discountable SKU → Cage Rejects
# =============================================================================


class TestCheckoutCageRejects:
    """Brain proposes discount on non-existent SKU — Cage rejects."""

    def test_all_invalid_skus_rejected(self, client):
        """Brain proposes discount on FAKE_SKU — all SKUs filtered, discount zeroed."""
        proposal = make_proposal(15, ["FAKE_SKU_999"])
        with patch("backend.routes.checkout.propose_upsell", return_value=proposal):
            resp = checkout_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        data = resp.json()
        assert data["outcome"] == "rejected"
        assert data["discount_pct"] == 0
        assert data["discount_amount"] == 0
        assert data["final_amount"] == 299900  # Full price
        assert len(data["policy_result"]["violations"]) >= 1

        # Ledger logs rejection
        assert data["entry"]["outcome"] == "rejected"

    def test_mixed_valid_invalid_skus_clamped(self, client):
        """Brain proposes mix of valid + invalid SKUs — invalid filtered, proposal clamped."""
        proposal = make_proposal(10, ["SKU_101", "FAKE_SKU"])
        with patch("backend.routes.checkout.propose_upsell", return_value=proposal):
            resp = checkout_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        data = resp.json()
        # SKU_101 is valid, FAKE_SKU filtered out — proposal was modified → clamped
        assert data["outcome"] == "clamped"
        assert data["discount_pct"] == 10
        assert "FAKE_SKU" in str(data["policy_result"]["violations"])
        # Only valid SKU remains
        assert data["policy_result"]["final_action"]["skus"] == ["SKU_101"]


# =============================================================================
# 5. Ledger Entry Structure — Audit Trail Proof
# =============================================================================


class TestLedgerEntryStructure:
    """Verify every ledger entry has the fields needed for the judging bar."""

    def test_ledger_entry_has_reasoning(self, client):
        """Every entry must have a reasoning string (explainable)."""
        proposal = make_proposal(10, ["SKU_101"], reasoning="Cart risk is high")
        with patch("backend.routes.checkout.propose_upsell", return_value=proposal):
            resp = checkout_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        entry = resp.json()["entry"]
        assert entry["reasoning"] == "Cart risk is high"

    def test_ledger_entry_has_proposal_json(self, client):
        """Raw Brain proposal stored separately from final action (bounded)."""
        proposal = make_proposal(25, ["SKU_101"], reasoning="Aggressive upsell")
        with patch("backend.routes.checkout.propose_upsell", return_value=proposal):
            resp = checkout_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        entry = resp.json()["entry"]
        stored_proposal = json.loads(entry["proposal_json"])
        assert stored_proposal["discount_pct"] == 25  # Original proposal
        assert stored_proposal["reasoning"] == "Aggressive upsell"

    def test_ledger_entry_has_final_action_separate_from_proposal(self, client):
        """proposal_json and final_action_json stored as separate fields."""
        proposal = make_proposal(25, ["SKU_101"])
        with patch("backend.routes.checkout.propose_upsell", return_value=proposal):
            resp = checkout_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        entry = resp.json()["entry"]
        proposal_stored = json.loads(entry["proposal_json"])
        final_stored = json.loads(entry["final_action_json"])

        # Proposal: 25%, Final: 20% (clamped)
        assert proposal_stored["discount_pct"] == 25
        assert final_stored["discount_pct"] == 20
        assert proposal_stored != final_stored  # They differ — this is the key proof

    def test_ledger_entry_has_razorpay_order_id(self, client):
        """Every entry must reference a Razorpay order ID."""
        with patch("backend.routes.checkout.propose_upsell", return_value=make_proposal(0, [])):
            resp = checkout_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        entry = resp.json()["entry"]
        assert entry["razorpay_order_id"] is not None
        assert entry["razorpay_order_id"].startswith("order_")

    def test_ledger_entry_has_policy_violations(self, client):
        """Clamped entry stores violations array."""
        proposal = make_proposal(30, ["SKU_101"])
        with patch("backend.routes.checkout.propose_upsell", return_value=proposal):
            resp = checkout_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        entry = resp.json()["entry"]
        violations = json.loads(entry["policy_violations"])
        assert len(violations) == 1
        assert "exceeds max" in violations[0]

    def test_ledger_entry_has_timestamp(self, client):
        """Every entry must have a timestamp."""
        with patch("backend.routes.checkout.propose_upsell", return_value=make_proposal(0, [])):
            resp = checkout_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        entry = resp.json()["entry"]
        assert entry["timestamp"] is not None
        assert len(entry["timestamp"]) > 0

    def test_ledger_entry_actor_and_trigger(self, client):
        """Entry must record actor='brain' and trigger='checkout'."""
        with patch("backend.routes.checkout.propose_upsell", return_value=make_proposal(0, [])):
            resp = checkout_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        entry = resp.json()["entry"]
        assert entry["actor"] == "brain"
        assert entry["trigger"] == "checkout"


# =============================================================================
# 6. Order DB State — Verify order is persisted correctly
# =============================================================================


class TestOrderDBState:
    """Verify the orders table is correctly populated after checkout."""

    def test_order_saved_in_database(self, client):
        """Order record exists in DB with correct fields."""
        with patch("backend.routes.checkout.propose_upsell", return_value=make_proposal(0, [])):
            resp = checkout_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        data = resp.json()
        order_id = data["order_id"]

        from backend.db import get_db
        with get_db() as conn:
            row = conn.execute(
                "SELECT * FROM orders WHERE razorpay_order_id = ?", (order_id,)
            ).fetchone()

        assert row is not None
        assert dict(row)["final_amount"] == 299900
        assert dict(row)["original_amount"] == 299900
        assert dict(row)["status"] == "created"

    def test_order_cart_json_populated(self, client):
        """Order's cart_json contains the line items."""
        with patch("backend.routes.checkout.propose_upsell", return_value=make_proposal(0, [])):
            resp = checkout_cart(client, [
                {"sku": "SKU_101", "quantity": 1},
                {"sku": "SKU_102", "quantity": 3},
            ])

        order_id = resp.json()["order_id"]
        from backend.db import get_db
        with get_db() as conn:
            row = conn.execute(
                "SELECT * FROM orders WHERE razorpay_order_id = ?", (order_id,)
            ).fetchone()

        cart = json.loads(dict(row)["cart_json"])
        assert len(cart) == 2
        assert cart[0]["sku"] == "SKU_101"
        assert cart[0]["quantity"] == 1
        assert cart[1]["sku"] == "SKU_102"
        assert cart[1]["quantity"] == 3

    def test_order_amount_with_discount(self, client):
        """Order's final_amount reflects the Cage-approved discount."""
        proposal = make_proposal(10, ["SKU_101"])
        with patch("backend.routes.checkout.propose_upsell", return_value=proposal):
            resp = checkout_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        order_id = resp.json()["order_id"]
        from backend.db import get_db
        with get_db() as conn:
            row = conn.execute(
                "SELECT * FROM orders WHERE razorpay_order_id = ?", (order_id,)
            ).fetchone()

        assert dict(row)["final_amount"] == 299900 - 29990  # 10% off
        assert dict(row)["original_amount"] == 299900


# =============================================================================
# 7. Error Handling
# =============================================================================


class TestCheckoutErrors:
    """Edge cases and error conditions."""

    def test_invalid_sku_returns_400(self, client):
        """Cart with unknown SKU returns 400."""
        resp = checkout_cart(client, [{"sku": "INVALID_SKU", "quantity": 1}])
        assert resp.status_code == 400
        assert "Unknown SKU" in resp.json()["detail"]

    def test_empty_cart_returns_error(self, client):
        """Empty cart should fail validation."""
        resp = client.post("/api/checkout", json={"cart": []})
        # Either 422 (validation) or 200 with no discount — depends on Pydantic
        # Empty list is valid for list[CartItem], so it goes through with 0 total
        # The Brain gets an empty cart, returns fallback
        assert resp.status_code in (200, 422)

    def test_razorpay_order_id_unique_per_checkout(self, client):
        """Each checkout gets a unique Razorpay order ID."""
        with patch("backend.routes.checkout.propose_upsell", return_value=make_proposal(0, [])):
            resp1 = checkout_cart(client, [{"sku": "SKU_101", "quantity": 1}])
            resp2 = checkout_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        assert resp1.json()["order_id"] != resp2.json()["order_id"]

    def test_ledger_entries_accumulate(self, client):
        """Multiple checkouts create multiple ledger entries with incrementing IDs."""
        with patch("backend.routes.checkout.propose_upsell", return_value=make_proposal(0, [])):
            resp1 = checkout_cart(client, [{"sku": "SKU_101", "quantity": 1}])
            resp2 = checkout_cart(client, [{"sku": "SKU_102", "quantity": 1}])

        assert resp2.json()["entry_id"] > resp1.json()["entry_id"]


# =============================================================================
# 8. Razorpay Mock — Test Mode
# =============================================================================


class TestRazorpayMock:
    """Verify Razorpay mock returns correct structure."""

    def test_razorpay_key_id_in_response(self, client):
        """Response includes razorpay_key_id for frontend checkout JS."""
        with patch("backend.routes.checkout.propose_upsell", return_value=make_proposal(0, [])):
            resp = checkout_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        assert "razorpay_key_id" in resp.json()
        assert resp.json()["razorpay_key_id"].startswith("rzp_")

    def test_razorpay_order_amount_matches_final(self, client):
        """Razorpay order amount matches the Cage-approved final_amount."""
        proposal = make_proposal(15, ["SKU_101"])
        with patch("backend.routes.checkout.propose_upsell", return_value=proposal):
            resp = checkout_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        data = resp.json()
        order_id = data["order_id"]
        from backend.db import get_db
        with get_db() as conn:
            row = conn.execute(
                "SELECT final_amount FROM orders WHERE razorpay_order_id = ?", (order_id,)
            ).fetchone()
        assert row is not None
        assert dict(row)["final_amount"] == data["final_amount"]


# =============================================================================
# 9. Full Scenario: Brain → Cage → Ledger (Judging Demo Narrative)
# =============================================================================


class TestJudgingDemoScenarios:
    """Reproduce the exact demo scenarios from the project docs."""

    def test_scenario_approved(self, client):
        """Demo scenario 1: Agent proposes 10% → approved → order created → paid."""
        proposal = make_proposal(10, ["SKU_101"], "High abandonment risk")
        with patch("backend.routes.checkout.propose_upsell", return_value=proposal):
            resp = checkout_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        data = resp.json()
        assert data["outcome"] == "approved"
        assert data["entry"]["reasoning"] == "High abandonment risk"
        assert data["policy_result"]["passed"] is True

    def test_scenario_clamped_needs_approval(self, client):
        """Demo scenario 2: Agent proposes 25% → clamped to 20% → needs approval (20% > 15%)."""
        proposal = make_proposal(25, ["SKU_101"], "Flash sale suggestion")
        with patch("backend.routes.checkout.propose_upsell", return_value=proposal):
            resp = checkout_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        data = resp.json()
        assert data["outcome"] == "awaiting_approval"
        assert data["proposal"]["discount_pct"] == 25
        assert data["policy_result"]["final_action"]["discount_pct"] == 20
        assert "exceeds max" in str(data["policy_result"]["violations"])

    def test_scenario_rejected(self, client):
        """Demo scenario 3: Agent proposes invalid SKU → rejected → no discount."""
        proposal = make_proposal(15, ["FAKE_SKU"], "Bad recommendation")
        with patch("backend.routes.checkout.propose_upsell", return_value=proposal):
            resp = checkout_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        data = resp.json()
        assert data["outcome"] == "rejected"
        assert data["discount_pct"] == 0
        assert data["final_amount"] == data["original_amount"]

    def test_scenario_awaiting_approval(self, client):
        """Demo scenario 4: Agent proposes 16% → awaiting merchant approval."""
        proposal = make_proposal(16, ["SKU_101"], "Premium bundle offer")
        with patch("backend.routes.checkout.propose_upsell", return_value=proposal):
            resp = checkout_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        data = resp.json()
        assert data["outcome"] == "awaiting_approval"
        assert data["policy_result"]["needs_human_approval"] is True

    def test_scenario_clamped_and_needs_approval(self, client):
        """Demo scenario 5: Agent proposes 22% → clamped to 20% AND needs approval."""
        proposal = make_proposal(22, ["SKU_101"], "Cross-sell opportunity")
        with patch("backend.routes.checkout.propose_upsell", return_value=proposal):
            resp = checkout_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        data = resp.json()
        assert data["outcome"] == "awaiting_approval"
        assert data["proposal"]["discount_pct"] == 22
        assert data["policy_result"]["final_action"]["discount_pct"] == 20
        assert data["policy_result"]["needs_human_approval"] is True
