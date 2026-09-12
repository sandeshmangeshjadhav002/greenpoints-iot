from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException

from config import settings
from database import get_admin_client
from routers.auth import get_current_user
from schemas import WasteDisposalCreate, TokenData
from services import points_service
from services.sensor_service import api_bin

router = APIRouter(prefix="/api/waste", tags=["waste"])


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

    waste_type = data.manual_waste_type or bin_row.get("waste_type") or "General"

    recent = (
        admin.table("recycling_events")
        .select("id, created_at")
        .eq("user_id", current.sub)
        .eq("bin_id", bin_row["id"])
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if recent.data:
        try:
            dt = datetime.fromisoformat(str(recent.data[0]["created_at"]).replace("Z", "+00:00"))
            if (datetime.now(timezone.utc) - dt).total_seconds() < 30:
                raise HTTPException(status_code=409, detail="Duplicate submission: please wait a moment.")
        except HTTPException:
            raise
        except Exception:
            pass

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

    admin.table("smart_bins").update({
        "last_disposal_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", bin_row["id"]).execute()

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
