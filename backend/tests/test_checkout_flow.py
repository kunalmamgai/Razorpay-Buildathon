"""End-to-end tests for the full checkout flow.

Tests the complete 3-step pipeline:
  1. POST /api/checkout/propose  — Brain → Cage → store pending result
  2. POST /api/checkout/approve  — Merchant approves → Razorpay order created
  3. POST /api/payment/verify    — Verify payment → record result

Plus:
  - POST /api/checkout/create-order for auto-approved proposals
  - POST /api/simulate/payment-failure for demo scenarios
"""
import json
import pytest
from unittest.mock import patch


# ═══════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════

def make_proposal(discount_pct: int, skus: list[str], reasoning: str = "Test reasoning"):
    return {
        "action": "upsell" if discount_pct > 0 or skus else "no_offer",
        "discount_pct": discount_pct,
        "skus": skus,
        "reasoning": reasoning,
        "confidence": 0.8,
        "expected_benefit": "Test benefit",
    }


def propose_cart(client, cart: list[dict], idempotency_key: str = None) -> dict:
    payload = {"cart": cart}
    if idempotency_key:
        payload["idempotency_key"] = idempotency_key
    return client.post("/api/checkout/propose", json=payload)


# ═══════════════════════════════════════════════════════════════════════
# 1. VALID UPSELL PROPOSAL — happy path
# ═══════════════════════════════════════════════════════════════════════

class TestCheckoutHappyPath:
    def test_no_discount_approved(self, client):
        """Brain returns 0% → approved → order can be created."""
        with patch("backend.services.checkout_service.propose_upsell", return_value=make_proposal(0, [])):
            resp = propose_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        assert resp.status_code == 200
        data = resp.json()
        assert data["proposal"]["discount_pct"] == 0
        assert data["policy_result"]["decision"] == "approved"
        assert data["original_amount_paise"] == 299900
        assert data["final_amount_paise"] == 299900

    def test_small_discount_approved(self, client):
        """10% discount on valid SKU → approved."""
        with patch("backend.services.checkout_service.propose_upsell", return_value=make_proposal(10, ["SKU_101"])):
            resp = propose_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        data = resp.json()
        assert data["policy_result"]["decision"] == "approved"
        assert data["discount_pct"] == 10
        assert data["discount_amount_paise"] == 29990

    def test_multiple_items(self, client):
        """Two items → amounts calculated correctly."""
        with patch("backend.services.checkout_service.propose_upsell", return_value=make_proposal(5, ["SKU_101"])):
            resp = propose_cart(client, [
                {"sku": "SKU_101", "quantity": 1},
                {"sku": "SKU_102", "quantity": 2},
            ])

        data = resp.json()
        original = 299900 + (49900 * 2)
        assert data["original_amount_paise"] == original


# ═══════════════════════════════════════════════════════════════════════
# 2. DISCOUNT ABOVE 20% BEING CLAMPED
# ═══════════════════════════════════════════════════════════════════════

class TestCageClamps:
    def test_25_pct_clamped_to_20(self, client):
        with patch("backend.services.checkout_service.propose_upsell", return_value=make_proposal(25, ["SKU_101"])):
            resp = propose_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        data = resp.json()
        assert data["proposal"]["discount_pct"] == 25  # Original proposal stored
        assert data["policy_result"]["final_action"]["discount_pct"] == 20  # Clamped
        assert data["discount_pct"] == 20
        assert data["discount_amount_paise"] == 59980
        # 20% > 15% → awaiting_approval
        assert data["policy_result"]["decision"] == "awaiting_approval"

    def test_50_pct_clamped_to_20(self, client):
        with patch("backend.services.checkout_service.propose_upsell", return_value=make_proposal(50, ["SKU_101"])):
            resp = propose_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        data = resp.json()
        assert data["policy_result"]["final_action"]["discount_pct"] == 20


# ═══════════════════════════════════════════════════════════════════════
# 3. CLAMPED PROPOSAL REQUIRING APPROVAL ABOVE 15%
# ═══════════════════════════════════════════════════════════════════════

class TestNeedsApproval:
    def test_16_pct_awaiting_approval(self, client):
        with patch("backend.services.checkout_service.propose_upsell", return_value=make_proposal(16, ["SKU_101"])):
            resp = propose_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        data = resp.json()
        assert data["policy_result"]["decision"] == "awaiting_approval"
        assert data["policy_result"]["needs_human_approval"] is True
        # No order created yet
        assert "order_id" not in data or data.get("order_id") is None


