"""Seed data — realistic products and fake order history for the campaign orchestrator across isolated merchant databases.
"""
import json
import logging
import os
from datetime import datetime, timedelta
from backend.db import get_db, init_db, init_all_merchants_db
from backend.merchant_manager import list_merchants

logger = logging.getLogger("marlin.seed_data")

PRODUCTS_BY_MERCHANT = {
    "merchant_default": [
        {
            "id": "SKU_101",
            "name": "Wireless Earbuds Pro",
            "price": 299900,
            "category": "Electronics",
            "discountable": 1,
            "stock_quantity": 150,
        },
        {
            "id": "SKU_102",
            "name": "USB-C Charging Cable (2m)",
            "price": 49900,
            "category": "Accessories",
            "discountable": 1,
            "stock_quantity": 500,
        },
        {
            "id": "SKU_103",
            "name": "Phone Case — MagSafe Compatible",
            "price": 99900,
            "category": "Accessories",
            "discountable": 1,
            "stock_quantity": 200,
        },
        {
            "id": "SKU_104",
            "name": "Portable Power Bank 10000mAh",
            "price": 149900,
            "category": "Electronics",
            "discountable": 1,
            "stock_quantity": 30,
        },
        {
            "id": "SKU_105",
            "name": "Bluetooth Speaker Mini",
            "price": 199900,
            "category": "Electronics",
            "discountable": 1,
            "stock_quantity": 80,
        },
        {
            "id": "SKU_106",
            "name": "Premium Leather Wallet",
            "price": 129900,
            "category": "Fashion",
            "discountable": 1,
            "stock_quantity": 120,
        },
    ],
    "apex_electronics": [
        {
            "id": "SKU_101",
            "name": "Apex Quantum Noise-Canceling Headphones",
            "price": 899900,
            "category": "High-End Audio",
            "discountable": 1,
            "stock_quantity": 85,
        },
        {
            "id": "SKU_102",
            "name": "Apex 4K Gaming Monitor 144Hz",
            "price": 2499900,
            "category": "Displays",
            "discountable": 1,
            "stock_quantity": 40,
        },
        {
            "id": "SKU_104",
            "name": "Apex GaN Fast Charger 100W",
            "price": 299900,
            "category": "Accessories",
            "discountable": 1,
            "stock_quantity": 120,
        },
    ],
    "nexus_fashion": [
        {
            "id": "SKU_103",
            "name": "Nexus Silk Monogram Scarf",
            "price": 1499900,
            "category": "Apparel",
            "discountable": 1,
            "stock_quantity": 25,
        },
        {
            "id": "SKU_105",
            "name": "Nexus Italian Calfskin Briefcase",
            "price": 4500000,
            "category": "Leather Goods",
            "discountable": 1,
            "stock_quantity": 15,
        },
        {
            "id": "SKU_106",
            "name": "Nexus Minimalist Rose Gold Watch",
            "price": 1899900,
            "category": "Timepieces",
            "discountable": 1,
            "stock_quantity": 30,
        },
    ],
}


def _generate_order_history() -> list[dict]:
    now = datetime.utcnow()
    orders = []

    for i in range(8):
        orders.append({
            "order_id": f"hist_{i:04d}",
            "created_at": (now - timedelta(days=20 - i)).isoformat(),
            "items": [{"sku": "SKU_101", "quantity": 1, "price": 299900}],
            "total_paise": 299900,
            "status": "paid",
        })

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

    return orders


ORDER_HISTORY = _generate_order_history()


def seed(merchant_id: str = "merchant_default"):
    """Insert seed products for a specific merchant DB and write history file."""
    init_db(merchant_id)
    products = PRODUCTS_BY_MERCHANT.get(merchant_id) or PRODUCTS_BY_MERCHANT["merchant_default"]

    with get_db(merchant_id) as conn:
        count = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
        if count == 0:
            for product in products:
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
            logger.info(f"Seeded {len(products)} products for merchant tenant '{merchant_id}'.")

    # Save order history JSON
    history_path = os.path.join(os.path.dirname(__file__), "data", f"order_history_{merchant_id}.json")
    os.makedirs(os.path.dirname(history_path), exist_ok=True)
    with open(history_path, "w") as f:
        json.dump(ORDER_HISTORY, f, indent=2)


def seed_all_merchants():
    """Initialize DB and seed products for all merchants."""
    init_all_merchants_db()
    merchants = list_merchants()
    for m in merchants:
        seed(m["merchant_id"])


if __name__ == "__main__":
    seed_all_merchants()
