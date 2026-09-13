from datetime import datetime, timezone
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

    profiles_r = admin.table("profiles").select("id, display_name, token_balance, created_at").order("created_at", desc=True).limit(limit).execute()
    profiles_map = {row["id"]: row for row in profiles_r.data}

    # Query only guaranteed columns; shop_name may not exist if migration 003 hasn't run
    try:
        roles_r = admin.table("user_roles").select("user_id, role, shop_name").execute()
    except Exception:
        roles_r = admin.table("user_roles").select("user_id, role").execute()
    roles_map = {row["user_id"]: row for row in roles_r.data}

    # Emails from Supabase Auth (requires service role key)
    try:
        auth_users = admin.auth.admin.list_users()
        email_map = {str(u.id): u.email for u in auth_users}
    except Exception:
        email_map = {}

    result = []
    for uid, profile in profiles_map.items():
        role_row = roles_map.get(uid, {})
        result.append({
            "id": uid,
            "email": email_map.get(uid, ""),
            "display_name": profile.get("display_name") or "",
            "token_balance": int(profile.get("token_balance") or 0),
            "role": role_row.get("role") or "user",
            "shop_name": role_row.get("shop_name"),
            "created_at": profile.get("created_at"),
        })
    return {"success": True, "data": result}


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


# ── Admin reward (offer) management ──────────────────────────────────────────

@router.get("/rewards")
def admin_list_rewards(_: TokenData = Depends(require_admin)):
    admin = get_admin_client()
    r = admin.table("rewards").select("*, profiles(display_name)").order("created_at", desc=True).execute()
    out = []
    for row in r.data:
        shop = row.get("profiles") or {}
        out.append({
            "id":         str(row["id"]),
            "name":       row["name"],
            "description":row.get("description"),
            "category":   row.get("category"),
            "image":      row.get("image_url"),
            "token_cost": int(row.get("token_cost") or 0),
            "stock":      row.get("stock"),
            "is_active":  bool(row.get("is_active", True)),
            "shop_id":    str(row.get("shop_id") or ""),
            "shop_name":  shop.get("display_name") or "—",
            "created_at": row.get("created_at"),
        })
    return {"success": True, "data": out}


@router.post("/rewards", status_code=201)
def admin_create_reward(payload: dict, _: TokenData = Depends(require_admin)):
    admin = get_admin_client()
    name = str(payload.get("name", "")).strip()
    token_cost = int(payload.get("token_cost", 0))
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    if token_cost <= 0:
        raise HTTPException(status_code=400, detail="token_cost must be > 0")
    r = admin.table("rewards").insert({
        "name":        name,
        "description": payload.get("description"),
        "category":    payload.get("category"),
        "image_url":   payload.get("image_url"),
        "token_cost":  token_cost,
        "stock":       payload.get("stock"),
        "shop_id":     payload.get("shop_id"),
        "is_active":   bool(payload.get("is_active", True)),
    }).execute()
    return {"success": True, "data": r.data[0]}


@router.put("/rewards/{reward_id}")
def admin_update_reward(reward_id: str, payload: dict, _: TokenData = Depends(require_admin)):
    admin = get_admin_client()
    allowed = {"name","description","category","image_url","token_cost","stock","is_active","shop_id"}
    update = {k: v for k, v in payload.items() if k in allowed}
    if not update:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    r = admin.table("rewards").update(update).eq("id", reward_id).execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Reward not found")
    return {"success": True, "data": r.data[0]}


@router.delete("/rewards/{reward_id}")
def admin_delete_reward(reward_id: str, _: TokenData = Depends(require_admin)):
    admin = get_admin_client()
    admin.table("rewards").update({"is_active": False}).eq("id", reward_id).execute()
    return {"success": True, "data": {"deleted": reward_id}}


# ── Admin bin management ──────────────────────────────────────────────────────

