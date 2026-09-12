from fastapi import APIRouter, Depends
from routers.auth import get_current_user
from schemas import TokenData
from services import points_service

router = APIRouter(prefix="/api/points", tags=["points"])


@router.get("/balance")
def balance(current: TokenData = Depends(get_current_user)):
    return {"success": True, "data": {"balance": points_service.get_balance(current.sub)}}


@router.get("/transactions")
def transactions(current: TokenData = Depends(get_current_user), limit: int = 50):
    return {"success": True, "data": points_service.get_transaction_history(current.sub, limit=limit)}


@router.get("/leaderboard")
def leaderboard(limit: int = 50):
    return {"success": True, "data": points_service.get_leaderboard(limit=limit)}


@router.get("/me/rank")
def my_rank(current: TokenData = Depends(get_current_user)):
    return {"success": True, "data": {"rank": points_service.get_user_rank(current.sub)}}
