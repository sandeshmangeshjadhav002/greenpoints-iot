from fastapi import APIRouter, Depends, HTTPException

from database import get_admin_client, supabase
from routers.auth import get_current_user, require_admin
from schemas import BinCreate, TokenData
from services.sensor_service import api_bin, hash_device_key

router = APIRouter(prefix="/api/bins", tags=["bins"])


@router.get("")
def list_bins():
    response = supabase.table("smart_bins").select("*").order("code").execute()
    return [api_bin(row) for row in response.data]


@router.get("/all-qr")
def all_bins_qr(_: TokenData = Depends(get_current_user)):
    """Return every bin with its QR token and scan URL — used by the printable QR page."""
    import hashlib
    admin = get_admin_client()
    r = admin.table("smart_bins").select("id, code, location, waste_type, qr_token").order("code").execute()
    base = "http://localhost:5173"  # overridden on the frontend
    out = []
    for row in r.data:
        qt = row.get("qr_token") or hashlib.sha256((row["code"] + "-qr-ecoloop").encode()).hexdigest()
        out.append({
            "id":        row.get("id"),
            "code":      row["code"],
            "location":  row["location"],
            "wasteType": row["waste_type"],
            "qrToken":   qt,
            "scanUrl":   f"/scan?bin={qt}",
        })
    return {"success": True, "data": out}


@router.get("/{code}")
def get_bin(code: str):
    r = supabase.table("smart_bins").select("*").eq("code", code).limit(1).execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Unknown bin")
    return api_bin(r.data[0])


@router.get("/{code}/latest-reading")
def bin_latest_reading(code: str, _: TokenData = Depends(get_current_user)):
    admin = get_admin_client()
    bin_r = admin.table("smart_bins").select("id").eq("code", code).limit(1).execute()
    if not bin_r.data:
        raise HTTPException(status_code=404, detail="Unknown bin")
    bin_id = bin_r.data[0]["id"]
    tel = (
        admin.table("bin_telemetry")
        .select("*")
        .eq("bin_id", bin_id)
        .order("recorded_at", desc=True)
        .limit(1)
        .execute()
    )
    sensor = (
        admin.table("sensor_readings")
        .select("*")
        .eq("bin_id", bin_id)
        .order("recorded_at", desc=True)
        .limit(1)
        .execute()
    )
    return {
        "success": True,
        "data": {
            "telemetry": tel.data[0] if tel.data else None,
            "sensor": sensor.data[0] if sensor.data else None,
        },
    }


@router.post("")
def create_bin(data: BinCreate, _: TokenData = Depends(require_admin)):
    admin = get_admin_client()
    try:
        r = admin.table("smart_bins").insert({
            "code": data.code,
            "location": data.location,
            "waste_type": data.waste_type,
            "device_key_hash": hash_device_key(data.device_key),
            "height_cm": data.height_cm,
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"success": True, "data": api_bin(r.data[0])}


@router.put("/{code}")
def update_bin(code: str, data: dict, _: TokenData = Depends(require_admin)):
    admin = get_admin_client()
    allowed = {"location", "waste_type", "height_cm"}
    payload = {k: v for k, v in data.items() if k in allowed}
    if "device_key" in data:
        payload["device_key_hash"] = hash_device_key(data["device_key"])
    r = admin.table("smart_bins").update(payload).eq("code", code).execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Unknown bin")
    return {"success": True, "data": api_bin(r.data[0])}


@router.delete("/{code}")
def delete_bin(code: str, _: TokenData = Depends(require_admin)):
    admin = get_admin_client()
    r = admin.table("smart_bins").delete().eq("code", code).execute()
    return {"success": True, "data": {"deleted": len(r.data)}}
