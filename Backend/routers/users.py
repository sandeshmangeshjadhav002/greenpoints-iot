from fastapi import APIRouter, Depends, HTTPException
from routers.auth import get_current_user
from database import get_admin_client
from schemas import ProfileUpdate, TokenData
from services.points_service import (
    get_balance,
    get_transaction_history,
    get_user_rank,
    level_progress_tokens_percent,
)

router = APIRouter(prefix="/api/users", tags=["users"])


def _row_to_profile_out(row: dict, email: str) -> dict:
    row = dict(row)
    row["email"] = email
    display = (row.get("display_name") or "").strip() or email.split("@")[0]
    return {
        "id":            str(row.get("id")),
        "display_name":  display,
        "email":         row.get("email"),
        "phone":         row.get("phone"),
        "location":      row.get("location"),
        "avatar_url":    row.get("avatar_url"),
        "token_balance": int(row.get("token_balance") or 0),
        "total_waste_kg":float(row.get("total_waste_kg") or 0),
        "co2_saved_kg":  float(row.get("co2_saved_kg") or 0),
        "streak_days":   int(row.get("streak_days") or 0),
        "disposal_count":int(row.get("disposal_count") or 0),
        "level":         row.get("level"),
        "level_progress":level_progress_tokens_percent(str(row.get("id"))),
        "rank":          get_user_rank(str(row.get("id"))),
        "joinDate":      row.get("created_at"),
    }


@router.get("/me")
def get_my_profile(current: TokenData = Depends(get_current_user)):
    admin = get_admin_client()
    r = (
        admin.table("profiles")
        .select("*")
        .eq("id", current.sub)
        .limit(1)
        .execute()
    )
    if not r.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"success": True, "data": _row_to_profile_out(r.data[0], current.email)}


@router.put("/me")
def update_my_profile(data: ProfileUpdate, current: TokenData = Depends(get_current_user)):
    admin = get_admin_client()
    payload = data.model_dump(exclude_unset=True)
    if not payload:
        return {"success": True, "data": {}}
    r = admin.table("profiles").update(payload).eq("id", current.sub).execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"success": True, "data": _row_to_profile_out(r.data[0], current.email)}


@router.get("/me/points")
def my_points(current: TokenData = Depends(get_current_user)):
    return {"success": True, "data": {"balance": get_balance(current.sub)}}


@router.get("/me/transactions")
def my_transactions(current: TokenData = Depends(get_current_user), limit: int = 50):
    return {"success": True, "data": get_transaction_history(current.sub, limit=limit)}
