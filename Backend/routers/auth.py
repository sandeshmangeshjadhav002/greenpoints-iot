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
    """Return a role without making a successful login depend on optional RBAC setup."""
    try:
        admin = get_admin_client()
        r = admin.table("user_roles").select("role").eq("user_id", user_id).limit(1).execute()
        return r.data[0]["role"] if r.data else "user"
    except Exception:
        # A missing migration/service-role key must not turn valid credentials into
        # a 500 response.  The least-privileged role is safe until RBAC is ready.
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


def require_admin(current: TokenData = Depends(get_current_user)) -> TokenData:
    if current.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current


def session_response(user: dict, access_token: str, refresh_token: Optional[str] = None) -> dict:
    return {
        "user": {
            "id": str(user["id"]),
            "email": user["email"],
        },
        "accessToken": access_token,
        "refreshToken": refresh_token,
    }


def _login_failure(exc: Exception) -> HTTPException:
    """Map Supabase failures without pretending infrastructure errors are bad passwords."""
    message = str(exc).lower()
    if "email not confirmed" in message or "email not verified" in message:
        return HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email is not confirmed. Open the confirmation email, then sign in.",
        )
    if any(marker in message for marker in ("invalid api key", "api key", "jwt", "unauthorized")):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is misconfigured. Check SUPABASE_URL and SUPABASE_KEY.",
        )
    if any(marker in message for marker in ("connect", "timeout", "network", "socket")):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is temporarily unavailable. Try again shortly.",
        )
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")


@router.post("/signup", response_model=None)
def sign_up(credentials: AuthCredentials):
    try:
        res = supabase.auth.sign_up({
            "email": credentials.email,
            "password": credentials.password,
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not res.user:
        return {
            "user": {"id": "", "email": credentials.email},
            "accessToken": None,
            "refreshToken": None,
        }

    uid = str(res.user.id)
    email = res.user.email or credentials.email
    role = _get_user_role(uid)
    token = create_access_token({"sub": uid, "email": email, "role": role})
    return session_response(
        {"id": uid, "email": email},
        access_token=token,
        refresh_token=res.session.refresh_token if res.session else None,
    )


@router.post("/login", response_model=None)
def sign_in(credentials: AuthCredentials):
    email = credentials.email.strip().lower()
    try:
        res = supabase.auth.sign_in_with_password({
            "email": email,
            "password": credentials.password,
        })
    except Exception as exc:
        # Keep password failures private, but retain the provider exception in the
        # server log so a configuration/confirmation failure is diagnosable.
        logger.warning("Supabase sign-in failed for %s", email, exc_info=True)
        raise _login_failure(exc)

    if not res.user or not res.session:
        raise HTTPException(status_code=400, detail="Check your email to confirm the account before signing in.")

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
        # Email is owned by Supabase Auth, not the public profiles table.
        .select("id, display_name, phone, location, avatar_url, created_at, token_balance")
        .eq("id", current.sub)
        .limit(1)
        .execute()
    )
    profile = r.data[0] if r.data else {"id": current.sub}
    profile["email"] = current.email
    return {"success": True, "data": profile}
