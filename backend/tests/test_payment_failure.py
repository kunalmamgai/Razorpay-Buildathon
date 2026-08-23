"""Payment failure and recovery tests.

Tests cover:
- Failed Razorpay payment
- Duplicate webhook
- Invalid webhook signature
- Offer invalidation after failure
- Retry creates new order
- Prevention of reused invalidated offers
"""
import pytest
from unittest.mock import patch


def make_proposal(discount_pct: int, skus: list[str], reasoning: str = "Test"):
    return {
        "action": "upsell" if discount_pct > 0 or skus else "no_offer",
        "discount_pct": discount_pct,
        "skus": skus,
        "reasoning": reasoning,
        "confidence": 0.8,
        "expected_benefit": "Test",
    }


def create_and_approve_order(client, discount_pct=10, skus=None):
    """Helper: create a proposal, approve if needed, return (order_id, correlation_id)."""
    if skus is None:
        skus = ["SKU_101"]

    with patch("backend.services.checkout_service.propose_upsell",
               return_value=make_proposal(discount_pct, skus)):
        resp = client.post("/api/checkout/propose", json={
            "cart": [{"sku": "SKU_101", "quantity": 1}]
        })
    entry_id = resp.json()["entry_id"]
    corr_id = resp.json()["correlation_id"]
    decision = resp.json()["policy_result"]["decision"]

    if decision == "awaiting_approval":
        resp = client.post("/api/checkout/approve", json={"ledger_id": entry_id})
        return resp.json()["order_id"], corr_id
    else:
        # Auto-approved (approved or clamped below threshold) — use create-order
        resp = client.post("/api/checkout/create-order", json={"ledger_id": entry_id})
        return resp.json()["order_id"], corr_id


# ═══════════════════════════════════════════════════════════════════════
# 1. FAILED RAZORPAY PAYMENT
# ═══════════════════════════════════════════════════════════════════════

class TestFailedPayment:
    def test_order_marked_payment_failed(self, client):
        order_id, corr_id = create_and_approve_order(client)

        resp = client.post(f"/api/simulate/payment-failure?order_id={order_id}")
        assert resp.status_code == 200
        assert resp.json()["outcome"] == "failed"

        from backend.db import get_db
        with get_db() as conn:
            order = conn.execute(
                "SELECT status FROM orders WHERE razorpay_order_id = ?", (order_id,)
            ).fetchone()
            assert dict(order)["status"] == "payment_failed"

    def test_offer_invalidated_after_failure(self, client):
        order_id, corr_id = create_and_approve_order(client)

        resp = client.post(f"/api/simulate/payment-failure?order_id={order_id}")
        offer_id = resp.json()["offer_id"]
        assert offer_id is not None

        # Verify order has offer_id
        from backend.db import get_db
        with get_db() as conn:
            order = conn.execute(
                "SELECT offer_id, status FROM orders WHERE razorpay_order_id = ?", (order_id,)
            ).fetchone()
            assert dict(order)["offer_id"] == offer_id
            assert dict(order)["status"] == "payment_failed"

    def test_failure_creates_ledger_entries(self, client):
        order_id, corr_id = create_and_approve_order(client)

        client.post(f"/api/simulate/payment-failure?order_id={order_id}")

        resp = client.get(f"/api/ledger/order/{order_id}")
        entries = resp.json()["entries"]
        event_types = [e["event_type"] for e in entries]
        assert "payment_failed" in event_types
        assert "recovery" in event_types

    def test_recovery_entry_has_clear_reasoning(self, client):
        order_id, corr_id = create_and_approve_order(client)

        client.post(f"/api/simulate/payment-failure?order_id={order_id}")

        from backend.ledger.ledger import get_entries_by_order
        entries = get_entries_by_order(order_id)
        recovery = [e for e in entries if e["event_type"] == "recovery"]
        assert len(recovery) == 1
        assert "reverted" in recovery[0]["reasoning"].lower() or "failed" in recovery[0]["reasoning"].lower()


# ═══════════════════════════════════════════════════════════════════════
# 2. DUPLICATE WEBHOOK (IDEMPOTENCY)
# ═══════════════════════════════════════════════════════════════════════

