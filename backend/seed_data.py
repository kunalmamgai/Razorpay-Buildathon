"""Seed data — 6 products for the demo storefront."""
from backend.db import get_db, init_db

PRODUCTS = [
    {
        "id": "SKU_101",
        "name": "Wireless Earbuds Pro",
        "price": 299900,  # ₹2,999 in paise
        "category": "Electronics",
        "discountable": 1,
    },
    {
        "id": "SKU_102",
        "name": "USB-C Charging Cable (2m)",
        "price": 49900,  # ₹499
        "category": "Accessories",
        "discountable": 1,
    },
    {
        "id": "SKU_103",
        "name": "Phone Case — MagSafe Compatible",
        "price": 99900,  # ₹999
        "category": "Accessories",
        "discountable": 1,
    },
    {
        "id": "SKU_104",
        "name": "Portable Power Bank 10000mAh",
        "price": 149900,  # ₹1,499
        "category": "Electronics",
        "discountable": 1,
    },
    {
        "id": "SKU_105",
        "name": "Bluetooth Speaker Mini",
        "price": 199900,  # ₹1,999
        "category": "Electronics",
        "discountable": 1,
    },
    {
        "id": "SKU_106",
        "name": "Premium Leather Wallet",
        "price": 129900,  # ₹1,299
        "category": "Fashion",
        "discountable": 1,
    },
]


def seed():
    """Insert seed products into the database."""
    init_db()
    with get_db() as conn:
        # Check if already seeded
        count = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
        if count > 0:
            print(f"Database already has {count} products. Skipping seed.")
            return

        for product in PRODUCTS:
            conn.execute(
                "INSERT INTO products (id, name, price, category, discountable) VALUES (?, ?, ?, ?, ?)",
                (product["id"], product["name"], product["price"], product["category"], product["discountable"]),
            )
        print(f"Seeded {len(PRODUCTS)} products.")


if __name__ == "__main__":
    seed()
