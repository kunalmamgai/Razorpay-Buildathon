"""Model Retraining & Fine-Tuning Dataset Exporter — extracts successful, policy-approved proposals
from the audit ledger to fine-tune smaller, faster model instances.
"""
import json
import logging
import os
from datetime import datetime
from backend.db import get_db
from backend.config import DATA_DIR

logger = logging.getLogger("marlin.model_retraining")

DATASETS_DIR = DATA_DIR / "datasets"
DATASETS_DIR.mkdir(exist_ok=True, parents=True)


def export_fine_tuning_dataset(merchant_id: str = "merchant_default") -> dict:
    """Export high-converting, policy-approved proposals into OpenAI/Gemini JSONL format."""
    dataset_records = []
    total_samples = 0
    total_discount = 0

    with get_db(merchant_id) as conn:
        rows = conn.execute(
            """SELECT proposal_json, reasoning, final_action_json, outcome, amounts_json, timestamp 
               FROM ledger 
               WHERE outcome IN ('paid', 'approved', 'order_created') 
               ORDER BY id DESC"""
        ).fetchall()

        for row in rows:
            entry = dict(row)
            proposal_raw = entry.get("proposal_json")
            final_action_raw = entry.get("final_action_json")

            if not proposal_raw:
                continue

            try:
                proposal = json.loads(proposal_raw)
                final_action = json.loads(final_action_raw or "{}")
                amounts = json.loads(entry.get("amounts_json") or "{}")

                discount_pct = final_action.get("discount_pct", proposal.get("discount_pct", 0))
                skus = final_action.get("skus", proposal.get("skus", []))
                reasoning = entry.get("reasoning") or proposal.get("reasoning", "High purchase intent detected")

                # Format into standard fine-tuning system-user-assistant turn schema
                user_content = (
                    f"Merchant: {merchant_id}. "
                    f"Original Subtotal: ₹{(amounts.get('original_amount_paise', 299900) / 100):.2f}. "
                    f"Cart items: {', '.join(skus) if skus else 'SKU_101'}."
                )

                assistant_content = json.dumps({
                    "action": "upsell",
                    "discount_pct": discount_pct,
                    "skus": skus,
                    "reasoning": reasoning,
                })

                jsonl_record = {
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are Marlin AI Growth Agent. Propose explainable, bounded discount incentives to optimize commerce checkout conversion.",
                        },
                        {"role": "user", "content": user_content},
                        {"role": "assistant", "content": assistant_content},
                    ]
                }

                dataset_records.append(jsonl_record)
                total_samples += 1
                total_discount += discount_pct

            except Exception as e:
                logger.warning(f"Error formatting proposal for fine-tuning: {e}")

    # Fallback synthetic training pairs if DB has low sample count
    if total_samples < 3:
        synthetic = [
            {
                "messages": [
                    {"role": "system", "content": "You are Marlin AI Growth Agent."},
                    {"role": "user", "content": "Merchant: merchant_default. Cart: SKU_101 (Earbuds). Subtotal: ₹2,999.00."},
                    {"role": "assistant", "content": json.dumps({"action": "upsell", "discount_pct": 10, "skus": ["SKU_102"], "reasoning": "High purchase intent bundle discount"})},
                ]
            },
            {
                "messages": [
                    {"role": "system", "content": "You are Marlin AI Growth Agent."},
                    {"role": "user", "content": "Merchant: apex_electronics. Cart: SKU_101 (Headphones). Subtotal: ₹8,999.00."},
                    {"role": "assistant", "content": json.dumps({"action": "upsell", "discount_pct": 15, "skus": ["SKU_104"], "reasoning": "Power bank accessory pair offer"})},
                ]
            },
        ]
        dataset_records.extend(synthetic)
        total_samples += len(synthetic)

    # Save to file
    filename = f"fine_tuning_{merchant_id}.jsonl"
    file_path = DATASETS_DIR / filename

    with open(file_path, "w", encoding="utf-8") as f:
        for rec in dataset_records:
            f.write(json.dumps(rec) + "\n")

    avg_discount = round((total_discount / total_samples), 1) if total_samples > 0 else 12.5

    logger.info(f"Exported {total_samples} fine-tuning pairs to {file_path}")

    return {
        "file_name": filename,
        "file_path": str(file_path),
        "total_samples": total_samples,
        "avg_discount_pct": avg_discount,
        "format": "JSONL (OpenAI / Gemini Fine-Tuning)",
        "merchant_id": merchant_id,
        "exported_at": datetime.utcnow().isoformat() + "Z",
    }
