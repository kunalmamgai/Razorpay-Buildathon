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
            "description": "Premium sound, active noise cancellation and a 30h battery case.",
            "rating": 4.6,
            "review_count": 2148,
            "image_url": "/products/SKU_101.jpg",
        },
        {
            "id": "SKU_102",
            "name": "USB-C Charging Cable (2m)",
            "price": 49900,
            "category": "Accessories",
            "discountable": 1,
            "stock_quantity": 500,
            "description": "Braided high-speed 60W charging cable with lifetime warranty.",
            "rating": 4.4,
            "review_count": 892,
            "image_url": "/products/SKU_102.jpg",
        },
        {
            "id": "SKU_103",
            "name": "Phone Case — MagSafe Compatible",
            "price": 99900,
            "category": "Accessories",
            "discountable": 1,
            "stock_quantity": 200,
            "description": "Military-grade drop protection with built-in MagSafe alignment.",
            "rating": 4.3,
            "review_count": 415,
            "image_url": "/products/SKU_103.jpg",
        },
        {
            "id": "SKU_104",
            "name": "Portable Power Bank 10000mAh",
            "price": 149900,
            "category": "Electronics",
            "discountable": 1,
            "stock_quantity": 30,
            "description": "Compact high-density battery pack with fast 22.5W output.",
            "rating": 4.7,
            "review_count": 3412,
            "image_url": "/products/SKU_104.jpg",
        },
        {
            "id": "SKU_105",
            "name": "Bluetooth Speaker Mini",
            "price": 199900,
            "category": "Electronics",
            "discountable": 1,
            "stock_quantity": 80,
            "description": "360° surround bass with IPX7 waterproofing and 12h playtime.",
            "rating": 4.5,
            "review_count": 1207,
            "image_url": "/products/SKU_105.jpg",
        },
        {
            "id": "SKU_106",
            "name": "Premium Leather Wallet",
            "price": 129900,
            "category": "Fashion",
            "discountable": 1,
            "stock_quantity": 120,
            "description": "Handcrafted genuine leather with RFID-blocking lining.",
            "rating": 4.2,
            "review_count": 310,
            "image_url": "/products/SKU_106.jpg",
        },
        {
            "id": "SKU_107",
            "name": "Smartwatch Ultra",
            "price": 699900,
            "category": "Wearables",
            "discountable": 1,
            "stock_quantity": 42,
            "description": "AMOLED display, 24/7 health tracking and 10-day battery.",
            "rating": 4.6,
            "review_count": 1843,
            "image_url": "/products/SKU_107.jpg",
        },
        {
            "id": "SKU_108",
            "name": "Urban Backpack",
            "price": 189900,
            "category": "Gear",
            "discountable": 1,
            "stock_quantity": 25,
            "description": "Water-resistant 22L pack with padded 15\" laptop sleeve.",
            "rating": 4.4,
            "review_count": 528,
            "image_url": "/products/SKU_108.jpg",
        },
        {
            "id": "SKU_109",
            "name": "Aviator Sunglasses",
            "price": 129900,
            "category": "Accessories",
            "discountable": 1,
            "stock_quantity": 0,
            "description": "UV400 polarized lenses with anti-glare coating. Back soon.",
            "rating": 4.1,
            "review_count": 96,
            "image_url": "/products/SKU_109.jpg",
        },
        {
            "id": "SKU_110",
            "name": "Insulated Water Bottle",
            "price": 39900,
            "category": "Gear",
            "discountable": 1,
            "stock_quantity": 85,
            "description": "Double-wall stainless steel 1L bottle, keeps cold 24h / hot 12h.",
            "rating": 4.8,
            "review_count": 2631,
            "image_url": "/products/SKU_110.svg",
        },
        {
            "id": "SKU_111",
            "name": "Wireless Mouse Pro",
            "price": 89900,
            "category": "Electronics",
            "discountable": 1,
            "stock_quantity": 65,
            "description": "Silent-click ergonomic mouse with 2.4GHz + Bluetooth.",
            "rating": 4.5,
            "review_count": 742,
            "image_url": "/products/SKU_111.svg",
        },
        {
            "id": "SKU_112",
            "name": "Mechanical Keyboard TKL",
            "price": 349900,
            "category": "Electronics",
            "discountable": 1,
            "stock_quantity": 18,
            "description": "Hot-swappable brown-switch tenkeyless board with RGB.",
            "rating": 4.7,
            "review_count": 610,
            "image_url": "/products/SKU_112.svg",
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
            "description": "Flagship ANC with adaptive transparency and 40h playback.",
            "rating": 4.8,
            "review_count": 2341,
            "image_url": "/products/SKU_101.jpg",
        },
        {
            "id": "SKU_102",
            "name": "Apex 4K Gaming Monitor 144Hz",
            "price": 2499900,
            "category": "Displays",
            "discountable": 1,
            "stock_quantity": 40,
            "description": "27\" 4K UHD IPS panel with 144Hz refresh and HDR600.",
            "rating": 4.7,
            "review_count": 546,
            "image_url": "/products/SKU_102.jpg",
        },
        {
            "id": "SKU_104",
            "name": "Apex GaN Fast Charger 100W",
            "price": 299900,
            "category": "Accessories",
            "discountable": 1,
            "stock_quantity": 120,
            "description": "Pocket-sized GaN charger powering laptops, tablets and phones.",
            "rating": 4.5,
            "review_count": 987,
            "image_url": "/products/SKU_104.jpg",
        },
        {
            "id": "SKU_201",
            "name": "Apex RGB Mechanical Keyboard",
            "price": 1199900,
            "category": "Peripherals",
            "discountable": 1,
            "stock_quantity": 55,
            "description": "Gasket-mount hot-swap board with per-key RGB and PBT caps.",
            "rating": 4.6,
            "review_count": 432,
            "image_url": "/products/SKU_201.svg",
        },
        {
            "id": "SKU_202",
            "name": "Apex Wireless Gaming Mouse",
            "price": 499900,
            "category": "Peripherals",
            "discountable": 1,
            "stock_quantity": 90,
            "description": "26K DPI optical sensor at 58g with 90h wireless battery.",
            "rating": 4.7,
            "review_count": 1108,
            "image_url": "/products/SKU_202.svg",
        },
        {
            "id": "SKU_203",
            "name": "Apex 2TB NVMe SSD Pro",
            "price": 1399900,
            "category": "Storage",
            "discountable": 1,
            "stock_quantity": 35,
            "description": "PCIe 4.0 read speeds up to 7450 MB/s with heatsink.",
            "rating": 4.9,
            "review_count": 283,
            "image_url": "/products/SKU_203.svg",
        },
        {
            "id": "SKU_204",
            "name": "Apex Thunderbolt 4 Dock",
            "price": 849900,
            "category": "Connectivity",
            "discountable": 1,
            "stock_quantity": 22,
            "description": "11-in-1 dock driving dual 4K displays at 90W charging.",
            "rating": 4.6,
            "review_count": 164,
            "image_url": "/products/SKU_204.svg",
        },
        {
            "id": "SKU_205",
            "name": "Apex 4K Streaming Webcam",
            "price": 699900,
            "category": "Cameras",
            "discountable": 1,
            "stock_quantity": 48,
            "description": "Sony sensor 4K/30 with auto-framing and dual mics.",
            "rating": 4.4,
            "review_count": 318,
            "image_url": "/products/SKU_205.svg",
        },
        {
            "id": "SKU_206",
            "name": "Apex Studio Microphone",
            "price": 949900,
            "category": "Audio",
            "discountable": 1,
            "stock_quantity": 27,
            "description": "USB condenser mic with cardioid pickup and mute touch.",
            "rating": 4.7,
            "review_count": 195,
            "image_url": "/products/SKU_206.svg",
        },
        {
            "id": "SKU_207",
            "name": "Apex Smart Speaker",
            "price": 749900,
            "category": "Smart Home",
            "discountable": 1,
            "stock_quantity": 63,
            "description": "360° room-filling sound with built-in voice assistant.",
            "rating": 4.3,
            "review_count": 421,
            "image_url": "/products/SKU_207.svg",
        },
        {
            "id": "SKU_208",
            "name": "Apex Ergonomic Gaming Chair",
            "price": 1899900,
            "category": "Furniture",
            "discountable": 1,
            "stock_quantity": 15,
            "description": "4D armrests, lumbar support and breathable mesh back.",
            "rating": 4.8,
            "review_count": 232,
            "image_url": "/products/SKU_208.svg",
        },
        {
            "id": "SKU_209",
            "name": "Apex 27\" 4K OLED Monitor",
            "price": 4299900,
            "category": "Displays",
            "discountable": 1,
            "stock_quantity": 12,
            "description": "Perfect-black OLED with 240Hz, G-Sync and true 10-bit.",
            "rating": 4.9,
            "review_count": 141,
            "image_url": "/products/SKU_209.svg",
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
            "description": "Hand-rolled 100% mulberry silk with heritage monogram.",
            "rating": 4.9,
            "review_count": 87,
            "image_url": "/products/SKU_103.jpg",
        },
        {
            "id": "SKU_105",
            "name": "Nexus Italian Calfskin Briefcase",
            "price": 4500000,
            "category": "Leather Goods",
            "discountable": 1,
            "stock_quantity": 15,
            "description": "Full-grain calfskin, hand-stitched in Florence. Fits 16\" laptop.",
            "rating": 5.0,
            "review_count": 64,
            "image_url": "/products/SKU_105.jpg",
        },
        {
            "id": "SKU_106",
            "name": "Nexus Minimalist Rose Gold Watch",
            "price": 1899900,
            "category": "Timepieces",
            "discountable": 1,
            "stock_quantity": 30,
            "description": "Sapphire crystal, Miyota automatic movement, 5ATM water.",
            "rating": 4.8,
            "review_count": 214,
            "image_url": "/products/SKU_106.jpg",
        },
        {
            "id": "SKU_301",
            "name": "Nexus Cashmere Overcoat",
            "price": 5800000,
            "category": "Apparel",
            "discountable": 1,
            "stock_quantity": 10,
            "description": "Double-faced Mongolian cashmere, fully canvassed tailoring.",
            "rating": 4.9,
            "review_count": 38,
            "image_url": "/products/SKU_301.svg",
        },
        {
            "id": "SKU_302",
            "name": "Nexus Hand-Stitched Oxford Shoes",
            "price": 3200000,
            "category": "Footwear",
            "discountable": 1,
            "stock_quantity": 14,
            "description": "Goodyear-welted calf leather with hand-burnished finish.",
            "rating": 4.7,
            "review_count": 92,
            "image_url": "/products/SKU_302.svg",
        },
        {
            "id": "SKU_303",
            "name": "Nexus Silk Pocket Square Set",
            "price": 399900,
            "category": "Apparel",
            "discountable": 1,
            "stock_quantity": 60,
            "description": "Set of three hand-printed silk squares in signature prints.",
            "rating": 4.6,
            "review_count": 154,
            "image_url": "/products/SKU_303.svg",
        },
        {
            "id": "SKU_304",
            "name": "Nexus Leather Belt",
            "price": 799900,
            "category": "Leather Goods",
            "discountable": 1,
            "stock_quantity": 45,
            "description": "Vegetable-tanned hide with hand-polished brass buckle.",
            "rating": 4.8,
            "review_count": 123,
            "image_url": "/products/SKU_304.svg",
        },
        {
            "id": "SKU_305",
            "name": "Nexus Sterling Silver Cufflinks",
            "price": 899900,
            "category": "Accessories",
            "discountable": 1,
            "stock_quantity": 20,
            "description": "925 sterling silver with black onyx inlay, gift boxed.",
            "rating": 4.9,
            "review_count": 73,
            "image_url": "/products/SKU_305.svg",
        },
        {
            "id": "SKU_306",
            "name": "Nexus Cashmere Travel Shawl",
            "price": 1299900,
            "category": "Apparel",
            "discountable": 1,
            "stock_quantity": 18,
            "description": "Ultra-fine cashmere weave, warm yet featherlight.",
            "rating": 4.8,
            "review_count": 55,
            "image_url": "/products/SKU_306.svg",
        },
        {
            "id": "SKU_307",
            "name": "Nexus Linen Shirt",
            "price": 999900,
            "category": "Apparel",
            "discountable": 1,
            "stock_quantity": 40,
            "description": "European flax linen, garment-washed for effortless drape.",
            "rating": 4.5,
            "review_count": 186,
            "image_url": "/products/SKU_307.svg",
        },
        {
            "id": "SKU_308",
            "name": "Nexus Leather Gloves",
            "price": 699900,
            "category": "Accessories",
            "discountable": 1,
            "stock_quantity": 28,
            "description": "Nappa leather with cashmere lining and touchscreen tips.",
            "rating": 4.7,
            "review_count": 98,
            "image_url": "/products/SKU_308.svg",
        },
        {
            "id": "SKU_309",
            "name": "Nexus Travel Valet Tray",
            "price": 549900,
            "category": "Leather Goods",
            "discountable": 1,
            "stock_quantity": 33,
            "description": "Folding leather tray with brushed brass corners.",
            "rating": 4.6,
            "review_count": 89,
            "image_url": "/products/SKU_309.svg",
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


# ── Demo campaigns — one per policy outcome per merchant ─────────────────
# These showcase the Brain → Cage → Gate pipeline on first load.
DEMO_CAMPAIGNS_BY_MERCHANT = {
    "merchant_default": [
        {
            "id": "camp_demo_active_01",
            "name": "Weekend Audio Flash — 10% on Earbuds",
            "discount_pct": 10,
            "target_skus_json": '["SKU_101"]',
            "duration_hours": 24,
            "status": "active",
            "policy_decision": "approved",
            "created_by": "brain",
            "reasoning": "Bundle pattern detected: 33% of recent orders include SKU_101. 10% flash discount to boost conversion — within auto-approve threshold.",
        },
        {
            "id": "camp_demo_pending_02",
            "name": "Cart Abandonment Rescue — 20% on Power Bank",
            "discount_pct": 20,
            "target_skus_json": '["SKU_104"]',
            "duration_hours": 48,
            "status": "pending",
            "policy_decision": "awaiting_approval",
            "created_by": "brain",
            "reasoning": "Power Bank (SKU_104) viewed 12× in 24h but only 2 purchases. 20% rescue offer — exceeds 15% auto-approve threshold, requires human gate.",
        },
        {
            "id": "camp_demo_clamped_03",
            "name": "Cable Cross-Sell Bundle — 15% (proposed 30%)",
            "discount_pct": 15,
            "target_skus_json": '["SKU_102"]',
            "duration_hours": 48,
            "status": "active",
            "policy_decision": "clamped",
            "created_by": "brain",
            "reasoning": "Brain proposed targeting SKU_102 + SKU_107, but SKU_107 not in catalog — removed. Discount clamped from 30% to 15% (below threshold, auto-activated with violations).",
        },
        {
            "id": "camp_demo_rejected_04",
            "name": "Aggressive Holiday Blitz — 35% Storewide",
            "discount_pct": 35,
            "target_skus_json": '["SKU_101", "SKU_102", "SKU_103"]',
            "duration_hours": 72,
            "status": "rejected",
            "policy_decision": "rejected",
            "created_by": "brain",
            "reasoning": "35% exceeds merchant max 25%. Duration 72h exceeds max 48h. Cage rejected both violations — campaign blocked.",
        },
    ],
    "apex_electronics": [
        {
            "id": "camp_demo_active_01",
            "name": "Quantum Audio Launch — 18% on Headphones",
            "discount_pct": 18,
            "target_skus_json": '["SKU_101"]',
            "duration_hours": 36,
            "status": "active",
            "policy_decision": "approved",
            "created_by": "brain",
            "reasoning": "New product launch signal: Apex Quantum Headphones trending in search. 18% launch discount — below 20% threshold, auto-approved.",
        },
        {
            "id": "camp_demo_pending_02",
            "name": "Gaming Monitor Flash — 25% off 4K Display",
            "discount_pct": 25,
            "target_skus_json": '["SKU_102"]',
            "duration_hours": 48,
            "status": "pending",
            "policy_decision": "awaiting_approval",
            "created_by": "brain",
            "reasoning": "Gaming Monitor (SKU_102) slow mover: 40 units in stock, 3 sold this week. 25% flash — exceeds 20% auto-approve threshold, needs human gate.",
        },
        {
            "id": "camp_demo_clamped_03",
            "name": "Charger Accessory Bundle — 12% on GaN + Unknown SKU",
            "discount_pct": 12,
            "target_skus_json": '["SKU_104"]',
            "duration_hours": 72,
            "status": "active",
            "policy_decision": "clamped",
            "created_by": "brain",
            "reasoning": "Brain proposed GaN Charger + SKU_999 bundle, but SKU_999 not in Apex catalog — removed. Final: 12% on SKU_104 only.",
        },
        {
            "id": "camp_demo_rejected_04",
            "name": "Mega Clearance — 40% on Everything",
            "discount_pct": 40,
            "target_skus_json": '["SKU_101", "SKU_102", "SKU_104"]',
            "duration_hours": 72,
            "status": "rejected",
            "policy_decision": "rejected",
            "created_by": "brain",
            "reasoning": "40% exceeds Apex max campaign discount of 35%. Cage rejected — campaign blocked.",
        },
    ],
    "nexus_fashion": [
        {
            "id": "camp_demo_active_01",
            "name": "Silk Scarf Warm-Up — 4% Loyalty",
            "discount_pct": 4,
            "target_skus_json": '["SKU_103"]',
            "duration_hours": 12,
            "status": "active",
            "policy_decision": "approved",
            "created_by": "brain",
            "reasoning": "Loyalty tier 2 customer segment identified. 4% micro-discount on Silk Scarf — below 5% threshold, auto-approved.",
        },
        {
            "id": "camp_demo_pending_02",
            "name": "Briefcase Premium Offer — 12% on Italian Leather",
            "discount_pct": 12,
            "target_skus_json": '["SKU_105"]',
            "duration_hours": 24,
            "status": "pending",
            "policy_decision": "awaiting_approval",
            "created_by": "brain",
            "reasoning": "Briefcase (SKU_105) high-value item with 15 units in stock. 12% premium offer — exceeds 5% auto-approve threshold, requires human gate.",
        },
        {
            "id": "camp_demo_clamped_03",
            "name": "Watch Bundle — 8% with Unknown SKU",
            "discount_pct": 8,
            "target_skus_json": '["SKU_106"]',
            "duration_hours": 24,
            "status": "active",
            "policy_decision": "clamped",
            "created_by": "brain",
            "reasoning": "Brain proposed Watch + SKU_200 bundle, but SKU_200 not in Nexus catalog — removed. Final: 8% on SKU_106 only.",
        },
        {
            "id": "camp_demo_rejected_04",
            "name": "Luxury Blowout — 20% for 48h",
            "discount_pct": 20,
            "target_skus_json": '["SKU_103", "SKU_105", "SKU_106"]',
            "duration_hours": 48,
            "status": "rejected",
            "policy_decision": "rejected",
            "created_by": "brain",
            "reasoning": "20% exceeds Nexus max 15%. Duration 48h exceeds max 24h. Cage rejected both violations — luxury brand integrity protected.",
        },
    ],
}


def seed_demo_campaigns(merchant_id: str = "merchant_default"):
    """Insert curated demo campaigns when the campaigns table is empty.

    Each merchant gets 4 campaigns covering every policy outcome:
    active/approved, pending/awaiting_approval, active/clamped, rejected.
    """
    campaigns = DEMO_CAMPAIGNS_BY_MERCHANT.get(merchant_id)
    if not campaigns:
        return

    now = datetime.utcnow()
    with get_db(merchant_id) as conn:
        count = conn.execute("SELECT COUNT(*) FROM campaigns").fetchone()[0]
        if count > 0:
            return

        for c in campaigns:
            duration = c.get("duration_hours", 48)
            starts_at = now.isoformat()
            expires_at = (now + timedelta(hours=duration)).isoformat()
            conn.execute(
                """INSERT INTO campaigns
                   (id, name, discount_pct, target_skus_json, starts_at, expires_at,
                    status, policy_decision, created_by, reasoning)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    c["id"],
                    c["name"],
                    c["discount_pct"],
                    c["target_skus_json"],
                    starts_at,
                    expires_at,
                    c["status"],
                    c["policy_decision"],
                    c["created_by"],
                    c.get("reasoning"),
                ),
            )
        logger.info(f"Seeded {len(campaigns)} demo campaigns for merchant '{merchant_id}'.")


def seed(merchant_id: str = "merchant_default"):
    """Insert seed products for a specific merchant DB and write history file.

    Upserts (inserts missing rows, refreshes metadata on existing rows) so
    re-running against an already-seeded DB adds newly curated products and
    enriches descriptions/ratings without duplicating rows.
    """
    init_db(merchant_id)
    products = PRODUCTS_BY_MERCHANT.get(merchant_id) or PRODUCTS_BY_MERCHANT["merchant_default"]

    with get_db(merchant_id) as conn:
        inserted = 0
        for product in products:
            existing = conn.execute(
                "SELECT id FROM products WHERE id = ?", (product["id"],)
            ).fetchone()
            if existing:
                conn.execute(
                    """UPDATE products SET
                           name = ?, price = ?, category = ?, discountable = ?,
                           stock_quantity = ?, description = ?, rating = ?,
                           review_count = ?, image_url = ?
                       WHERE id = ?""",
                    (
                        product["name"],
                        product["price"],
                        product["category"],
                        product["discountable"],
                        product["stock_quantity"],
                        product.get("description"),
                        product.get("rating", 4.5),
                        product.get("review_count", 0),
                        product.get("image_url"),
                        product["id"],
                    ),
                )
            else:
                conn.execute(
                    """INSERT INTO products
                       (id, name, price, category, discountable, stock_quantity,
                        description, rating, review_count, image_url)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        product["id"],
                        product["name"],
                        product["price"],
                        product["category"],
                        product["discountable"],
                        product["stock_quantity"],
                        product.get("description"),
                        product.get("rating", 4.5),
                        product.get("review_count", 0),
                        product.get("image_url"),
                    ),
                )
                inserted += 1
        logger.info(f"Seeded/refreshed {len(products)} products for merchant tenant '{merchant_id}' ({inserted} new).")

    # Save order history JSON
    history_path = os.path.join(os.path.dirname(__file__), "data", f"order_history_{merchant_id}.json")
    os.makedirs(os.path.dirname(history_path), exist_ok=True)
    with open(history_path, "w") as f:
        json.dump(ORDER_HISTORY, f, indent=2)

    # Seed demo campaigns (idempotent: only when campaigns table is empty)
    seed_demo_campaigns(merchant_id)


def seed_all_merchants():
    """Initialize DB and seed products for all merchants."""
    init_all_merchants_db()
    merchants = list_merchants()
    for m in merchants:
        seed(m["merchant_id"])


if __name__ == "__main__":
    seed_all_merchants()
