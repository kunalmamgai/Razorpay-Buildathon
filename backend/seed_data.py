import logging
"""Seed data — realistic products and fake order history for the campaign orchestrator.

Products include:
- SKU_101, SKU_102: explicitly discountable (per spec)
- SKU_103–SKU_106: additional products with varying categories

Order history is designed to give the campaign orchestrator signal:
- Frequently purchased product (SKU_101 — earbuds)
- Low-conversion product (SKU_105 — speaker)
- Bundle opportunity (SKU_101 + SKU_102)
- Inventory clearance candidate (SKU_104 — power bank)
"""
import json
from datetime import datetime, timedelta
from backend.db import get_db, init_db

logger = logging.getLogger(__name__)


PRODUCTS = [
    {
        "id": "SKU_101",
        "name": "Wireless Earbuds Pro",
        "price": 299900,  # ₹2,999 in paise
        "category": "Electronics",
        "discountable": 1,
        "stock_quantity": 150,
    },
    {
        "id": "SKU_102",
        "name": "USB-C Charging Cable (2m)",
        "price": 49900,  # ₹499
        "category": "Accessories",
        "discountable": 1,
        "stock_quantity": 500,
    },
    {
        "id": "SKU_103",
        "name": "Phone Case — MagSafe Compatible",
        "price": 99900,  # ₹999
        "category": "Accessories",
        "discountable": 1,
        "stock_quantity": 200,
    },
    {
        "id": "SKU_104",
        "name": "Portable Power Bank 10000mAh",
        "price": 149900,  # ₹1,499
        "category": "Electronics",
        "discountable": 1,
        "stock_quantity": 30,  # Low stock — clearance candidate
    },
    {
        "id": "SKU_105",
        "name": "Bluetooth Speaker Mini",
        "price": 199900,  # ₹1,999
        "category": "Electronics",
        "discountable": 1,
        "stock_quantity": 80,
    },
    {
        "id": "SKU_106",
        "name": "Premium Leather Wallet",
        "price": 129900,  # ₹1,299
        "category": "Fashion",
        "discountable": 1,
        "stock_quantity": 120,
    },
]


def _generate_order_history() -> list[dict]:
    """Generate fake aggregate order history for the campaign orchestrator.

    This gives the Brain signal about:
    - Frequently purchased products (SKU_101 appears in most orders)
    - Low conversion products (SKU_105 viewed but rarely purchased)
    - Bundle opportunities (SKU_101 + SKU_102 frequently co-purchased)
    - Inventory clearance needs (SKU_104 has high stock, low sales)
    """
    now = datetime.utcnow()
    orders = []

    # High-frequency: SKU_101 earbuds — appears in 8 of 20 orders
    for i in range(8):
        orders.append({
            "order_id": f"hist_{i:04d}",
            "created_at": (now - timedelta(days=20 - i)).isoformat(),
            "items": [
                {"sku": "SKU_101", "quantity": 1, "price": 299900}
            ],
            "total_paise": 299900,
            "status": "paid",
        })

    # Bundle pattern: SKU_101 + SKU_102 co-purchase
    for i in range(4):
        orders.append({
            "order_id": f"hist_bundle_{i:04d}",
            "created_at": (now - timedelta(days=15 - i)).isoformat(),
            "items": [
                {"sku": "SKU_101", "quantity": 1, "price": 299900},
                {"sku": "SKU_102", "quantity": 2, "price": 49900},
            ],
            "total_paise": 399700,
            "status": "paid",
        })

    # Low conversion: SKU_105 speaker — viewed 12 times, purchased 2 times
    for i in range(2):
        orders.append({
            "order_id": f"hist_speaker_{i:04d}",
            "created_at": (now - timedelta(days=10 - i)).isoformat(),
            "items": [
                {"sku": "SKU_105", "quantity": 1, "price": 199900}
            ],
            "total_paise": 199900,
            "status": "paid",
        })

    # Clearance candidate: SKU_104 power bank — 2 sales, 30 in stock
    for i in range(2):
        orders.append({
            "order_id": f"hist_power_{i:04d}",
            "created_at": (now - timedelta(days=12 - i)).isoformat(),
            "items": [
                {"sku": "SKU_104", "quantity": 1, "price": 149900}
            ],
            "total_paise": 149900,
            "status": "paid",
        })

    # Mix: fashion + accessories
    orders.append({
        "order_id": "hist_fashion_0001",
        "created_at": (now - timedelta(days=5)).isoformat(),
        "items": [
            {"sku": "SKU_106", "quantity": 1, "price": 129900},
            {"sku": "SKU_103", "quantity": 1, "price": 99900},
        ],
        "total_paise": 229800,
        "status": "paid",
    })

    # Some failed payments for realism
    orders.append({
        "order_id": "hist_fail_0001",
        "created_at": (now - timedelta(days=8)).isoformat(),
        "items": [
            {"sku": "SKU_101", "quantity": 1, "price": 299900}
        ],
        "total_paise": 299900,
        "status": "failed",
    })

    return orders


ORDER_HISTORY = _generate_order_history()


def seed():
    """Insert seed products and store order history in a JSON file for the orchestrator."""
    init_db()
    with get_db() as conn:
        count = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
        if count > 0:
            logger.info(f"Database already has {count} products. Skipping seed.")
            return

        for product in PRODUCTS:
            conn.execute(
                """INSERT INTO products (id, name, price, category, discountable, stock_quantity)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    product["id"],
                    product["name"],
                    product["price"],
                    product["category"],
                    product["discountable"],
                    product["stock_quantity"],
                ),
            )
        logger.info(f"Seeded {len(PRODUCTS)} products.")

    # Write order history to a JSON file for the campaign orchestrator
    import os
    history_path = os.path.join(os.path.dirname(__file__), "data", "order_history.json")
    os.makedirs(os.path.dirname(history_path), exist_ok=True)
    with open(history_path, "w") as f:
        json.dump(ORDER_HISTORY, f, indent=2)
    logger.info(f"Generated {len(ORDER_HISTORY)} fake order history records.")


if __name__ == "__main__":
    seed()
