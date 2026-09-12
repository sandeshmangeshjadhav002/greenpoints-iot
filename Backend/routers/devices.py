from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, Depends

from config import settings
from database import get_admin_client
from routers.auth import get_current_user, require_admin
from schemas import TokenData
from services import points_service
from services.sensor_service import (
    bin_from_device_id,
    verify_device_key,
    store_sensor_reading,
    distance_to_fill_percent,
    update_bin_status,
    detect_disposal_event,
    api_bin,
    hash_device_key,
)

router = APIRouter(prefix="/api/devices", tags=["devices"])


def _get_manager():
    from main import manager
    return manager


async def _broadcast_bin_updated(bin_row: dict) -> None:
    manager = _get_manager()
    data = api_bin(bin_row)
    await manager.broadcast({"type": "bin.updated", "bin": data})


def _record_recycling_event(
    bin_row: dict,
    weight_kg: float,
    waste_type_override: Optional[str] = None,
) -> dict:
    admin = get_admin_client()
    waste_type = waste_type_override or bin_row.get("waste_type") or "General"
    tokens = settings.points_for_waste_type(waste_type, weight_kg)
    r = admin.table("recycling_events").insert({
        "bin_id": bin_row["id"],
        "waste_type": waste_type,
        "weight_kg": round(float(weight_kg), 3),
        "tokens_earned": tokens,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }).execute()
    admin.table("smart_bins").update({
        "last_disposal_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", bin_row["id"]).execute()
    return r.data[0] if r.data else {}


@router.post("/sensor-data")
async def ingest_ultrasonic_sensor(
    payload: dict,
    x_device_key: Optional[str] = Header(default=None),
):
    try:
        device_id = str(payload["device_id"])
        ultrasonic_distance = float(payload["ultrasonic_distance"])
        ir_detected = bool(payload["ir_detected"])
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid payload: expected {device_id, ultrasonic_distance, ir_detected}")

    if ultrasonic_distance < 0 or ultrasonic_distance > 500:
        raise HTTPException(status_code=400, detail="ultrasonic_distance out of range [0, 500]")

    bin_row = bin_from_device_id(device_id)
    verify_device_key(bin_row, x_device_key)

    height_cm = float(bin_row.get("height_cm") or settings.default_bin_height_cm)
    fill_pct = distance_to_fill_percent(ultrasonic_distance, height_cm)

    store_sensor_reading(
        bin_id=str(bin_row["id"]),
        device_id=device_id,
        ultrasonic_distance_cm=round(ultrasonic_distance, 2),
        ir_detected=ir_detected,
        calculated_fill_percent=fill_pct,
        bin_height_cm=height_cm,
    )

    disposed, est_weight_kg = detect_disposal_event(
        bin_id=str(bin_row["id"]),
        new_fill_percent=fill_pct,
        ir_detected=ir_detected,
    )
    recycling_event = {}
    if disposed and est_weight_kg > 0:
        recycling_event = _record_recycling_event(bin_row, est_weight_kg)

    updated_bin = update_bin_status(
        bin_id=str(bin_row["id"]),
        fill_level=fill_pct,
        battery=None,
        sensor_status="online",
        wifi_status="connected",
        weight_kg=est_weight_kg if disposed else None,
    )
    await _broadcast_bin_updated(updated_bin)

    return {
        "success": True,
        "data": {
            "accepted": True,
            "bin": api_bin(updated_bin),
            "fill_percent": fill_pct,
            "disposal_detected": disposed,
            "estimated_weight_kg": est_weight_kg,
            "recycling_event_id": recycling_event.get("id"),
        },
    }


@router.post("/{code}/telemetry")
async def ingest_legacy_telemetry(
    code: str,
    telemetry: dict,
    x_device_key: Optional[str] = Header(default=None),
):
    try:
        fill_level = float(telemetry["fill_level"])
        battery = float(telemetry["battery"])
        sensor_status = str(telemetry.get("sensor_status", "online"))
        wifi_status = str(telemetry.get("wifi_status", "connected"))
        weight_kg = telemetry.get("weight_kg")
        temperature_c = telemetry.get("temperature_c")
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid telemetry payload")

    if fill_level < 0 or fill_level > 100:
        raise HTTPException(status_code=400, detail="fill_level out of range")
    if battery < 0 or battery > 100:
        raise HTTPException(status_code=400, detail="battery out of range")

    bin_row = bin_from_device_id(code)
    verify_device_key(bin_row, x_device_key)

    updated_bin = update_bin_status(
        bin_id=str(bin_row["id"]),
        fill_level=fill_level,
        battery=battery,
        sensor_status=sensor_status,
        wifi_status=wifi_status,
        weight_kg=weight_kg,
        temperature_c=temperature_c,
    )
    await _broadcast_bin_updated(updated_bin)
    return {"accepted": True, "bin": api_bin(updated_bin)}


@router.post("/bins/create")
def admin_create_bin(
    payload: dict,
    _: TokenData = Depends(require_admin),
):
    try:
        code = str(payload["code"])
        location = str(payload["location"])
        waste_type = str(payload["waste_type"])
        device_key = str(payload["device_key"])
        height_cm = float(payload.get("height_cm", settings.default_bin_height_cm))
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Missing or invalid fields")

    if waste_type not in ("Recyclable", "Organic", "General", "E-Waste"):
        raise HTTPException(status_code=400, detail="Invalid waste_type")

    admin = get_admin_client()
    try:
        r = admin.table("smart_bins").insert({
            "code": code,
            "location": location,
            "waste_type": waste_type,
            "device_key_hash": hash_device_key(device_key),
            "height_cm": height_cm,
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"success": True, "data": api_bin(r.data[0])}


@router.post("/disposals/{event_id}/claim")
def claim_disposal_points(
    event_id: str,
    current: TokenData = Depends(get_current_user),
):
    admin = get_admin_client()
    evt = admin.table("recycling_events").select("*").eq("id", event_id).limit(1).execute()
    if not evt.data:
        raise HTTPException(status_code=404, detail="Event not found")
    ev = evt.data[0]
    if ev.get("user_id"):
        raise HTTPException(status_code=409, detail="This disposal was already claimed")

    tokens = int(ev.get("tokens_earned") or 0)
    waste_type = str(ev.get("waste_type") or "General")
    weight_kg = float(ev.get("weight_kg") or 0)

    admin.table("recycling_events").update({"user_id": current.sub}).eq("id", event_id).execute()

    try:
        new_balance = points_service.award_points(
            user_id=current.sub,
            amount=tokens,
            recycling_event_id=event_id,
            description=f"{waste_type} recycling · {weight_kg}kg",
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    points_service.update_user_stats_after_disposal(
        user_id=current.sub,
        waste_type=waste_type,
        weight_kg=weight_kg,
        tokens_earned=tokens,
    )

    admin.table("notifications").insert({
        "user_id": current.sub,
        "title": f"+{tokens} EcoPoints earned!",
        "message": f"You recycled {weight_kg}kg of {waste_type}. Keep up the great work!",
        "category": "Reward",
        "read": False,
    }).execute()

    return {
        "success": True,
        "data": {
            "tokens_earned": tokens,
            "new_balance": new_balance,
            "event_id": event_id,
        },
    }
