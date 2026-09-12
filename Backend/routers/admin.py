from fastapi import APIRouter, Depends, HTTPException

from database import get_admin_client
from routers.auth import require_admin
from schemas import TokenData
from services.sensor_service import api_bin

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats")
def admin_stats(_: TokenData = Depends(require_admin)):
    admin = get_admin_client()

    users = admin.table("profiles").select("id", count="exact").execute()
    bins = admin.table("smart_bins").select("id, fill_level, sensor_status, health").execute()
    events = admin.table("recycling_events").select("weight_kg, tokens_earned").execute()
    points_earned = admin.table("points_transactions").select("amount").eq("type", "earn").execute()

    total_waste = round(sum(float(x.get("weight_kg") or 0) for x in events.data), 3)
    total_tokens = sum(int(x.get("amount") or 0) for x in points_earned.data)
    co2 = round(total_waste * 1.2, 3)

    online_bins = sum(1 for b in bins.data if b.get("sensor_status") == "online")
    critical_bins = sum(1 for b in bins.data if b.get("health") == "critical")

    return {
        "success": True,
        "data": {
            "totalUsers": users.count or 0,
            "totalBins": len(bins.data),
            "totalWasteKg": total_waste,
            "totalTokensIssued": total_tokens,
            "co2SavedKg": co2,
            "onlineBins": online_bins,
            "criticalBins": critical_bins,
        },
    }


@router.get("/users")
def list_users(limit: int = 200, _: TokenData = Depends(require_admin)):
    admin = get_admin_client()
    r = admin.table("profiles").select("*").order("created_at", desc=True).limit(limit).execute()
    return {"success": True, "data": r.data}


@router.get("/bins")
def admin_list_bins(_: TokenData = Depends(require_admin)):
    admin = get_admin_client()
    r = admin.table("smart_bins").select("*").order("code").execute()
    return {"success": True, "data": [api_bin(row) for row in r.data]}


@router.get("/sensor-readings")
def sensor_readings(bin_id: str | None = None, limit: int = 200, _: TokenData = Depends(require_admin)):
    admin = get_admin_client()
    q = admin.table("sensor_readings").select("*, smart_bins(code)").order("recorded_at", desc=True).limit(limit)
    if bin_id:
        q = q.eq("bin_id", bin_id)
    return {"success": True, "data": q.execute().data}


@router.get("/recycling-events")
def recycling_events(limit: int = 200, _: TokenData = Depends(require_admin)):
    admin = get_admin_client()
    r = (
        admin.table("recycling_events")
        .select("*, profiles(display_name), smart_bins(code, location)")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return {"success": True, "data": r.data}


@router.get("/points-transactions")
def points_transactions(limit: int = 300, _: TokenData = Depends(require_admin)):
    admin = get_admin_client()
    r = admin.table("points_transactions").select("*, profiles(display_name)").order("created_at", desc=True).limit(limit).execute()
    return {"success": True, "data": r.data}


@router.get("/full-bins")
def full_bin_monitoring(_: TokenData = Depends(require_admin)):
    admin = get_admin_client()
    r = admin.table("smart_bins").select("*").gte("fill_level", 75).order("fill_level", desc=True).execute()
    return {"success": True, "data": [api_bin(x) for x in r.data]}


@router.post("/users/{user_id}/adjust-points")
def admin_adjust_points(user_id: str, payload: dict, _: TokenData = Depends(require_admin)):
    from services import points_service
    amount = int(payload.get("amount", 0))
    description = payload.get("description") or "Admin adjustment"
    if amount == 0:
        raise HTTPException(status_code=400, detail="amount must be non-zero")
    if amount > 0:
        new_bal = points_service.award_points(user_id, amount, description=description)
    else:
        try:
            new_bal = points_service.spend_points(user_id, abs(amount), description=description)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    return {"success": True, "data": {"new_balance": new_bal}}
