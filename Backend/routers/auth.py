import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from config import settings
from database import supabase, get_admin_client
from schemas import AuthCredentials, TokenData

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)
logger = logging.getLogger(__name__)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.jwt_access_token_expire_minutes)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _get_user_role(user_id: str) -> str:
    """Return role from user_roles table; fall back to 'user' gracefully."""
    try:
        admin = get_admin_client()
        r = admin.table("user_roles").select("role").eq("user_id", user_id).limit(1).execute()
        return r.data[0]["role"] if r.data else "user"
    except Exception:
        logger.exception("Unable to look up role for authenticated user %s", user_id)
        return "user"


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> TokenData:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        sub: str = payload.get("sub")
        email: str = payload.get("email", "")
        role: str = payload.get("role", "user")
        if sub is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return TokenData(sub=sub, email=email, role=role, exp=payload.get("exp"))
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def require_role(*roles: str):
    """Dependency factory: allow any of the listed roles."""
    def _check(current: TokenData = Depends(get_current_user)) -> TokenData:
        if current.role not in roles:
            raise HTTPException(status_code=403, detail=f"Requires one of roles: {', '.join(roles)}")
        return current
    return _check


def require_admin(current: TokenData = Depends(get_current_user)) -> TokenData:
    if current.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current


def session_response(user: dict, access_token: str, refresh_token: Optional[str] = None) -> dict:
    return {
        "user": {"id": str(user["id"]), "email": user["email"]},
        "accessToken": access_token,
        "refreshToken": refresh_token,
    }


def _login_failure(exc: Exception) -> HTTPException:
    message = str(exc).lower()
    if "email not confirmed" in message or "email not verified" in message or "not confirmed" in message:
        return HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not confirmed. Check your inbox for the confirmation link and click it before signing in.",
        )
    if "invalid login credentials" in message or "invalid email or password" in message:
        return HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Check your credentials and try again.",
        )
    if any(m in message for m in ("invalid api key", "api key", "unauthorized")):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is misconfigured. Check SUPABASE_URL and SUPABASE_KEY.",
        )
    if any(m in message for m in ("connect", "timeout", "network", "socket")):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is temporarily unavailable. Try again shortly.",
        )
    # Log the raw error so it's diagnosable without exposing it to the client
    logger.error("Unhandled Supabase sign-in error: %s", exc)
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign-in failed. Please try again.")


@router.post("/signup", response_model=None)
def sign_up(credentials: AuthCredentials):
    # Normalise email the same way login does so both sides match
    email = credentials.email.strip().lower()
    try:
        res = supabase.auth.sign_up({"email": email, "password": credentials.password})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not res.user:
        # Supabase returns no user when email confirmation is required and the
        # address is new — tell the frontend to check email rather than crashing.
        return {
            "user": {"id": "", "email": email},
            "accessToken": None,
            "refreshToken": None,
            "message": "Account created! Check your email for a confirmation link before signing in.",
        }

    uid = str(res.user.id)
    email = res.user.email or email

    # If email confirmation is on, session will be None even for a new user.
    if not res.session:
        return {
            "user": {"id": uid, "email": email},
            "accessToken": None,
            "refreshToken": None,
            "message": "Account created! Check your email for a confirmation link before signing in.",
        }

    role = _get_user_role(uid)
    token = create_access_token({"sub": uid, "email": email, "role": role})
    return session_response(
        {"id": uid, "email": email},
        access_token=token,
        refresh_token=res.session.refresh_token,
    )


@router.post("/login", response_model=None)
def sign_in(credentials: AuthCredentials):
    email = credentials.email.strip().lower()
    try:
        res = supabase.auth.sign_in_with_password({"email": email, "password": credentials.password})
    except Exception as exc:
        logger.warning("Supabase sign-in failed for %s", email, exc_info=True)
        raise _login_failure(exc)

    if not res.user:
        raise HTTPException(status_code=400, detail="Sign-in failed. Please try again.")

    if not res.session:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not confirmed. Check your inbox for the confirmation link and click it before signing in.",
        )

    uid = str(res.user.id)
    email = res.user.email or email
    role = _get_user_role(uid)
    token = create_access_token({"sub": uid, "email": email, "role": role})
    return session_response(
        {"id": uid, "email": email},
        access_token=token,
        refresh_token=res.session.refresh_token,
    )


@router.post("/logout")
def logout(_: TokenData = Depends(get_current_user)):
    return {"success": True, "data": {"message": "Logged out"}}


@router.get("/me")
def me(current: TokenData = Depends(get_current_user)):
    admin = get_admin_client()
    r = (
        admin.table("profiles")
        .select("id, display_name, phone, location, avatar_url, created_at, token_balance")
        .eq("id", current.sub)
        .limit(1)
        .execute()
    )
    profile = r.data[0] if r.data else {"id": current.sub}
    profile["email"] = current.email
    profile["role"] = current.role
    return {"success": True, "data": profile}


@router.post("/set-role")
def set_user_role(payload: dict, _: TokenData = Depends(require_admin)):
    """Admin-only: assign a role to a user. Payload: {user_id, role, shop_name?}"""
    user_id = payload.get("user_id", "").strip()
    role = payload.get("role", "").strip()
    shop_name = payload.get("shop_name")

    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    if role not in ("user", "cleaner", "shop", "admin"):
        raise HTTPException(status_code=400, detail="role must be user | cleaner | shop | admin")

    admin = get_admin_client()
    # Upsert into user_roles
    admin.table("user_roles").upsert({
        "user_id": user_id,
        "role": role,
        "shop_name": shop_name,
    }, on_conflict="user_id").execute()

    return {"success": True, "data": {"user_id": user_id, "role": role}}
