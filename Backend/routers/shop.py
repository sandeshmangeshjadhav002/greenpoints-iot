"""
Shop router — offer management + redemption verification for shop role.

SHOP permissions:
  • Login (auth router)
  • Create / edit / delete own offers (rewards)
  • Set points required on offers
  • View & verify (fulfill / reject) redemptions
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from database import get_admin_client
from routers.auth import get_current_user, require_role
from schemas import TokenData

router = APIRouter(prefix="/api/shop", tags=["shop"])

_shop_or_admin = require_role("shop", "admin")


# ── Schemas ───────────────────────────────────────────────────────────────────

class OfferCreate(BaseModel):
    name:        str          = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    category:    Optional[str] = Field(default=None, max_length=100)
    image_url:   Optional[str] = Field(default=None, max_length=500)
    token_cost:  int          = Field(gt=0)
    stock:       Optional[int] = Field(default=None, ge=0)


class OfferUpdate(BaseModel):
    name:        Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    category:    Optional[str] = Field(default=None, max_length=100)
    image_url:   Optional[str] = Field(default=None, max_length=500)
    token_cost:  Optional[int] = Field(default=None, gt=0)
    stock:       Optional[int] = Field(default=None, ge=0)
    is_active:   Optional[bool] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _fmt_offer(row: dict) -> dict:
    return {
        "id":          str(row["id"]),
        "name":        row["name"],
        "description": row.get("description"),
        "category":    row.get("category"),
        "image":       row.get("image_url"),
        "token_cost":  int(row.get("token_cost") or 0),
        "stock":       row.get("stock"),
        "is_active":   bool(row.get("is_active", True)),
        "created_at":  row.get("created_at"),
    }


def _fmt_redemption(row: dict) -> dict:
    reward  = row.get("rewards")  or {}
    profile = row.get("profiles") or {}
    def _fmt_ts(ts):
        if not ts: return None
        try:
            return datetime.fromisoformat(str(ts).replace("Z", "+00:00")).astimezone().strftime("%d %b %Y, %I:%M %p")
        except Exception:
            return str(ts)
    return {
        "id":           str(row["id"]),
        "user_name":    profile.get("display_name") or "Unknown",
        "user_id":      str(row.get("user_id") or ""),
        "reward_name":  reward.get("name") or "Reward",
        "reward_id":    str(row.get("reward_id") or ""),
        "token_cost":   int(row.get("token_cost") or 0),
        "status":       row.get("status") or "pending",
        "created_at":   _fmt_ts(row.get("created_at")),
        "fulfilled_at": _fmt_ts(row.get("fulfilled_at")),
        "notes":        row.get("notes"),
    }


# ── Shop info ─────────────────────────────────────────────────────────────────

@router.get("/info")
def shop_info(current: TokenData = Depends(_shop_or_admin)):
    admin = get_admin_client()
    role_r = admin.table("user_roles").select("shop_name").eq("user_id", current.sub).limit(1).execute()
    shop_name = (role_r.data[0].get("shop_name") if role_r.data else None) or "Your Shop"
    pending = admin.table("redemptions").select("id", count="exact").eq("status", "pending").execute()
    own_offers = admin.table("rewards").select("id", count="exact").eq("shop_id", current.sub).execute()
    return {"success": True, "data": {
        "shop_name":    shop_name,
        "pending_count": pending.count or 0,
        "offer_count":  own_offers.count or 0,
    }}


# ── Offer management ──────────────────────────────────────────────────────────

@router.get("/offers")
def list_my_offers(current: TokenData = Depends(_shop_or_admin)):
    """List all offers created by this shop."""
    admin = get_admin_client()
    r = admin.table("rewards").select("*").eq("shop_id", current.sub).order("created_at", desc=True).execute()
    return {"success": True, "data": [_fmt_offer(row) for row in r.data]}


@router.post("/offers", status_code=201)
def create_offer(data: OfferCreate, current: TokenData = Depends(_shop_or_admin)):
    """Create a new offer (reward) owned by this shop."""
    admin = get_admin_client()
    r = admin.table("rewards").insert({
        "name":        data.name,
        "description": data.description,
        "category":    data.category,
        "image_url":   data.image_url,
        "token_cost":  data.token_cost,
        "stock":       data.stock,
        "shop_id":     current.sub,
        "is_active":   True,
    }).execute()
    return {"success": True, "data": _fmt_offer(r.data[0])}


@router.put("/offers/{offer_id}")
def update_offer(offer_id: str, data: OfferUpdate, current: TokenData = Depends(_shop_or_admin)):
    """Edit an offer owned by this shop."""
    admin = get_admin_client()
    # Verify ownership
    chk = admin.table("rewards").select("shop_id").eq("id", offer_id).limit(1).execute()
    if not chk.data:
        raise HTTPException(status_code=404, detail="Offer not found")
    if str(chk.data[0].get("shop_id")) != current.sub and current.role != "admin":
        raise HTTPException(status_code=403, detail="You don't own this offer")

    payload = data.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    r = admin.table("rewards").update(payload).eq("id", offer_id).execute()
    return {"success": True, "data": _fmt_offer(r.data[0])}


@router.delete("/offers/{offer_id}")
def delete_offer(offer_id: str, current: TokenData = Depends(_shop_or_admin)):
    """Delete (deactivate) an offer owned by this shop."""
    admin = get_admin_client()
    chk = admin.table("rewards").select("shop_id").eq("id", offer_id).limit(1).execute()
    if not chk.data:
        raise HTTPException(status_code=404, detail="Offer not found")
    if str(chk.data[0].get("shop_id")) != current.sub and current.role != "admin":
        raise HTTPException(status_code=403, detail="You don't own this offer")
    # Soft-delete: deactivate so existing redemptions aren't orphaned
    admin.table("rewards").update({"is_active": False}).eq("id", offer_id).execute()
    return {"success": True, "data": {"deleted": offer_id}}


@router.patch("/offers/{offer_id}/points")
def set_offer_points(offer_id: str, payload: dict, current: TokenData = Depends(_shop_or_admin)):
    """Quickly update just the points required for an offer."""
    token_cost = int(payload.get("token_cost", 0))
    if token_cost <= 0:
        raise HTTPException(status_code=400, detail="token_cost must be > 0")
    admin = get_admin_client()
    chk = admin.table("rewards").select("shop_id").eq("id", offer_id).limit(1).execute()
    if not chk.data:
        raise HTTPException(status_code=404, detail="Offer not found")
    if str(chk.data[0].get("shop_id")) != current.sub and current.role != "admin":
        raise HTTPException(status_code=403, detail="You don't own this offer")
    r = admin.table("rewards").update({"token_cost": token_cost}).eq("id", offer_id).execute()
    return {"success": True, "data": _fmt_offer(r.data[0])}


# ── Redemption verification ───────────────────────────────────────────────────

@router.get("/redemptions")
def list_redemptions(status: str = "pending", limit: int = 100, current: TokenData = Depends(_shop_or_admin)):
    admin = get_admin_client()
    q = (admin.table("redemptions")
         .select("*, rewards(name, category, image_url, shop_id), profiles(display_name)")
         .order("created_at", desc=True).limit(limit))
    if status != "all":
        q = q.eq("status", status)
    # Shops only see redemptions for their own offers
    if current.role == "shop":
        # Get offer IDs owned by this shop first
        own = admin.table("rewards").select("id").eq("shop_id", current.sub).execute()
        own_ids = [row["id"] for row in own.data]
        if not own_ids:
            return {"success": True, "data": []}
        q = q.in_("reward_id", own_ids)
    r = q.execute()
    return {"success": True, "data": [_fmt_redemption(row) for row in r.data]}


@router.post("/redemptions/{rid}/fulfill")
def fulfill_redemption(rid: str, payload: dict | None = None, current: TokenData = Depends(_shop_or_admin)):
    admin = get_admin_client()
    r = admin.table("redemptions").select("*").eq("id", rid).limit(1).execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Redemption not found")
    red = r.data[0]
    if red["status"] != "pending":
        raise HTTPException(status_code=409, detail=f"Already '{red['status']}'")
    notes = (payload or {}).get("notes")
    admin.table("redemptions").update({
        "status": "fulfilled", "fulfilled_by": current.sub,
        "fulfilled_at": datetime.now(timezone.utc).isoformat(), "notes": notes,
    }).eq("id", rid).execute()
    admin.table("notifications").insert({
        "user_id": red["user_id"], "title": "Reward ready for pickup!",
        "message": "Your redemption has been fulfilled. Please collect your reward.",
        "category": "Reward", "read": False,
    }).execute()
    return {"success": True, "data": {"redemption_id": rid, "status": "fulfilled"}}


@router.post("/redemptions/{rid}/reject")
def reject_redemption(rid: str, payload: dict | None = None, current: TokenData = Depends(_shop_or_admin)):
    admin = get_admin_client()
    r = admin.table("redemptions").select("*").eq("id", rid).limit(1).execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Redemption not found")
    red = r.data[0]
    if red["status"] != "pending":
        raise HTTPException(status_code=409, detail=f"Already '{red['status']}'")
    notes = (payload or {}).get("notes") or "Rejected by shop"
    admin.table("redemptions").update({
        "status": "rejected", "fulfilled_by": current.sub,
        "fulfilled_at": datetime.now(timezone.utc).isoformat(), "notes": notes,
    }).eq("id", rid).execute()
    cost = int(red.get("token_cost") or 0)
    if cost > 0:
        from services import points_service
        points_service.award_points(red["user_id"], cost, description=f"Refund: rejected #{rid[:8]}")
    admin.table("notifications").insert({
        "user_id": red["user_id"], "title": "Redemption rejected",
        "message": f"Your redemption was rejected. {cost} tokens refunded.",
        "category": "Update", "read": False,
    }).execute()
    return {"success": True, "data": {"redemption_id": rid, "status": "rejected", "tokens_refunded": cost}}
