from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException

from database import get_admin_client
from routers.auth import get_current_user, require_admin
from schemas import TokenData
from services import points_service
from services.sensor_service import api_bin

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

_COLORS = {
    "Recyclable": "#16A34A",
    "Organic": "#0EA5E9",
    "General": "#6B7280",
    "E-Waste": "#F59E0B",
}


@router.get("/summary")
def user_dashboard_summary(current: TokenData = Depends(get_current_user)):
    admin = get_admin_client()
    r = admin.table("profiles").select("*").eq("id", current.sub).limit(1).execute()
    if not r.data:
        return {"success": True, "data": {}}
    p = r.data[0]
    tokens = int(p.get("token_balance") or 0)
    return {
        "success": True,
        "data": {
            "tokens": tokens,
            "totalWasteKg": float(p.get("total_waste_kg") or 0),
            "co2SavedKg": float(p.get("co2_saved_kg") or 0),
            "streakDays": int(p.get("streak_days") or 0),
            "level": p.get("level") or "Bronze",
            "levelProgress": points_service.level_progress_tokens_percent(current.sub),
            "disposalCount": int(p.get("disposal_count") or 0),
            "rank": points_service.get_user_rank(current.sub),
            "name": p.get("display_name") or current.email.split("@")[0],
            "email": current.email,
            "avatar": p.get("avatar_url"),
        },
    }


@router.get("/weekly-activity")
def weekly_activity(current: TokenData = Depends(get_current_user)):
    admin = get_admin_client()
    now = datetime.now(timezone.utc)
    days = []
    for i in range(6, -1, -1):
        d = now - timedelta(days=i)
        day_name = d.strftime("%a")
        start = d.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
        r = (
            admin.table("recycling_events")
            .select("weight_kg, tokens_earned")
            .eq("user_id", current.sub)
            .gte("created_at", start.isoformat())
            .lt("created_at", end.isoformat())
            .execute()
        )
        kg = round(sum(float(x.get("weight_kg") or 0) for x in r.data), 2)
        tokens = sum(int(x.get("tokens_earned") or 0) for x in r.data)
        days.append({"day": day_name, "kg": kg, "tokens": tokens})
    return {"success": True, "data": days}


@router.get("/waste-distribution")
def waste_distribution(current: TokenData = Depends(get_current_user)):
    admin = get_admin_client()
    r = admin.table("recycling_events").select("waste_type, weight_kg").eq("user_id", current.sub).execute()
    totals: dict[str, float] = {"Recyclable": 0.0, "Organic": 0.0, "General": 0.0, "E-Waste": 0.0}
    for x in r.data:
        wt = x.get("waste_type") or "General"
        if wt in totals:
            totals[wt] += float(x.get("weight_kg") or 0)
    total_all = sum(totals.values()) or 1.0
    out = [
        {"name": k, "value": round((v / total_all) * 100.0, 1), "color": _COLORS[k]}
        for k, v in totals.items()
    ]
    return {"success": True, "data": out}


@router.get("/recent-activity")
def recent_activity(current: TokenData = Depends(get_current_user), limit: int = 10):
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
        try:
            dt = datetime.fromisoformat(str(row["created_at"]).replace("Z", "+00:00"))
            date_str = dt.astimezone().strftime("%d %b, %I:%M %p")
        except Exception:
            date_str = str(row.get("created_at"))
        items.append({
            "id": row["id"],
            "bin": bin_obj.get("code") or "Bin",
            "type": row.get("waste_type") or "General",
            "date": date_str,
            "kg": float(row.get("weight_kg") or 0),
            "tokens": int(row.get("tokens_earned") or 0),
        })
    return {"success": True, "data": items}


@router.get("/badges")
def user_badges(current: TokenData = Depends(get_current_user)):
    admin = get_admin_client()
    r = admin.table("profiles").select("token_balance, disposal_count, streak_days, total_waste_kg").eq("id", current.sub).limit(1).execute()
    p = r.data[0] if r.data else {}
    tokens = int(p.get("token_balance") or 0)
    disposals = int(p.get("disposal_count") or 0)
    streak = int(p.get("streak_days") or 0)
    waste_kg = float(p.get("total_waste_kg") or 0)

    badges = [
        {"id": "first-recycle", "name": "First Step", "icon": "Sparkles", "earned": disposals >= 1, "desc": "Completed your first recycling action"},
        {"id": "week-streak", "name": "7-Day Hero", "icon": "Flame", "earned": streak >= 7, "desc": "Recycled 7 days in a row"},
        {"id": "hundred-kg", "name": "Centurion", "icon": "Award", "earned": waste_kg >= 100, "desc": "Recycled 100 kg total"},
        {"id": "silver-tier", "name": "Silver Tier", "icon": "Cpu", "earned": tokens >= 500, "desc": "Reached Silver level"},
        {"id": "gold-tier", "name": "Gold Tier", "icon": "Users", "earned": tokens >= 2000, "desc": "Reached Gold level"},
        {"id": "platinum-tier", "name": "Platinum", "icon": "Trophy", "earned": tokens >= 5000, "desc": "Reached Platinum level"},
    ]
    return {"success": True, "data": badges}


