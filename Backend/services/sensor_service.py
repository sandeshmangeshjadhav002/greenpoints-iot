import hashlib
from datetime import datetime, timezone
from typing import Optional, Tuple

from fastapi import HTTPException

from config import settings
from database import get_admin_client


def distance_to_fill_percent(distance_cm: float, bin_height_cm: float) -> float:
    if bin_height_cm <= 0:
        return 0.0
    filled_height = max(0.0, float(bin_height_cm) - max(0.0, float(distance_cm)))
    raw_pct = (filled_height / float(bin_height_cm)) * 100.0
    return round(max(0.0, min(100.0, raw_pct)), 2)


def compute_health(fill_level: float, battery: float) -> str:
    if fill_level >= 90 or battery < 20:
        return "critical"
    if fill_level >= settings.near_full_threshold_percent or battery < 35:
        return "warning"
    return "good"


def bin_from_device_id(device_id: str) -> dict:
    admin = get_admin_client()
    r = admin.table("smart_bins").select("*").eq("code", device_id).limit(1).execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Unknown device/bin")
    return r.data[0]


def verify_device_key(bin_row: dict, device_key: Optional[str]) -> None:
    if not device_key:
        raise HTTPException(status_code=401, detail="Missing device key")
    expected_hash = bin_row.get("device_key_hash") or ""
    if hashlib.sha256(device_key.encode()).hexdigest() != expected_hash:
        raise HTTPException(status_code=401, detail="Invalid device key")


def hash_device_key(plain: str) -> str:
    return hashlib.sha256(plain.encode()).hexdigest()


def store_sensor_reading(
    bin_id: str,
    device_id: str,
    ultrasonic_distance_cm: Optional[float],
    ir_detected: bool,
    calculated_fill_percent: Optional[float],
    bin_height_cm: Optional[float],
) -> None:
    admin = get_admin_client()
    admin.table("sensor_readings").insert({
        "bin_id": bin_id,
        "device_id": device_id,
        "ultrasonic_distance_cm": ultrasonic_distance_cm,
        "ir_detected": bool(ir_detected),
        "calculated_fill_percent": calculated_fill_percent,
        "bin_height_cm": bin_height_cm,
    }).execute()


def update_bin_status(
    bin_id: str,
    fill_level: float,
    battery: Optional[float] = None,
    sensor_status: str = "online",
    wifi_status: str = "connected",
    weight_kg: Optional[float] = None,
    temperature_c: Optional[float] = None,
) -> dict:
    admin = get_admin_client()
    now = datetime.now(timezone.utc).isoformat()

    current_batt = battery
    if current_batt is None:
        curr = admin.table("smart_bins").select("battery").eq("id", bin_id).limit(1).execute()
        current_batt = float(curr.data[0]["battery"]) if curr.data else 0.0

    health = compute_health(fill_level, float(current_batt or 0.0))

    admin.table("bin_telemetry").insert({
        "bin_id": bin_id,
        "fill_level": round(float(fill_level), 2),
        "battery": round(float(current_batt or 0.0), 2),
        "sensor_status": sensor_status,
        "wifi_status": wifi_status,
        "weight_kg": weight_kg,
        "temperature_c": temperature_c,
        "recorded_at": now,
    }).execute()

    upd = admin.table("smart_bins").update({
        "fill_level": round(float(fill_level), 2),
        "battery": round(float(current_batt or 0.0), 2),
        "sensor_status": sensor_status,
        "wifi_status": wifi_status,
        "health": health,
        "last_seen_at": now,
    }).eq("id", bin_id).execute()

    return upd.data[0]


def detect_disposal_event(
    bin_id: str,
    new_fill_percent: float,
    ir_detected: bool,
) -> Tuple[bool, float]:
    admin = get_admin_client()
    last = (
        admin.table("bin_telemetry")
        .select("fill_level, recorded_at")
        .eq("bin_id", bin_id)
        .order("recorded_at", desc=True)
        .limit(1)
        .execute()
    )
    if not last.data:
        if ir_detected and new_fill_percent > 5:
            return True, round(new_fill_percent * 0.05, 2)
        return False, 0.0

    previous_fill = float(last.data[0]["fill_level"] or 0)
    delta = new_fill_percent - previous_fill

    disposed = ir_detected and delta > 1.0
    if not disposed:
        return False, 0.0

    weight_kg = round(max(0.1, delta * 0.05), 2)
    return True, weight_kg


def is_bin_online(last_seen_at: Optional[str]) -> bool:
    if not last_seen_at:
        return False
    try:
        dt = datetime.fromisoformat(str(last_seen_at).replace("Z", "+00:00"))
    except Exception:
        return False
    age = (datetime.now(timezone.utc) - dt).total_seconds()
    return age <= settings.offline_timeout_seconds


def api_bin(row: dict) -> dict:
    last = row.get("last_seen_at")
    return {
        "id": row["code"],
        "location": row["location"],
        "wasteType": row["waste_type"],
        "fillLevel": float(row.get("fill_level") or 0),
        "battery": float(row.get("battery") or 0),
        "sensor": row.get("sensor_status") or "offline",
        "wifi": row.get("wifi_status") or "disconnected",
        "health": row.get("health") or "critical",
        "lastUpdated": last,
    }