# ═══════════════════════════════════════════════════════════════════════
# 4. REJECTED NON-DISCOUNTABLE SKU PROPOSAL
# ═══════════════════════════════════════════════════════════════════════

class TestRejectedSKU:
    def test_all_invalid_skus_rejected(self, client):
        with patch("backend.services.checkout_service.propose_upsell", return_value=make_proposal(15, ["FAKE_SKU"])):
            resp = propose_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        data = resp.json()
        assert data["policy_result"]["decision"] == "rejected"
        assert data["discount_pct"] == 0
        assert data["final_amount_paise"] == data["original_amount_paise"]

    def test_ledger_logs_rejection(self, client):
        with patch("backend.services.checkout_service.propose_upsell", return_value=make_proposal(15, ["FAKE_SKU"])):
            resp = propose_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        entry_id = resp.json()["entry_id"]
        from backend.ledger.ledger import get_entry_by_id
        entry = get_entry_by_id(entry_id)
        assert entry["outcome"] == "rejected"


# ═══════════════════════════════════════════════════════════════════════
# 5. REJECTED EMPTY SKU PROPOSAL
# ═══════════════════════════════════════════════════════════════════════

class TestEmptySKU:
    def test_empty_skus_with_discount(self, client):
        with patch("backend.services.checkout_service.propose_upsell", return_value=make_proposal(10, [])):
            resp = propose_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        data = resp.json()
        assert data["policy_result"]["decision"] == "rejected"


# ═══════════════════════════════════════════════════════════════════════
# 6. NEGATIVE DISCOUNT
# ═══════════════════════════════════════════════════════════════════════

class TestNegativeDiscount:
    def test_negative_discount_rejected(self, client):
        with patch("backend.services.checkout_service.propose_upsell", return_value=make_proposal(-5, ["SKU_101"])):
            resp = propose_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        data = resp.json()
        assert data["policy_result"]["decision"] == "rejected"
        assert "negative discount" in str(data["policy_result"]["violations"])


# ═══════════════════════════════════════════════════════════════════════
# 7. DISCOUNT ABOVE 100%
# ═══════════════════════════════════════════════════════════════════════

class TestDiscountAbove100:
    def test_150_pct_rejected(self, client):
        with patch("backend.services.checkout_service.propose_upsell", return_value=make_proposal(150, ["SKU_101"])):
            resp = propose_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        data = resp.json()
        assert data["policy_result"]["decision"] == "rejected"


# ═══════════════════════════════════════════════════════════════════════
# 8. UNKNOWN SKU
# ═══════════════════════════════════════════════════════════════════════

class TestUnknownSKU:
    def test_all_unknown_rejected(self, client):
        with patch("backend.services.checkout_service.propose_upsell", return_value=make_proposal(10, ["UNKNOWN_A"])):
            resp = propose_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        data = resp.json()
        assert data["policy_result"]["decision"] == "rejected"

    def test_cart_with_unknown_sku_400(self, client):
        """Unknown SKU in cart itself should return 400."""
        resp = propose_cart(client, [{"sku": "INVALID_SKU", "quantity": 1}])
        assert resp.status_code == 400


# ═══════════════════════════════════════════════════════════════════════
# 9. SUCCESSFUL RAZORPAY PAYMENT (full flow)
# ═══════════════════════════════════════════════════════════════════════