def _last_n_months(n: int):
    now = datetime.now(timezone.utc)
    return [(now - timedelta(days=30 * i)).replace(day=1, hour=0, minute=0, second=0, microsecond=0) for i in range(n - 1, -1, -1)]


@router.get("/collection-trends")
def collection_trends(_: TokenData = Depends(require_admin)):
    months = _last_n_months(6)
    admin = get_admin_client()
    out = []
    for i in range(len(months)):
        start = months[i]
        end = months[i + 1] if i + 1 < len(months) else datetime.now(timezone.utc)
        r = admin.table("recycling_events").select("weight_kg").gte("created_at", start.isoformat()).lt("created_at", end.isoformat()).execute()
        total_kg = round(sum(float(x.get("weight_kg") or 0) for x in r.data), 2)
        out.append({"month": start.strftime("%b"), "collected": total_kg})
    return {"success": True, "data": out}


@router.get("/category-breakdown")
def category_breakdown(_: TokenData = Depends(require_admin)):
    admin = get_admin_client()
    r = admin.table("recycling_events").select("waste_type, weight_kg").execute()
    totals = {"Recyclable": 0.0, "Organic": 0.0, "General": 0.0, "E-Waste": 0.0}
    for x in r.data:
        wt = x.get("waste_type") or "General"
        if wt in totals:
            totals[wt] += float(x.get("weight_kg") or 0)
    out = [{"category": k, "kg": round(v, 2)} for k, v in totals.items()]
    return {"success": True, "data": out}


@router.get("/token-distribution")
def token_distribution(_: TokenData = Depends(require_admin)):
    months = _last_n_months(6)
    admin = get_admin_client()
    out = []
    for i in range(len(months)):
        start = months[i]
        end = months[i + 1] if i + 1 < len(months) else datetime.now(timezone.utc)
        r = (
            admin.table("points_transactions")
            .select("amount")
            .eq("type", "earn")
            .gte("created_at", start.isoformat())
            .lt("created_at", end.isoformat())
            .execute()
        )
        s = sum(int(x.get("amount") or 0) for x in r.data)
        out.append({"month": start.strftime("%b"), "tokens": s})
    return {"success": True, "data": out}


@router.get("/environmental-impact")
def environmental_impact(_: TokenData = Depends(require_admin)):
    from config import settings as _s
    months = _last_n_months(6)
    admin = get_admin_client()
    out = []
    for i in range(len(months)):
        start = months[i]
        end = months[i + 1] if i + 1 < len(months) else datetime.now(timezone.utc)
        r = admin.table("recycling_events").select("waste_type, weight_kg").gte("created_at", start.isoformat()).lt("created_at", end.isoformat()).execute()
        co2 = water = trees = 0.0
        for x in r.data:
            wt = x.get("waste_type") or "General"
            kg = float(x.get("weight_kg") or 0)
            co2 += _s.co2_for_waste_type(wt, kg)
            water += kg * 15
            trees += kg * 0.001
        out.append({"month": start.strftime("%b"), "co2": round(co2, 2), "water": round(water, 0), "trees": round(trees, 2)})
    return {"success": True, "data": out}


@router.get("/user-growth")
def user_growth(_: TokenData = Depends(require_admin)):
    months = _last_n_months(6)
    admin = get_admin_client()
    out = []
    for m in months:
        r = admin.table("profiles").select("id", count="exact").lte("created_at", (m + timedelta(days=30)).isoformat()).execute()
        out.append({"month": m.strftime("%b"), "users": r.count or 0})
    return {"success": True, "data": out}


@router.get("/bin-usage")
def bin_usage(_: TokenData = Depends(require_admin)):
    admin = get_admin_client()
    bins = admin.table("smart_bins").select("id, code, location").execute()
    by_loc: dict[str, int] = {}
    total = 0
    for b in bins.data:
        loc = b.get("location") or "Unknown"
        c = admin.table("recycling_events").select("id", count="exact").eq("bin_id", b["id"]).execute()
        cnt = c.count or 0
        by_loc[loc] = by_loc.get(loc, 0) + cnt
        total += cnt
    total = total or 1
    out = [{"location": loc, "usage": round((cnt / total) * 100, 1)} for loc, cnt in sorted(by_loc.items(), key=lambda x: -x[1])[:8]]
    return {"success": True, "data": out}