@router.post("/bins")
def admin_create_bin(payload: dict, _: TokenData = Depends(require_admin)):
    import hashlib
    code       = str(payload.get("code", "")).strip().upper()
    location   = str(payload.get("location", "")).strip()
    waste_type = str(payload.get("waste_type", "General"))
    device_key = str(payload.get("device_key", "")).strip()
    height_cm  = float(payload.get("height_cm", 50))
    if not code or not location or not device_key:
        raise HTTPException(status_code=400, detail="code, location and device_key are required")
    if waste_type not in ("Recyclable","Organic","General","E-Waste"):
        raise HTTPException(status_code=400, detail="Invalid waste_type")
    qr_token = hashlib.sha256(f"{code}-qr-ecoloop".encode()).hexdigest()
    key_hash = hashlib.sha256(device_key.encode()).hexdigest()
    admin = get_admin_client()
    try:
        r = admin.table("smart_bins").insert({
            "code": code, "location": location, "waste_type": waste_type,
            "device_key_hash": key_hash, "height_cm": height_cm,
            "qr_token": qr_token, "fill_level": 0, "battery": 100,
            "sensor_status": "offline", "wifi_status": "disconnected", "health": "critical",
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"success": True, "data": r.data[0]}


@router.put("/bins/{code}")
def admin_update_bin(code: str, payload: dict, _: TokenData = Depends(require_admin)):
    import hashlib
    admin = get_admin_client()
    allowed = {"location","waste_type","height_cm"}
    update = {k: v for k, v in payload.items() if k in allowed}
    if "device_key" in payload:
        update["device_key_hash"] = hashlib.sha256(str(payload["device_key"]).encode()).hexdigest()
    if not update:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    r = admin.table("smart_bins").update(update).eq("code", code).execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Bin not found")
    return {"success": True, "data": r.data[0]}


@router.delete("/bins/{code}")
def admin_delete_bin(code: str, _: TokenData = Depends(require_admin)):
    admin = get_admin_client()
    admin.table("smart_bins").delete().eq("code", code).execute()
    return {"success": True, "data": {"deleted": code}}


# ── Admin task management ─────────────────────────────────────────────────────

@router.get("/tasks")
def admin_list_tasks(status: str = "open", _: TokenData = Depends(require_admin)):
    admin = get_admin_client()
    q = (admin.table("cleaning_tasks")
         .select("*, smart_bins(code, location), profiles(display_name)")
         .order("created_at", desc=True).limit(200))
    if status != "all":
        q = q.eq("status", status)
    return {"success": True, "data": q.execute().data}


@router.post("/tasks")
def admin_create_task(payload: dict, _: TokenData = Depends(require_admin)):
    admin = get_admin_client()
    bin_code = str(payload.get("bin_code", "")).strip()
    if not bin_code:
        raise HTTPException(status_code=400, detail="bin_code required")
    bin_r = admin.table("smart_bins").select("id").eq("code", bin_code).limit(1).execute()
    if not bin_r.data:
        raise HTTPException(status_code=404, detail="Unknown bin")
    r = admin.table("cleaning_tasks").insert({
        "bin_id":      bin_r.data[0]["id"],
        "assigned_to": payload.get("assigned_to"),
        "priority":    payload.get("priority", "normal"),
        "notes":       payload.get("notes"),
    }).execute()
    return {"success": True, "data": r.data[0]}


@router.post("/tasks/{task_id}/assign")
def admin_assign_task(task_id: str, payload: dict, _: TokenData = Depends(require_admin)):
    admin = get_admin_client()
    cleaner_id = payload.get("cleaner_id")
    admin.table("cleaning_tasks").update({
        "assigned_to": cleaner_id,
        "status": "open" if not cleaner_id else "in_progress",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", task_id).execute()
    return {"success": True, "data": {"task_id": task_id, "assigned_to": cleaner_id}}


# ── Admin redemption overview ─────────────────────────────────────────────────

@router.get("/redemptions")
def admin_all_redemptions(status: str = "all", limit: int = 200, _: TokenData = Depends(require_admin)):
    admin = get_admin_client()
    q = (admin.table("redemptions")
         .select("*, rewards(name, shop_id), profiles(display_name, id)")
         .order("created_at", desc=True).limit(limit))
    if status != "all":
        q = q.eq("status", status)
    return {"success": True, "data": q.execute().data}
