"""Run once to seed the 4 physical smart bins."""
import hashlib, secrets
from database import get_admin_client

admin = get_admin_client()

BINS = [
    {"code": "BIN-001", "location": "Main Entrance", "waste_type": "Recyclable"},
    {"code": "BIN-002", "location": "Cafeteria",     "waste_type": "Organic"},
    {"code": "BIN-003", "location": "Lab Block",     "waste_type": "E-Waste"},
    {"code": "BIN-004", "location": "Parking Area",  "waste_type": "General"},
]

print("=" * 60)
for b in BINS:
    device_key = secrets.token_hex(24)
    key_hash   = hashlib.sha256(device_key.encode()).hexdigest()
    qr_token   = hashlib.sha256((b["code"] + "-qr-ecoloop").encode()).hexdigest()
    row = {
        "code":            b["code"],
        "location":        b["location"],
        "waste_type":      b["waste_type"],
        "device_key_hash": key_hash,
        "fill_level":      0,
        "battery":         100,
        "sensor_status":   "online",
        "wifi_status":     "connected",
        "health":          "good",
        "qr_token":        qr_token,
    }
    try:
        admin.table("smart_bins").insert(row).execute()
        print(f"CREATED  {b['code']} | {b['location']} | {b['waste_type']}")
        print(f"         device_key : {device_key}")
        print(f"         qr_token   : {qr_token}")
        print()
    except Exception as e:
        if "duplicate" in str(e).lower() or "unique" in str(e).lower():
            print(f"SKIPPED  {b['code']} (already exists)")
        else:
            print(f"ERROR    {b['code']}: {e}")
print("=" * 60)
print("Done. Save the device_key values for your ESP32 firmware.")
