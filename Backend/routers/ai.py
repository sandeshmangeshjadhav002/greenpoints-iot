from fastapi import APIRouter, Depends
from routers.auth import get_current_user
from schemas import TokenData
from services import ai_service
from database import get_admin_client

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/classify-waste")
def classify_waste_text(payload: dict, _: TokenData = Depends(get_current_user)):
    hint = payload.get("description") or payload.get("image_hint") or ""
    return {"success": True, "data": ai_service.classify_waste_short(hint)}


@router.get("/sustainability-tip")
def my_sustainability_tip(current: TokenData = Depends(get_current_user)):
    admin = get_admin_client()
    r = admin.table("profiles").select("token_balance, total_waste_kg, streak_days").eq("id", current.sub).limit(1).execute()
    p = r.data[0] if r.data else {}
    summary = {
        "tokens": int(p.get("token_balance") or 0),
        "waste_kg": float(p.get("total_waste_kg") or 0),
        "streak": int(p.get("streak_days") or 0),
    }
    return {"success": True, "data": {"tip": ai_service.sustainability_tip(summary)}}
