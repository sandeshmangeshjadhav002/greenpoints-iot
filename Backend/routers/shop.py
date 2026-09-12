"""
Shop router — endpoints used by shops to view and fulfill token redemptions.
Accessible to users with role='shop' or 'admin'.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException

from database import get_admin_client
from routers.auth import get_current_user, require_role
from schemas import TokenData

router = APIRouter(prefix="/api/shop", tags=["shop"])

_shop_or_admin = require_role("shop", "admin")


def _fmt_redemption(row: dict) -> dict:
    reward = row.get("rewards") or {}
    profile = row.get("profiles") or {}
    try:
        dt = datetime.fromisoformat(str(row["created_at"]).replace("Z", "+00:00"))
        created = dt.astimezone().strftime("%d %b %Y, %I:%M %p")
    except Exception:
        created = str(row.get("created_at"))

    fulfilled_at = row.get("fulfilled_at")
    if fulfilled_at:
        try:
            ft = datetime.fromisoformat(str(fulfilled_at).replace("Z", "+00:00"))
            fulfilled_at = ft.astimezone().strftime("%d %b %Y, %I:%M %p")
        except Exception:
            pass

    return {
        "id": str(row["id"]),
        "user_name": profile.get("display_name") or "Unknown",
        "user_id": str(row.get("user_id") or ""),
        "reward_name": reward.get("name") or "Reward",
        "reward_id": str(row.get("reward_id") or ""),
        "token_cost": int(row.get("token_cost") or 0),
        "status": row.get("status") or "pending",
        "created_at": created,
        "fulfilled_at": fulfilled_at,
        "notes": row.get("notes"),
    }


@router.get("/info")
def shop_info(current: TokenData = Depends(_shop_or_admin)):
    """Return the shop's name and pending redemption count."""
    admin = get_admin_client()
    role_r = admin.table("user_roles").select("shop_name").eq("user_id", current.sub).limit(1).execute()
    shop_name = (role_r.data[0].get("shop_name") if role_r.data else None) or "Your Shop"
    pending = (
        admin.table("redemptions")
        .select("id", count="exact")
        .eq("status", "pending")
        .execute()
    )
    return {
        "success": True,
        "data": {
            "shop_name": shop_name,
            "pending_count": pending.count or 0,
        },
    }


@router.get("/redemptions")
def list_redemptions(
    status: str = "pending",
    limit: int = 100,
    current: TokenData = _shop_or_admin,
):
    """
    List redemptions.  `status` can be 'pending', 'fulfilled', 'rejected', or 'all'.
    Shops see all redemptions for their shop's rewards; admins see everything.
    """
    admin = get_admin_client()
    q = (
        admin.table("redemptions")
        .select("*, rewards(name, category, image_url), profiles(display_name)")
        .order("created_at", desc=True)
        .limit(limit)
    )
    if status != "all":
        q = q.eq("status", status)

    r = q.execute()
    return {"success": True, "data": [_fmt_redemption(row) for row in r.data]}


@router.post("/redemptions/{redemption_id}/fulfill")
def fulfill_redemption(
    redemption_id: str,
    payload: dict | None = None,
    current: TokenData = Depends(_shop_or_admin),
):
    """Mark a pending redemption as fulfilled."""
    admin = get_admin_client()
    r = admin.table("redemptions").select("*").eq("id", redemption_id).limit(1).execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Redemption not found")
    redemption = r.data[0]
    if redemption["status"] != "pending":
        raise HTTPException(
            status_code=409,
            detail=f"Redemption is already '{redemption['status']}', cannot fulfill again.",
        )

    notes = (payload or {}).get("notes")
    admin.table("redemptions").update({
        "status": "fulfilled",
        "fulfilled_by": current.sub,
        "fulfilled_at": datetime.now(timezone.utc).isoformat(),
        "notes": notes,
    }).eq("id", redemption_id).execute()

    # Notify the user their reward is ready
    admin.table("notifications").insert({
        "user_id": redemption["user_id"],
        "title": "Reward ready for pickup!",
        "message": "Your redemption has been fulfilled. Please collect your reward.",
        "category": "Reward",
        "read": False,
    }).execute()

    return {"success": True, "data": {"redemption_id": redemption_id, "status": "fulfilled"}}


@router.post("/redemptions/{redemption_id}/reject")
def reject_redemption(
    redemption_id: str,
    payload: dict | None = None,
    current: TokenData = Depends(_shop_or_admin),
):
    """Reject a pending redemption and refund the tokens."""
    admin = get_admin_client()
    r = admin.table("redemptions").select("*").eq("id", redemption_id).limit(1).execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Redemption not found")
    redemption = r.data[0]
    if redemption["status"] != "pending":
        raise HTTPException(status_code=409, detail=f"Redemption is already '{redemption['status']}'.")

    notes = (payload or {}).get("notes") or "Rejected by shop"
    admin.table("redemptions").update({
        "status": "rejected",
        "fulfilled_by": current.sub,
        "fulfilled_at": datetime.now(timezone.utc).isoformat(),
        "notes": notes,
    }).eq("id", redemption_id).execute()

    # Refund tokens
    token_cost = int(redemption.get("token_cost") or 0)
    if token_cost > 0:
        from services import points_service
        points_service.award_points(
            user_id=redemption["user_id"],
            amount=token_cost,
            description=f"Refund: rejected redemption #{redemption_id[:8]}",
        )

    admin.table("notifications").insert({
        "user_id": redemption["user_id"],
        "title": "Redemption rejected",
        "message": f"Your redemption was rejected. {token_cost} tokens have been refunded.",
        "category": "Update",
        "read": False,
    }).execute()

    return {"success": True, "data": {"redemption_id": redemption_id, "status": "rejected", "tokens_refunded": token_cost}}