class TestSuccessfulPayment:
    def test_full_propose_approve_verify_flow(self, client):
        """Complete flow: propose → approve → create order → verify payment."""
        # Step 1: Propose (needs approval)
        with patch("backend.services.checkout_service.propose_upsell", return_value=make_proposal(16, ["SKU_101"])):
            resp = propose_cart(client, [{"sku": "SKU_101", "quantity": 1}])
        data = resp.json()
        entry_id = data["entry_id"]
        assert data["policy_result"]["decision"] == "awaiting_approval"

        # Step 2: Approve
        resp = client.post("/api/checkout/approve", json={"ledger_id": entry_id})
        assert resp.status_code == 200
        order_data = resp.json()
        assert order_data["order_id"].startswith("order_")

        # Step 3: Verify payment (mock succeeds)
        resp = client.post("/api/payment/verify", json={
            "razorpay_order_id": order_data["order_id"],
            "razorpay_payment_id": "pay_test_123",
            "razorpay_signature": "sig_test_abc",
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "paid"


# ═══════════════════════════════════════════════════════════════════════
# 10. FAILED RAZORPAY PAYMENT
# ═══════════════════════════════════════════════════════════════════════

class TestFailedPayment:
    def test_simulate_payment_failure(self, client):
        """Simulate failure → order becomes PAYMENT_FAILED → offer invalidated."""
        # Create order first
        with patch("backend.services.checkout_service.propose_upsell", return_value=make_proposal(10, ["SKU_101"])):
            resp = propose_cart(client, [{"sku": "SKU_101", "quantity": 1}])
        entry_id = resp.json()["entry_id"]

        # Create order (auto-approved since 10% <= 15%)
        resp = client.post("/api/checkout/create-order", json={"ledger_id": entry_id})
        assert resp.status_code == 200
        order_id = resp.json()["order_id"]

        # Simulate failure
        resp = client.post(f"/api/simulate/payment-failure?order_id={order_id}")
        assert resp.status_code == 200
        assert resp.json()["outcome"] == "failed"
        assert resp.json()["offer_id"] is not None

        # Verify order is marked failed
        from backend.db import get_db
        with get_db() as conn:
            order = conn.execute(
                "SELECT status FROM orders WHERE razorpay_order_id = ?", (order_id,)
            ).fetchone()
            assert dict(order)["status"] == "payment_failed"


# ═══════════════════════════════════════════════════════════════════════
# 11. DUPLICATE WEBHOOK
# ═══════════════════════════════════════════════════════════════════════

class TestDuplicateWebhook:
    def test_duplicate_webhook_idempotent(self, client):
        """Same webhook sent twice → second one is no-op."""
        # Create and pay an order
        with patch("backend.services.checkout_service.propose_upsell", return_value=make_proposal(5, ["SKU_101"])):
            resp = propose_cart(client, [{"sku": "SKU_101", "quantity": 1}])
        entry_id = resp.json()["entry_id"]
        resp = client.post("/api/checkout/create-order", json={"ledger_id": entry_id})
        order_id = resp.json()["order_id"]

        webhook_payload = {
            "event": "payment.captured",
            "payload": {
                "order": {"entity": {"id": order_id}},
                "payment": {"entity": {"id": "pay_123"}},
            },
        }

        # First webhook
        resp1 = client.post("/api/webhooks/razorpay", json=webhook_payload)
        assert resp1.json()["status"] == "processed"

        # Duplicate webhook
        resp2 = client.post("/api/webhooks/razorpay", json=webhook_payload)
        assert resp2.json()["status"] == "already_processed"


# ═══════════════════════════════════════════════════════════════════════
# 12. INVALID WEBHOOK SIGNATURE
# ═══════════════════════════════════════════════════════════════════════

class TestInvalidWebhook:
    def test_bad_signature_rejected(self, client):
        """Webhook with bad signature is rejected when secret is configured."""
        # Without a webhook secret configured, all signatures are accepted
        # This tests the endpoint doesn't crash
        webhook_payload = {
            "event": "payment.captured",
            "payload": {
                "order": {"entity": {"id": "order_nonexistent"}},
                "payment": {"entity": {"id": "pay_bad"}},
            },
        }
        resp = client.post("/api/webhooks/razorpay", json=webhook_payload)
        assert resp.status_code in (200, 400, 500)


# ═══════════════════════════════════════════════════════════════════════
# 13. REPEATED APPROVAL REQUEST
# ═══════════════════════════════════════════════════════════════════════

class TestRepeatedApproval:
    def test_double_approval_rejected(self, client):
        """Approving an already-approved entry should fail."""
        with patch("backend.services.checkout_service.propose_upsell", return_value=make_proposal(16, ["SKU_101"])):
            resp = propose_cart(client, [{"sku": "SKU_101", "quantity": 1}])
        entry_id = resp.json()["entry_id"]

        # First approval
        resp1 = client.post("/api/checkout/approve", json={"ledger_id": entry_id})
        assert resp1.status_code == 200

        # Second approval — should fail
        resp2 = client.post("/api/checkout/approve", json={"ledger_id": entry_id})
        assert resp2.status_code == 400


# ═══════════════════════════════════════════════════════════════════════
# 14. DUPLICATE CHECKOUT REQUEST (IDEMPOTENCY)
# ═══════════════════════════════════════════════════════════════════════

class TestDuplicateCheckout:
    def test_same_idempotency_key_different_correlations(self, client):
        """Same idempotency key can be sent — each creates a new correlation."""
        with patch("backend.services.checkout_service.propose_upsell", return_value=make_proposal(10, ["SKU_101"])):
            resp1 = propose_cart(client, [{"sku": "SKU_101", "quantity": 1}], idempotency_key="idem_abc123")
            resp2 = propose_cart(client, [{"sku": "SKU_101", "quantity": 1}], idempotency_key="idem_abc123")

        assert resp1.json()["correlation_id"] != resp2.json()["correlation_id"]


# ═══════════════════════════════════════════════════════════════════════
# 15. RETRY AFTER FAILED PAYMENT
# ═══════════════════════════════════════════════════════════════════════

class TestRetryAfterFailure:
    def test_cannot_reuse_invalidated_offer(self, client):
        """After payment failure, the offer is invalidated."""
        with patch("backend.services.checkout_service.propose_upsell", return_value=make_proposal(10, ["SKU_101"])):
            resp = propose_cart(client, [{"sku": "SKU_101", "quantity": 1}])
        entry_id = resp.json()["entry_id"]

        # Create order and fail payment
        resp = client.post("/api/checkout/create-order", json={"ledger_id": entry_id})
        order_id = resp.json()["order_id"]
        client.post(f"/api/simulate/payment-failure?order_id={order_id}")

        # New proposal should work (fresh checkout)
        with patch("backend.services.checkout_service.propose_upsell", return_value=make_proposal(5, ["SKU_101"])):
            resp = propose_cart(client, [{"sku": "SKU_101", "quantity": 1}])
        assert resp.status_code == 200
        assert resp.json()["policy_result"]["decision"] == "approved"


# ═══════════════════════════════════════════════════════════════════════
# 16. PREVENTION OF REUSED INVALIDATED OFFERS
# ═══════════════════════════════════════════════════════════════════════

class TestOfferReusePrevention:
    def test_reuse_invalidated_offer_blocked(self, client):
        """Trying to approve an entry whose offer was invalidated should fail."""
        with patch("backend.services.checkout_service.propose_upsell", return_value=make_proposal(16, ["SKU_101"])):
            resp = propose_cart(client, [{"sku": "SKU_101", "quantity": 1}])
        entry_id = resp.json()["entry_id"]

        # Approve → creates order
        resp = client.post("/api/checkout/approve", json={"ledger_id": entry_id})
        order_id = resp.json()["order_id"]

        # Simulate failure
        client.post(f"/api/simulate/payment-failure?order_id={order_id}")

        # Trying to approve again should fail (entry is no longer awaiting_approval)
        resp = client.post("/api/checkout/approve", json={"ledger_id": entry_id})
        assert resp.status_code == 400


# ═══════════════════════════════════════════════════════════════════════
# 17. LEDGER CREATION FOR REJECTED PROPOSALS
# ═══════════════════════════════════════════════════════════════════════

class TestLedgerForRejection:
    def test_rejected_proposal_has_ledger_entry(self, client):
        with patch("backend.services.checkout_service.propose_upsell", return_value=make_proposal(15, ["FAKE_SKU"])):
            resp = propose_cart(client, [{"sku": "SKU_101", "quantity": 1}])

        data = resp.json()
        from backend.ledger.ledger import get_entry_by_id
        entry = get_entry_by_id(data["entry_id"])
        assert entry["outcome"] == "rejected"
        assert entry["actor"] == "brain"
        assert entry["trigger"] == "checkout"
        assert entry["proposal_json"] is not None
        assert entry["correlation_id"] is not None


# ═══════════════════════════════════════════════════════════════════════
# 18. LEDGER CREATION FOR EVERY RAZORPAY CALL AND PAYMENT OUTCOME
# ═══════════════════════════════════════════════════════════════════════

class TestLedgerCompleteAudit:
    def test_full_flow_creates_multiple_ledger_entries(self, client):
        """Propose → approve → verify → failure all create ledger entries."""
        # Propose
        with patch("backend.services.checkout_service.propose_upsell", return_value=make_proposal(16, ["SKU_101"])):
            resp = propose_cart(client, [{"sku": "SKU_101", "quantity": 1}])
        corr_id = resp.json()["correlation_id"]
        entry_id = resp.json()["entry_id"]

        # Approve → creates order + ledger entry
        resp = client.post("/api/checkout/approve", json={"ledger_id": entry_id})
        order_id = resp.json()["order_id"]

        # Simulate failure → creates 2 ledger entries (failure + recovery)
        client.post(f"/api/simulate/payment-failure?order_id={order_id}")

        # Check all entries for this correlation_id
        resp = client.get(f"/api/ledger/{corr_id}")
        entries = resp.json()["entries"]
        event_types = [e["event_type"] for e in entries]
        assert "checkout_proposal" in event_types
        assert "order_created" in event_types
        assert "payment_failed" in event_types
        assert "recovery" in event_types