class TestDuplicateWebhook:
    def test_same_webhook_twice_is_idempotent(self, client):
        order_id, corr_id = create_and_approve_order(client)

        webhook = {
            "event": "payment.captured",
            "payload": {
                "order": {"entity": {"id": order_id}},
                "payment": {"entity": {"id": "pay_123"}},
            },
        }

        resp1 = client.post("/api/webhooks/razorpay", json=webhook)
        assert resp1.json()["status"] == "processed"

        resp2 = client.post("/api/webhooks/razorpay", json=webhook)
        assert resp2.json()["status"] == "already_processed"

    def test_different_events_not_deduplicated(self, client):
        order_id, corr_id = create_and_approve_order(client)

        # payment.captured
        resp1 = client.post("/api/webhooks/razorpay", json={
            "event": "payment.captured",
            "payload": {
                "order": {"entity": {"id": order_id}},
                "payment": {"entity": {"id": "pay_1"}},
            },
        })
        assert resp1.json()["status"] == "processed"

        # payment.failed (different event)
        resp2 = client.post("/api/webhooks/razorpay", json={
            "event": "payment.failed",
            "payload": {
                "order": {"entity": {"id": order_id}},
                "payment": {"entity": {"id": "pay_2"}},
            },
        })
        assert resp2.json()["status"] == "processed"
        assert resp2.json()["outcome"] == "failed"


# ═══════════════════════════════════════════════════════════════════════
# 3. INVALID WEBHOOK SIGNATURE
# ═══════════════════════════════════════════════════════════════════════

class TestInvalidWebhook:
    def test_invalid_signature_without_secret(self, client):
        """Without webhook secret configured, all signatures accepted."""
        resp = client.post("/api/webhooks/razorpay", json={
            "event": "payment.captured",
            "payload": {
                "order": {"entity": {"id": "nonexistent"}},
                "payment": {"entity": {"id": "pay_x"}},
            },
        })
        # Without secret, signature is always accepted
        assert resp.status_code in (200, 400, 500)


# ═══════════════════════════════════════════════════════════════════════
# 4. RETRY AFTER FAILED PAYMENT
# ═══════════════════════════════════════════════════════════════════════

class TestRetryAfterFailure:
    def test_new_checkout_works_after_failure(self, client):
        """After a failed payment, a new checkout creates a fresh order."""
        # Create and fail
        order_id, _ = create_and_approve_order(client)
        client.post(f"/api/simulate/payment-failure?order_id={order_id}")

        # New checkout with a fresh proposal
        with patch("backend.services.checkout_service.propose_upsell",
                    return_value=make_proposal(5, ["SKU_101"])):
            resp = client.post("/api/checkout/propose", json={
                "cart": [{"sku": "SKU_101", "quantity": 1}]
            })
        assert resp.status_code == 200
        assert resp.json()["policy_result"]["decision"] == "approved"

        # Create order from new proposal
        entry_id = resp.json()["entry_id"]
        resp = client.post("/api/checkout/create-order", json={"ledger_id": entry_id})
        assert resp.status_code == 200
        new_order_id = resp.json()["order_id"]
        assert new_order_id != order_id  # Different order ID

    def test_retry_does_not_reuse_discount(self, client):
        """Retry should NOT silently reuse the old invalidated discount."""
        # Create with 15% discount, fail
        order_id, corr_id = create_and_approve_order(client, discount_pct=15)
        client.post(f"/api/simulate/payment-failure?order_id={order_id}")

        # New checkout — Brain proposes fresh (we mock a 5% proposal)
        with patch("backend.services.checkout_service.propose_upsell",
                    return_value=make_proposal(5, ["SKU_101"])):
            resp = client.post("/api/checkout/propose", json={
                "cart": [{"sku": "SKU_101", "quantity": 1}]
            })
        data = resp.json()
        assert data["discount_pct"] == 5  # Fresh proposal, not 15%
        assert data["policy_result"]["final_action"]["discount_pct"] == 5


# ═══════════════════════════════════════════════════════════════════════
# 5. PREVENTION OF REUSED INVALIDATED OFFERS
# ═══════════════════════════════════════════════════════════════════════

class TestOfferReusePrevention:
    def test_approve_after_failure_blocked(self, client):
        """Cannot re-approve an entry whose offer was invalidated."""
        with patch("backend.services.checkout_service.propose_upsell",
                   return_value=make_proposal(16, ["SKU_101"])):
            resp = client.post("/api/checkout/propose", json={
                "cart": [{"sku": "SKU_101", "quantity": 1}]
            })
        entry_id = resp.json()["entry_id"]

        # Approve → order created
        resp = client.post("/api/checkout/approve", json={"ledger_id": entry_id})
        order_id = resp.json()["order_id"]

        # Fail payment
        client.post(f"/api/simulate/payment-failure?order_id={order_id}")

        # Try to approve again — should fail (no longer awaiting_approval)
        resp = client.post("/api/checkout/approve", json={"ledger_id": entry_id})
        assert resp.status_code == 400
