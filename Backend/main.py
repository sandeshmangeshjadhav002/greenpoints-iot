import hashlib
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Header, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from supabase import Client, create_client


class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str
    frontend_origins: str = "http://localhost:5173"
    model_config = SettingsConfigDict(env_file=Path(__file__).with_name(".env"), extra="ignore")

    @property
    def origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]


settings = Settings()
supabase: Client = create_client(settings.supabase_url, settings.supabase_key)


class TelemetryIn(BaseModel):
    fill_level: float = Field(ge=0, le=100)
    battery: float = Field(ge=0, le=100)
    sensor_status: str = Field(default="online", pattern="^(online|offline)$")
    wifi_status: str = Field(default="connected", pattern="^(connected|weak|disconnected)$")
    weight_kg: float | None = Field(default=None, ge=0)
    temperature_c: float | None = None


class AuthCredentials(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=128)


class ContactMessageIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=320)
    subject: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1, max_length=5000)


class ConnectionManager:
    def __init__(self) -> None:
        self.connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.connections:
            self.connections.remove(websocket)

    async def broadcast(self, message: dict[str, Any]) -> None:
        for connection in self.connections.copy():
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)


manager = ConnectionManager()


def api_bin(row: dict[str, Any]) -> dict[str, Any]:
    return {"id": row["code"], "location": row["location"], "wasteType": row["waste_type"],
            "fillLevel": row["fill_level"], "battery": row["battery"], "sensor": row["sensor_status"],
            "wifi": row["wifi_status"], "health": row["health"], "lastUpdated": row["last_seen_at"]}


def fetch_bin(code: str) -> dict[str, Any]:
    response = supabase.table("smart_bins").select("*").eq("code", code).limit(1).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Unknown bin")
    return response.data[0]


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield


app = FastAPI(title="EcoLoop API", version="0.2.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.get("/api/health", tags=["system"])
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "ecoloop-api"}


def session_response(result: Any) -> dict[str, Any]:
    if not result.user:
        raise HTTPException(status_code=400, detail="Check your email to confirm the account before signing in.")
    return {
        "user": {"id": str(result.user.id), "email": result.user.email},
        "accessToken": result.session.access_token if result.session else None,
        "refreshToken": result.session.refresh_token if result.session else None,
    }


@app.post("/api/auth/signup", tags=["auth"])
def sign_up(credentials: AuthCredentials) -> dict[str, Any]:
    try:
        auth_client = create_client(settings.supabase_url, settings.supabase_key)
        return session_response(auth_client.auth.sign_up({"email": credentials.email, "password": credentials.password}))
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.post("/api/auth/login", tags=["auth"])
def sign_in(credentials: AuthCredentials) -> dict[str, Any]:
    try:
        auth_client = create_client(settings.supabase_url, settings.supabase_key)
        return session_response(auth_client.auth.sign_in_with_password({"email": credentials.email, "password": credentials.password}))
    except Exception as error:
        raise HTTPException(status_code=401, detail="Invalid email or password") from error


@app.post("/api/contact", status_code=201, tags=["contact"])
def create_contact_message(message: ContactMessageIn) -> dict[str, bool]:
    supabase.table("contact_messages").insert(message.model_dump()).execute()
    return {"received": True}


@app.get("/api/bins", tags=["bins"])
def list_bins() -> list[dict[str, Any]]:
    response = supabase.table("smart_bins").select("*").order("code").execute()
    return [api_bin(row) for row in response.data]


@app.get("/api/bins/{code}", tags=["bins"])
def get_bin(code: str) -> dict[str, Any]:
    return api_bin(fetch_bin(code))


@app.post("/api/devices/{code}/telemetry", tags=["devices"])
async def ingest_telemetry(code: str, telemetry: TelemetryIn, x_device_key: str | None = Header(default=None)) -> dict[str, Any]:
    if not x_device_key:
        raise HTTPException(status_code=401, detail="Missing device key")
    current = fetch_bin(code)
    if hashlib.sha256(x_device_key.encode()).hexdigest() != current["device_key_hash"]:
        raise HTTPException(status_code=401, detail="Invalid device key")
    now = datetime.now(timezone.utc).isoformat()
    health = "critical" if telemetry.fill_level >= 90 or telemetry.battery < 20 else "warning" if telemetry.fill_level >= 75 or telemetry.battery < 35 else "good"
    payload = telemetry.model_dump()
    supabase.table("bin_telemetry").insert({"bin_id": current["id"], "recorded_at": now, **payload}).execute()
    updated = supabase.table("smart_bins").update({"fill_level": telemetry.fill_level, "battery": telemetry.battery, "sensor_status": telemetry.sensor_status, "wifi_status": telemetry.wifi_status, "health": health, "last_seen_at": now}).eq("id", current["id"]).execute()
    bin_data = api_bin(updated.data[0])
    await manager.broadcast({"type": "bin.updated", "bin": bin_data})
    return {"accepted": True, "bin": bin_data}


@app.websocket("/ws/bins")
async def bins_websocket(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
