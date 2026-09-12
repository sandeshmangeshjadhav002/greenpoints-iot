"""
Cleaner router — endpoints used by cleaning staff to view bins needing service.
Accessible to users with role='cleaner' or 'admin'.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException

from database import get_admin_client
from routers.auth import get_current_user, require_role
from schemas import TokenData
from services.sensor_service import api_bin

router = APIRouter(prefix="/api/cleaner", tags=["cleaner"])

_cleaner_or_admin = require_role("cleaner", "admin")


@router.get("/bins/full")
def bins_needing_collection(
    threshold: float = 75.0,
    current: TokenData = Depends(_cleaner_or_admin),
):
    """Return all bins at or above fill threshold (default 75 %)."""
    admin = get_admin_client()
    r = (
        admin.table("smart_bins")
        .select("*")
        .gte("fill_level", threshold)
        .order("fill_level", desc=True)
        .execute()
    )
    return {"success": True, "data": [api_bin(row) for row in r.data]}


@router.get("/bins/critical")
def critical_bins(current: TokenData = Depends(_cleaner_or_admin)):
    """Return bins with health='critical'."""
    admin = get_admin_client()
    r = admin.table("smart_bins").select("*").eq("health", "critical").order("fill_level", desc=True).execute()
    return {"success": True, "data": [api_bin(row) for row in r.data]}


@router.post("/bins/{code}/collected")
def mark_bin_collected(
    code: str,
    payload: dict | None = None,
    current: TokenData = Depends(_cleaner_or_admin),
):
    """Mark a bin as emptied — resets fill_level to 0 and sets health to 'good'."""
    admin = get_admin_client()
    r = admin.table("smart_bins").select("*").eq("code", code).limit(1).execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Unknown bin")
    bin_row = r.data[0]

    now = datetime.now(timezone.utc).isoformat()
    admin.table("smart_bins").update({
        "fill_level": 0.0,
        "health": "good",
        "last_seen_at": now,
    }).eq("id", bin_row["id"]).execute()

    # Log a telemetry record for the collection event
    admin.table("bin_telemetry").insert({
        "bin_id": bin_row["id"],
        "fill_level": 0.0,
        "battery": float(bin_row.get("battery") or 0),
        "sensor_status": bin_row.get("sensor_status") or "online",
        "wifi_status": bin_row.get("wifi_status") or "connected",
        "recorded_at": now,
    }).execute()

    notes = (payload or {}).get("notes") or ""
    return {
        "success": True,
        "data": {
            "bin_code": code,
            "fill_level": 0.0,
            "collected_by": current.sub,
            "collected_at": now,
            "notes": notes,
        },
    }


@router.get("/stats")
def cleaner_stats(current: TokenData = Depends(_cleaner_or_admin)):
    """Summary counts useful for a cleaner's dashboard."""
    admin = get_admin_client()
    all_bins = admin.table("smart_bins").select("id, fill_level, health, sensor_status").execute()
    bins = all_bins.data
    total = len(bins)
    critical = sum(1 for b in bins if b.get("health") == "critical")
    near_full = sum(1 for b in bins if float(b.get("fill_level") or 0) >= 75)
    online = sum(1 for b in bins if b.get("sensor_status") == "online")
    return {
        "success": True,
        "data": {
            "total_bins": total,
            "critical_bins": critical,
            "near_full_bins": near_full,
            "online_bins": online,
        },
    }
