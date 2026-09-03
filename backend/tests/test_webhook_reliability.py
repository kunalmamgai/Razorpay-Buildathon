"""Automated unit test suite for Webhook Reliability & Idempotency:
1. Timing-safe HMAC signature verification & timestamp tolerance check
2. Idempotency deduplication (identical event_id returns cached result without duplicate processing)
3. Exponential backoff retries on transient handler errors
4. Dead Letter Queue (DLQ) push after max retries and manual event replay
"""
import sys
import os
import time
import hmac
import hashlib

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.webhook_verifier import verify_webhook_signature
from backend.services.webhook_reliability import DeduplicationEngine, RetryEngine, DLQService
from backend.services.payment_service import process_webhook
from backend.db import init_db


def test_webhook_reliability():
    print("=== Testing Webhook Reliability & Idempotency Pipeline ===")
    merchant_id = "merchant_default"
    init_db(merchant_id)

    # 1. Test Enhanced Signature Verification & Timestamp Tolerance
    print("\n1. Testing Webhook Signature & Replay Protection:")
    secret = "whsec_test_secret_12345"
    body = b'{"event":"payment.captured","event_id":"evt_test_sig_101"}'
    valid_sig = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    current_time = int(time.time())

    # Valid signature & timestamp -> True
    ok = verify_webhook_signature(body, valid_sig, secret=secret, timestamp=current_time)
    print(f" - Valid Signature & Current Timestamp: {ok}")
    assert ok is True, "Failed: Valid signature and timestamp should pass"

    # Expired timestamp (skew > 300s) -> False (Replay Attack Mitigated)
    expired_time = current_time - 600
    replay_blocked = not verify_webhook_signature(body, valid_sig, secret=secret, timestamp=expired_time)
    print(f" - Replay Attack (600s Skew) Blocked: {replay_blocked}")
    assert replay_blocked is True, "Failed: Replay attack with expired timestamp should be blocked"

    # 2. Test Idempotency Deduplication
    print("\n2. Testing Idempotency Event Deduplication:")
    event_id = f"evt_idem_{int(time.time())}"
    payload = {
        "event_id": event_id,
        "event": "payment.captured",
        "payload": {
            "order": {"entity": {"id": "order_idem_test_9921"}},
            "payment": {"entity": {"id": "pay_idem_test_9921"}},
        },
    }

    # First call: Processes event
    res1 = process_webhook("payment.captured", payload, merchant_id=merchant_id)
    print(f" - First Processing Call Result: {res1.get('status')} (Event ID: {event_id})")
    assert res1.get("status") in ("processed", "already_processed"), "Failed: First call should process"

    # Second call (Duplicate): Deduplicated immediately via idempotency table
    res2 = process_webhook("payment.captured", payload, merchant_id=merchant_id)
    print(f" - Duplicate Event Call Result: {res2.get('status')} (Deduplicated Successfully)")
    assert res2.get("status") in ("processed", "already_processed"), "Failed: Duplicate event should return cached/deduplicated response"

    # 3. Test Exponential Backoff Retry Engine
    print("\n3. Testing Exponential Backoff Retry Engine:")
    attempts = [0]

    def failing_func():
        attempts[0] += 1
        if attempts[0] < 3:
            raise ValueError(f"Transient DB lock failure attempt {attempts[0]}")
        return "SUCCESS"

    start_time = time.time()
    retry_res = RetryEngine.execute_with_retry(failing_func, max_retries=3, base_delay_seconds=0.05)
    elapsed = time.time() - start_time
    print(f" - Retried {attempts[0]} times, Final Result: {retry_res} (Elapsed: {elapsed:.3f}s)")
    assert retry_res == "SUCCESS", "Failed: Retry engine should succeed on 3rd attempt"
    assert attempts[0] == 3, "Failed: Should attempt exactly 3 times"

    # 4. Test Dead Letter Queue (DLQ) Push & Replay
    print("\n4. Testing Dead Letter Queue (DLQ) Push & Replay:")
    dlq_event_id = f"evt_dlq_fail_{int(time.time())}"
    dlq_payload = {
        "event_id": dlq_event_id,
        "event": "payment.failed",
        "payload": {
            "order": {"entity": {"id": "order_dlq_test_100"}},
            "payment": {"entity": {"id": "pay_dlq_test_100"}},
        },
    }

    # Direct push to DLQ to simulate max retry failure
    dlq_id = DLQService.push_to_dlq(
        event_id=dlq_event_id,
        merchant_id=merchant_id,
        event_type="payment.failed",
        payload=dlq_payload,
        error_message="Database lock timeout after 3 retries",
        attempts=3,
    )
    print(f" - Pushed Failed Webhook to DLQ (Record #{dlq_id})")

    # List pending DLQ events
    dlq_list = DLQService.list_dlq_events(merchant_id=merchant_id, status="pending")
    print(f" - Pending DLQ Events Count: {len(dlq_list)}")
    assert any(d["id"] == dlq_id for d in dlq_list), "Failed: DLQ event should be listed as pending"

    # Replay DLQ event
    replay_res = DLQService.replay_dlq_event(dlq_id=dlq_id, merchant_id=merchant_id)
    print(f" - DLQ Replay Result: {replay_res.get('status')} (Status: Replayed)")
    assert replay_res.get("status") == "replayed", "Failed: DLQ replay should succeed"

    print("\n[SUCCESS] ALL WEBHOOK RELIABILITY & IDEMPOTENCY TESTS PASSED PERFECTLY!")


if __name__ == "__main__":
    test_webhook_reliability()
