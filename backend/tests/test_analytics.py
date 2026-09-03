"""Automated unit test suite for Real-Time Analytics & Feedback Loop:
1. Revenue Lift computation (AI-driven revenue vs baseline non-discounted pricing)
2. 5-Stage Conversion Funnel metrics tracking
3. AI Anomaly Detection engine rules
4. Fine-Tuning JSONL Dataset Exporter
"""
import sys
import os
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.merchant_manager import init_master_db
from backend.seed_data import seed_all_merchants
from backend.services.analytics_service import get_revenue_lift, get_conversion_funnel, detect_anomalies
from backend.services.model_retraining_service import export_fine_tuning_dataset
from backend.services.checkout_service import propose_checkout, approve_checkout, create_order_from_proposal
from backend.services.payment_service import verify_and_record_payment


def test_analytics_and_feedback():
    print("=== Testing Real-Time Analytics & Feedback Loop Pipeline ===")
    merchant_id = "merchant_default"
    init_master_db()
    seed_all_merchants()

    # Create a full lifecycle transaction: Propose -> Create Order -> Verify Payment
    p = propose_checkout(cart=[{"sku": "SKU_101", "quantity": 1}], merchant_id=merchant_id)
    entry_id = p["entry_id"]
    order_res = create_order_from_proposal(entry_id, merchant_id=merchant_id)
    order_id = order_res["order_id"]

    # Verify payment (captures revenue)
    pay_res = verify_and_record_payment(
        order_id=order_id,
        payment_id=f"pay_analytics_test_{order_id}",
        signature="mock_sig",
        merchant_id=merchant_id,
    )
    print(f" - Simulated Paid Transaction Result: {pay_res.get('status')}")

    # 1. Test Revenue Lift Metrics
    print("\n1. Testing Revenue Lift Calculations:")
    lift = get_revenue_lift(merchant_id=merchant_id)
    print(f" - Paid Orders Count: {lift['paid_orders_count']}")
    print(f" - Total Captured Revenue: INR {(lift['total_captured_paise'] / 100):.2f}")
    print(f" - Baseline Non-Discounted: INR {(lift['total_baseline_paise'] / 100):.2f}")
    print(f" - Net Revenue Lift: +{lift['net_lift_pct']}%")

    assert lift['paid_orders_count'] > 0, "Failed: Paid orders count should be > 0"
    assert lift['total_captured_paise'] > 0, "Failed: Captured revenue should be > 0"
    assert lift['net_lift_pct'] > 0, "Failed: Net lift % should be positive"

    # 2. Test 5-Stage Conversion Funnel
    print("\n2. Testing 5-Stage Conversion Funnel:")
    funnel = get_conversion_funnel(merchant_id=merchant_id)
    steps = funnel['funnel_steps']
    print(f" - Total Funnel Steps Count: {len(steps)}")
    for s in steps:
        print(f"   Step {s['step']} [{s['name']}]: {s['count']} items ({s['conversion_from_start_pct']}%)")

    assert len(steps) == 5, "Failed: Funnel must contain exactly 5 steps"
    assert funnel['overall_conversion_pct'] >= 0, "Failed: Overall conversion % must be >= 0"

    # 3. Test AI Anomaly Detection Engine
    print("\n3. Testing AI Anomaly Detection Engine:")
    anomalies = detect_anomalies(merchant_id=merchant_id)
    print(f" - Detected Anomalies Count: {len(anomalies)}")
    for a in anomalies[:3]:
        print(f"   [{a['severity'].upper()}] {a['title']} - {a['details']}")

    assert len(anomalies) > 0, "Failed: Anomaly detection should return alerts list"

    # 4. Test Model Retraining Dataset Exporter
    print("\n4. Testing Model Retraining JSONL Dataset Exporter:")
    retrain_res = export_fine_tuning_dataset(merchant_id=merchant_id)
    print(f" - Exported File: {retrain_res['file_name']}")
    print(f" - Training Samples Exported: {retrain_res['total_samples']}")
    print(f" - Format: {retrain_res['format']}")

    assert retrain_res['total_samples'] > 0, "Failed: Fine-tuning dataset must contain training pairs"
    assert os.path.exists(retrain_res['file_path']), "Failed: Exported JSONL dataset file must exist on disk"

    # Verify JSONL lines schema
    with open(retrain_res['file_path'], 'r', encoding='utf-8') as f:
        first_line = json.loads(f.readline())
        assert "messages" in first_line, "Failed: Dataset schema must have 'messages' array"
        assert len(first_line["messages"]) == 3, "Failed: Prompt-response turn must have system-user-assistant messages"

    print("\n[SUCCESS] ALL REAL-TIME ANALYTICS & FEEDBACK LOOP TESTS PASSED PERFECTLY!")


if __name__ == "__main__":
    test_analytics_and_feedback()