@router.get("/rewards")
def list_rewards(_: TokenData = Depends(get_current_user)):
    admin = get_admin_client()
    r = admin.table("rewards").select("*").eq("is_active", True).order("token_cost").execute()
    out = []
    for x in r.data:
        out.append({
            "id": str(x["id"]),
            "name": x["name"],
            "description": x.get("description"),
            "category": x.get("category"),
            "image": x.get("image_url"),
            "tokens": int(x.get("token_cost") or 0),
            "stock": x.get("stock"),
        })
    return {"success": True, "data": out}


@router.post("/rewards/redeem")
def redeem_reward(
    payload: dict,
    current: TokenData = Depends(get_current_user),
):
    admin = get_admin_client()
    reward_id = payload.get("reward_id")
    if not reward_id:
        raise HTTPException(status_code=400, detail="reward_id required")

    rw = admin.table("rewards").select("*").eq("id", reward_id).limit(1).execute()
    if not rw.data:
        raise HTTPException(status_code=404, detail="Reward not found")
    reward = rw.data[0]
    if not reward.get("is_active"):
        raise HTTPException(status_code=400, detail="Reward not available")
    cost = int(reward.get("token_cost") or 0)

    if reward.get("stock") is not None and int(reward["stock"]) <= 0:
        raise HTTPException(status_code=400, detail="Out of stock")

    try:
        redemption = admin.table("redemptions").insert({
            "user_id": current.sub,
            "reward_id": reward_id,
            "token_cost": cost,
            "status": "pending",
        }).execute()
        rid = redemption.data[0]["id"]

        new_bal = points_service.spend_points(
            user_id=current.sub,
            amount=cost,
            redemption_id=rid,
            description=f"Redeemed: {reward['name']}",
        )

        if reward.get("stock") is not None:
            admin.table("rewards").update({"stock": int(reward["stock"]) - 1}).eq("id", reward_id).execute()

        admin.table("notifications").insert({
            "user_id": current.sub,
            "title": "Reward redeemed!",
            "message": f"Your redemption for {reward['name']} is pending fulfillment.",
            "category": "Reward",
            "read": False,
        }).execute()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"success": True, "data": {"new_balance": new_bal, "redemption_id": rid}}


@router.get("/notifications")
def my_notifications(current: TokenData = Depends(get_current_user), limit: int = 100):
    admin = get_admin_client()
    r = (
        admin.table("notifications")
        .select("*")
        .eq("user_id", current.sub)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    out = []
    _icon_map = {"Alert": "AlertTriangle", "Reward": "Coins", "Achievement": "Trophy", "Update": "Gift"}
    for x in r.data:
        try:
            dt = datetime.fromisoformat(str(x["created_at"]).replace("Z", "+00:00"))
            t = dt.astimezone().strftime("%d %b, %I:%M %p")
        except Exception:
            t = str(x.get("created_at"))
        cat = x.get("category") or "Update"
        out.append({
            "id": str(x["id"]),
            "title": x["title"],
            "message": x["message"],
            "category": cat,
            "read": bool(x.get("read")),
            "time": t,
            "icon": _icon_map.get(cat, "Bell"),
        })
    return {"success": True, "data": out}


@router.post("/notifications/{nid}/read")
def mark_notification_read(nid: str, current: TokenData = Depends(get_current_user)):
    admin = get_admin_client()
    admin.table("notifications").update({"read": True}).eq("id", nid).eq("user_id", current.sub).execute()
    return {"success": True, "data": {"read": True}}


@router.post("/notifications/read-all")
def mark_all_read(current: TokenData = Depends(get_current_user)):
    admin = get_admin_client()
    admin.table("notifications").update({"read": True}).eq("user_id", current.sub).execute()
    return {"success": True, "data": {"updated": True}}


@router.get("/redemptions")
def my_redemptions(current: TokenData = Depends(get_current_user), limit: int = 50):
    """User's own redemption history with current status."""
    admin = get_admin_client()
    r = (admin.table("redemptions")
         .select("*, rewards(name, description, category, image_url)")
         .eq("user_id", current.sub)
         .order("created_at", desc=True)
         .limit(limit)
         .execute())
    out = []
    for row in r.data:
        reward = row.get("rewards") or {}
        def _ts(ts):
            if not ts: return None
            try:
                return datetime.fromisoformat(str(ts).replace("Z", "+00:00")).astimezone().strftime("%d %b %Y, %I:%M %p")
            except Exception:
                return str(ts)
        out.append({
            "id":           str(row["id"]),
            "reward_name":  reward.get("name") or "Reward",
            "reward_image": reward.get("image_url"),
            "category":     reward.get("category"),
            "token_cost":   int(row.get("token_cost") or 0),
            "status":       row.get("status") or "pending",
            "created_at":   _ts(row.get("created_at")),
            "fulfilled_at": _ts(row.get("fulfilled_at")),
            "notes":        row.get("notes"),
        })
    return {"success": True, "data": out}
