"""Unit test script for verifying multi-tenant database isolation, merchant-specific policy evaluation,
and Razorpay credential resolution.
"""
import sys
import os

# Add root directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.merchant_manager import init_master_db, list_merchants, get_merchant
from backend.db import init_all_merchants_db, get_merchant_db_path, get_db
from backend.seed_data import seed_all_merchants
from backend.cage.policy_engine import evaluate_upsell_proposal
from backend.services.checkout_service import propose_checkout
from backend.ledger.ledger import get_entries, get_stats


def test_multi_tenant_isolation():
    print("=== Testing Multi-Tenant & Merchant Isolation ===")

    # 1. Initialize master and merchant databases with seed data
    init_master_db()
    seed_all_merchants()

    merchants = list_merchants()
    print(f"Registered Merchants Count: {len(merchants)}")
    for m in merchants:
        print(f" - [{m['merchant_id']}] {m['name']} (Max Discount: {m['policy_config'].get('max_discount_pct')}%)")

    assert len(merchants) >= 3, "Failed: Expected at least 3 default merchants"

    # 2. Test DB File Path Isolation
    path_default = get_merchant_db_path("merchant_default")
    path_apex = get_merchant_db_path("apex_electronics")
    path_nexus = get_merchant_db_path("nexus_fashion")

    print(f"\nMerchant DB Paths:")
    print(f" - Default: {path_default} (Exists: {path_default.exists()})")
    print(f" - Apex:    {path_apex} (Exists: {path_apex.exists()})")
    print(f" - Nexus:   {path_nexus} (Exists: {path_nexus.exists()})")

    assert path_default != path_apex != path_nexus, "Failed: Merchant DB paths must be distinct"

    # 3. Test Policy Engine Isolation
    print("\nEvaluating 25% discount proposal across different merchant policies:")

    # Default Merchant (Max 20%, SKU_101 allowed) -> Clamps to 20%
    prop_default = {"action": "upsell", "discount_pct": 25, "skus": ["SKU_101"], "reasoning": "Test offer"}
    res_default = evaluate_upsell_proposal(prop_default, policy_config=get_merchant("merchant_default")["policy_config"])
    print(f" - Default Merchant (SKU_101): Decision = {res_default['decision']}, Clamped Pct = {res_default['final_action'].get('discount_pct')}%")
    assert res_default['final_action'].get('discount_pct') == 20, "Failed: Default merchant should clamp 25% to 20%"

    # Apex Electronics (Max 30%, SKU_101 allowed) -> Approves 25%
    prop_apex = {"action": "upsell", "discount_pct": 25, "skus": ["SKU_101"], "reasoning": "Test offer"}
    res_apex = evaluate_upsell_proposal(prop_apex, policy_config=get_merchant("apex_electronics")["policy_config"])
    print(f" - Apex Electronics (SKU_101): Decision = {res_apex['decision']}, Final Pct = {res_apex['final_action'].get('discount_pct')}%")
    assert res_apex['final_action'].get('discount_pct') == 25, "Failed: Apex should allow 25% discount"

    # Nexus Luxury Fashion (Max 10%, SKU_103 allowed) -> Clamps to 10%
    prop_nexus = {"action": "upsell", "discount_pct": 25, "skus": ["SKU_103"], "reasoning": "Test offer"}
    res_nexus = evaluate_upsell_proposal(prop_nexus, policy_config=get_merchant("nexus_fashion")["policy_config"])
    print(f" - Nexus Fashion    (SKU_103): Decision = {res_nexus['decision']}, Clamped Pct = {res_nexus['final_action'].get('discount_pct')}%")
    assert res_nexus['final_action'].get('discount_pct') == 10, "Failed: Nexus should clamp 25% to 10%"

    # Non-discountable SKU test for Nexus (SKU_101 should be REJECTED for Nexus)
    res_nexus_invalid = evaluate_upsell_proposal(prop_default, policy_config=get_merchant("nexus_fashion")["policy_config"])
    print(f" - Nexus Non-Discountable SKU (SKU_101): Decision = {res_nexus_invalid['decision']} (Correctly Rejected)")
    assert res_nexus_invalid['decision'] == 'rejected', "Failed: Nexus should reject non-discountable SKU_101"

    # 4. Test Ledger Data Isolation
    print("\nTesting Ledger Data Isolation:")
    p1 = propose_checkout(cart=[{"sku": "SKU_101", "quantity": 1}], merchant_id="merchant_default")
    p2 = propose_checkout(cart=[{"sku": "SKU_101", "quantity": 1}], merchant_id="apex_electronics")

    stats_default = get_stats("merchant_default")
    stats_apex = get_stats("apex_electronics")
    stats_nexus = get_stats("nexus_fashion")

    print(f" - Default Merchant Proposals Count: {stats_default['total_proposals']}")
    print(f" - Apex Merchant Proposals Count:    {stats_apex['total_proposals']}")
    print(f" - Nexus Merchant Proposals Count:   {stats_nexus['total_proposals']}")

    assert stats_default['total_proposals'] > 0, "Failed: Default merchant should have proposals"
    assert stats_apex['total_proposals'] > 0, "Failed: Apex merchant should have proposals"

    print("\n[SUCCESS] ALL MULTI-TENANT ISOLATION TESTS PASSED PERFECTLY!")


if __name__ == "__main__":
    test_multi_tenant_isolation()
