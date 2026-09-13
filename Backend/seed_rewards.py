"""Seed sample rewards into the database. Run once."""
from database import get_admin_client

admin = get_admin_client()

REWARDS = [
    {
        "name": "Free Coffee",
        "description": "Redeem for one free coffee at the campus cafeteria.",
        "category": "Food & Drink",
        "image_url": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80",
        "token_cost": 50,
        "stock": 100,
        "is_active": True,
    },
    {
        "name": "Eco Water Bottle",
        "description": "Stainless steel reusable water bottle with EcoLoop branding.",
        "category": "Merchandise",
        "image_url": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&q=80",
        "token_cost": 200,
        "stock": 30,
        "is_active": True,
    },
    {
        "name": "₹50 Canteen Voucher",
        "description": "Discount voucher redeemable at any campus canteen counter.",
        "category": "Voucher",
        "image_url": "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80",
        "token_cost": 100,
        "stock": 50,
        "is_active": True,
    },
    {
        "name": "Plant a Tree Certificate",
        "description": "We plant a tree in your name and send you a digital certificate.",
        "category": "Environment",
        "image_url": "https://images.unsplash.com/photo-1542601906897-b3b6dcebf3ad?w=400&q=80",
        "token_cost": 150,
        "stock": None,   # unlimited
        "is_active": True,
    },
    {
        "name": "Tote Bag",
        "description": "Organic cotton tote bag — carry groceries, not plastic.",
        "category": "Merchandise",
        "image_url": "https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&q=80",
        "token_cost": 120,
        "stock": 40,
        "is_active": True,
    },
    {
        "name": "₹100 Amazon Voucher",
        "description": "Digital Amazon gift voucher sent to your registered email.",
        "category": "Voucher",
        "image_url": "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=80",
        "token_cost": 500,
        "stock": 20,
        "is_active": True,
    },
]

print("Seeding rewards...")
for rw in REWARDS:
    try:
        r = admin.table("rewards").insert(rw).execute()
        print(f"  Created: {rw['name']} ({rw['token_cost']} tokens)")
    except Exception as e:
        print(f"  Error {rw['name']}: {e}")

print("Done.")
