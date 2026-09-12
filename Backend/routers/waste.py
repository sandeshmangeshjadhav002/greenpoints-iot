import hashlib
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException

from config import settings
from database import get_admin_client
from routers.auth import get_current_user
from schemas import WasteDisposalCreate, TokenData
from services import points_service
from services.sensor_service import api_bin

router = APIRouter(prefix="/api/waste", tags=["waste"])


# ── helpers ──────────────────────────────────────────────────────────────────

def _resolve_bin_by_qr(qr_token: str) -> dict:
    """Look up a bin row by its QR token (sha256 of code+salt)."""
    admin = get_admin_client()
    r = admin.table("smart_bins").select("*").eq("qr_token", qr_token).limit(1).execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Invalid or unknown QR code")
    return r.data[0]


def _duplicate_check(admin, user_id: str, bin_id: str, window_seconds: int = 30) -> None:
    recent = (
        admin.table("recycling_events")
        .select("id, created_at")
        .eq("user_id", user_id)
        .eq("bin_id", bin_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if recent.data:
        try:
            dt = datetime.fromisoformat(str(recent.data[0]["created_at"]).replace("Z", "+00:00"))
            if (datetime.now(timezone.utc) - dt).total_seconds() < window_seconds:
                raise HTTPException(status_code=409, detail="Duplicate submission: please wait a moment.")
        except HTTPException:
            raise
        except Exception:
            pass


def _create_recycling_event(admin, user_id: str, bin_row: dict, weight_kg: float,
                             waste_type: str | None = None) -> dict:
    wt = waste_type or bin_row.get("waste_type") or "General"
    tokens = settings.points_for_waste_type(wt, weight_kg)
    r = admin.table("recycling_events").insert({
        "user_id": user_id,
        "bin_id": bin_row["id"],
        "waste_type": wt,
        "weight_kg": round(weight_kg, 3),
        "tokens_earned": tokens,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }).execute()
    admin.table("smart_bins").update({
        "last_disposal_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", bin_row["id"]).execute()
    return r.data[0], wt, tokens


def _award_and_notify(admin, user_id: str, event: dict, wt: str, weight_kg: float, tokens: int) -> int:
    new_balance = points_service.award_points(
        user_id=user_id,
        amount=tokens,
        recycling_event_id=event["id"],
        description=f"QR scan: {wt} · {weight_kg}kg",
    )
    points_service.update_user_stats_after_disposal(
        user_id=user_id,
        waste_type=wt,
        weight_kg=weight_kg,
        tokens_earned=tokens,
    )
    admin.table("notifications").insert({
        "user_id": user_id,
        "title": f"+{tokens} EcoPoints earned!",
        "message": f"You recycled {weight_kg}kg of {wt} at {event.get('bin_location', 'bin')}. Keep it up!",
        "category": "Reward",
        "read": False,
    }).execute()
    return new_balance


@router.post("/dispose")
def record_manual_disposal(
    data: WasteDisposalCreate,
    current: TokenData = Depends(get_current_user),
):
    admin = get_admin_client()
    bin_r = admin.table("smart_bins").select("*").eq("code", data.bin_code).limit(1).execute()
    if not bin_r.data:
        raise HTTPException(status_code=404, detail="Unknown bin")
    bin_row = bin_r.data[0]

    _duplicate_check(admin, current.sub, bin_row["id"])

    waste_type = data.manual_waste_type or bin_row.get("waste_type") or "General"
    weight_kg = float(data.weight_kg)
    tokens_earned = settings.points_for_waste_type(waste_type, weight_kg)

    r = admin.table("recycling_events").insert({
        "user_id": current.sub,
        "bin_id": bin_row["id"],
        "waste_type": waste_type,
        "weight_kg": round(weight_kg, 3),
        "tokens_earned": tokens_earned,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }).execute()
    event = r.data[0]
    admin.table("smart_bins").update({
        "last_disposal_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", bin_row["id"]).execute()

    try:
        new_balance = points_service.award_points(
            user_id=current.sub,
            amount=tokens_earned,
            recycling_event_id=event["id"],
            description=f"Manual: {waste_type} · {weight_kg}kg",
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    points_service.update_user_stats_after_disposal(
        user_id=current.sub,
        waste_type=waste_type,
        weight_kg=weight_kg,
        tokens_earned=tokens_earned,
    )

    admin.table("notifications").insert({
        "user_id": current.sub,
        "title": f"+{tokens_earned} EcoPoints!",
        "message": f"Thanks for recycling {weight_kg}kg of {waste_type}.",
        "category": "Reward",
        "read": False,
    }).execute()

    return {
        "success": True,
        "data": {
            "event_id": event["id"],
            "waste_type": waste_type,
            "weight_kg": weight_kg,
            "tokens_earned": tokens_earned,
            "new_balance": new_balance,
            "bin": api_bin(bin_row),
        },
    }


@router.post("/scan-qr")
def scan_qr(
    payload: dict,
    current: TokenData = Depends(get_current_user),
):
    """
    Called when a user scans a bin QR code.
    Payload: { qr_token: str, weight_kg: float, manual_waste_type?: str }
    Returns tokens earned and new balance.
    """
    qr_token = payload.get("qr_token", "").strip()
    if not qr_token:
        raise HTTPException(status_code=400, detail="qr_token is required")

    try:
        weight_kg = float(payload.get("weight_kg", 0))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="weight_kg must be a number")
    if weight_kg <= 0 or weight_kg > 500:
        raise HTTPException(status_code=400, detail="weight_kg must be between 0 and 500")

    manual_waste_type = payload.get("manual_waste_type")
    if manual_waste_type and manual_waste_type not in ("Recyclable", "Organic", "General", "E-Waste"):
        raise HTTPException(status_code=400, detail="Invalid waste type")

    admin = get_admin_client()
    bin_row = _resolve_bin_by_qr(qr_token)
    _duplicate_check(admin, current.sub, bin_row["id"])

    event, wt, tokens = _create_recycling_event(admin, current.sub, bin_row, weight_kg, manual_waste_type)
    try:
        new_balance = _award_and_notify(admin, current.sub, event, wt, weight_kg, tokens)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "success": True,
        "data": {
            "event_id": event["id"],
            "bin_code": bin_row["code"],
            "bin_location": bin_row["location"],
            "waste_type": wt,
            "weight_kg": weight_kg,
            "tokens_earned": tokens,
            "new_balance": new_balance,
        },
    }


@router.get("/bin-qr/{code}")
def get_bin_qr(code: str, _: TokenData = Depends(get_current_user)):
    """Return the QR token and a URL for a given bin code (for generating QR images)."""
    admin = get_admin_client()
    r = admin.table("smart_bins").select("code, location, waste_type, qr_token").eq("code", code).limit(1).execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Unknown bin")
    row = r.data[0]
    # Generate qr_token on-the-fly if missing (e.g. before migration ran)
    import hashlib
    qt = row.get("qr_token") or hashlib.sha256(f"{code}-qr-ecoloop".encode()).hexdigest()
    return {
        "success": True,
        "data": {
            "bin_code": row["code"],
            "bin_location": row["location"],
            "waste_type": row["waste_type"],
            "qr_token": qt,
            "scan_url": f"/scan?bin={qt}",
        },
    }


@router.get("/history")
def my_recycling_history(
    current: TokenData = Depends(get_current_user),
    limit: int = 50,
):
    admin = get_admin_client()
    r = (
        admin.table("recycling_events")
        .select("*, smart_bins(code, location)")
        .eq("user_id", current.sub)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    items = []
    for row in r.data:
        bin_obj = row.get("smart_bins") or {}
        items.append({
            "id": row["id"],
            "bin_code": bin_obj.get("code"),
            "bin_location": bin_obj.get("location"),
            "waste_type": row.get("waste_type"),
            "weight_kg": float(row.get("weight_kg") or 0),
            "tokens_earned": int(row.get("tokens_earned") or 0),
            "created_at": row.get("created_at"),
        })
    return {"success": True, "data": items}
