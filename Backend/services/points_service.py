from datetime import datetime, timezone
from typing import Optional

from config import settings
from database import get_admin_client


def award_points(
    user_id: str,
    amount: int,
    recycling_event_id: Optional[str] = None,
    description: Optional[str] = None,
) -> int:
    admin = get_admin_client()
    result = admin.rpc(
        "award_points",
        {
            "p_user_id": user_id,
            "p_amount": amount,
            "p_recycling_event_id": recycling_event_id,
            "p_description": description,
        },
    ).execute()
    return int(result.data)


def spend_points(
    user_id: str,
    amount: int,
    redemption_id: Optional[str] = None,
    description: Optional[str] = None,
) -> int:
    admin = get_admin_client()
    result = admin.rpc(
        "spend_points",
        {
            "p_user_id": user_id,
            "p_amount": amount,
            "p_redemption_id": redemption_id,
            "p_description": description,
        },
    ).execute()
    return int(result.data)


def get_balance(user_id: str) -> int:
    admin = get_admin_client()
    r = admin.table("profiles").select("token_balance").eq("id", user_id).limit(1).execute()
    if not r.data:
        return 0
    return int(r.data[0]["token_balance"] or 0)


def get_transaction_history(user_id: str, limit: int = 50):
    admin = get_admin_client()
    r = (
        admin.table("points_transactions")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return r.data


def get_leaderboard(limit: int = 50):
    admin = get_admin_client()
    r = (
        admin.table("profiles")
        .select("id, display_name, avatar_url, token_balance, total_waste_kg")
        .gte("token_balance", 0)
        .order("token_balance", desc=True)
        .limit(limit)
        .execute()
    )
    try:
        auth_users = admin.auth.admin.list_users()
        email_map = {str(u.id): u.email for u in auth_users}
    except Exception:
        email_map = {}

    entries = []
    for idx, row in enumerate(r.data, start=1):
        uid = str(row.get("id") or "")
        raw_name = row.get("display_name") or ""
        if not raw_name.strip():
            email = email_map.get(uid, "")
            raw_name = email.split("@")[0] if email else "User"
        entries.append({
            "rank":    idx,
            "name":    raw_name,
            "avatar":  row.get("avatar_url"),
            "points":  int(row.get("token_balance") or 0),
            "wasteKg": float(row.get("total_waste_kg") or 0),
        })
    return entries


def get_user_rank(user_id: str) -> Optional[int]:
    admin = get_admin_client()
    r = admin.table("profiles").select("token_balance").eq("id", user_id).limit(1).execute()
    if not r.data:
        return None
    my_tokens = r.data[0]["token_balance"] or 0
    r2 = admin.table("profiles").select("id", count="exact").gt("token_balance", my_tokens).execute()
    return (r2.count or 0) + 1


def update_user_stats_after_disposal(
    user_id: str,
    waste_type: str,
    weight_kg: float,
    tokens_earned: int,
) -> None:
    admin = get_admin_client()
    now = datetime.now(timezone.utc).date()

    profile_r = admin.table("profiles").select("*").eq("id", user_id).limit(1).execute()
    if not profile_r.data:
        return
    p = profile_r.data[0]

    current_total_kg = float(p.get("total_waste_kg") or 0) + weight_kg
    current_co2 = float(p.get("co2_saved_kg") or 0) + settings.co2_for_waste_type(waste_type, weight_kg)
    current_disposals = int(p.get("disposal_count") or 0) + 1

    last_date = p.get("last_recycling_date")
    streak = int(p.get("streak_days") or 0)
    if last_date:
        try:
            last_dt = datetime.fromisoformat(str(last_date).replace("Z", "+00:00")).date()
            delta = (now - last_dt).days
            if delta == 0:
                pass
            elif delta == 1:
                streak += 1
            else:
                streak = 1
        except Exception:
            streak = 1
    else:
        streak = 1

    total_tokens = int(p.get("token_balance") or 0)
    level = settings.level_for_tokens(total_tokens)

    def progress(tokens: int) -> int:
        if tokens >= 5000:
            return 100
        low, high = 0, 500
        if tokens > 2000:
            low, high = 2000, 5000
        elif tokens > 500:
            low, high = 500, 2000
        span = high - low
        if span <= 0:
            return 0
        return int(min(100, max(0, ((tokens - low) / span) * 100)))

    level_progress = progress(total_tokens)

    admin.table("profiles").update({
        "total_waste_kg": round(current_total_kg, 3),
        "co2_saved_kg": round(current_co2, 3),
        "disposal_count": current_disposals,
        "streak_days": streak,
        "last_recycling_date": datetime.now(timezone.utc).isoformat(),
        "level": level,
        "level_progress": level_progress,
    }).eq("id", user_id).execute()


def level_progress_tokens_percent(user_id: str) -> int:
    admin = get_admin_client()
    r = admin.table("profiles").select("token_balance").eq("id", user_id).limit(1).execute()
    if not r.data:
        return 0
    tokens = int(r.data[0]["token_balance"] or 0)
    if tokens >= 5000:
        return 100
    low, high = 0, 500
    if tokens > 2000:
        low, high = 2000, 5000
    elif tokens > 500:
        low, high = 500, 2000
    span = high - low
    if span <= 0:
        return 0
    return int(min(100, max(0, ((tokens - low) / span) * 100)))
