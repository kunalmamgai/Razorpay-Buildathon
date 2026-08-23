"""Tests for the order lifecycle endpoint — powers the FailureRecoveryView."""
import json
import pytest
from unittest.mock import patch


def make_proposal(discount_pct, skus, reasoning="Test"):
    return {"discount_pct": discount_pct, "skus": skus, "reasoning": reasoning}


class TestOrderLifecycleEndpoint:
    """GET /api/ledger/order/{order_id} returns all entries for an order."""

    def test_checkout_creates_lifecycle_entry(self, client):
        """A checkout creates at least one ledger entry for the order."""
        with patch("backend.routes.checkout.propose_upsell", return_value=make_proposal(0, [])):
            resp = client.post("/api/checkout", json={"cart": [{"sku": "SKU_101", "quantity": 1}]})

        order_id = resp.json()["order_id"]

        # Fetch lifecycle
        lifecycle = client.get(f"/api/ledger/order/{order_id}").json()
        assert lifecycle["order_id"] == order_id
        assert lifecycle["count"] >= 1
        assert lifecycle["entries"][0]["razorpay_order_id"] == order_id

    def test_simulate_failure_adds_recovery_entries(self, client):
        """Simulating a failure adds failed + reverted entries to the lifecycle."""
        with patch("backend.routes.checkout.propose_upsell", return_value=make_proposal(0, [])):
            resp = client.post("/api/checkout", json={"cart": [{"sku": "SKU_101", "quantity": 1}]})

        order_id = resp.json()["order_id"]

        # Simulate failure
        client.post(f"/api/simulate/payment-failure?order_id={order_id}")

        # Fetch lifecycle
        lifecycle = client.get(f"/api/ledger/order/{order_id}").json()
        assert lifecycle["count"] >= 3  # checkout + failed + reverted

        outcomes = [e["outcome"] for e in lifecycle["entries"]]
        assert "failed" in outcomes
        assert "reverted" in outcomes

    def test_lifecycle_entries_ordered_chronologically(self, client):
        """Entries should be in chronological order (ASC by id)."""
        with patch("backend.routes.checkout.propose_upsell", return_value=make_proposal(0, [])):
            resp = client.post("/api/checkout", json={"cart": [{"sku": "SKU_101", "quantity": 1}]})

        order_id = resp.json()["order_id"]
        client.post(f"/api/simulate/payment-failure?order_id={order_id}")

        lifecycle = client.get(f"/api/ledger/order/{order_id}").json()
        ids = [e["id"] for e in lifecycle["entries"]]
        assert ids == sorted(ids)  # Chronological order

    def test_nonexistent_order_returns_empty(self, client):
        """Order with no entries returns empty list."""
        lifecycle = client.get("/api/ledger/order/order_nonexistent").json()
        assert lifecycle["count"] == 0
        assert lifecycle["entries"] == []

    def test_full_failure_lifecycle_structure(self, client):
        """Each entry in the lifecycle has the fields needed by the frontend stepper."""
        with patch("backend.routes.checkout.propose_upsell", return_value=make_proposal(10, ["SKU_101"], "Test reasoning")):
            resp = client.post("/api/checkout", json={"cart": [{"sku": "SKU_101", "quantity": 1}]})

        order_id = resp.json()["order_id"]
        client.post(f"/api/simulate/payment-failure?order_id={order_id}")

        lifecycle = client.get(f"/api/ledger/order/{order_id}").json()

        for entry in lifecycle["entries"]:
            assert "id" in entry
            assert "timestamp" in entry
            assert "actor" in entry
            assert "trigger" in entry
            assert "outcome" in entry
            # Checkout entry has proposal data
            if entry["trigger"] == "checkout":
                assert entry["proposal_json"] is not None
                assert entry["reasoning"] == "Test reasoning"
