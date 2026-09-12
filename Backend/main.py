from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from config import settings
from database import get_admin_client


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


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield


app = FastAPI(
    title="EcoLoop API",
    version="1.0.0",
    lifespan=lifespan,
    description="EcoLoop / EcoPoints backend — FastAPI + Supabase + IoT",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def _unhandled(_: Request, exc: Exception):
    code = getattr(exc, "status_code", 500)
    detail = getattr(exc, "detail", str(exc))
    if not isinstance(detail, str):
        detail = str(detail)
    return JSONResponse(
        status_code=int(code) if isinstance(code, int) else 500,
        content={"success": False, "error": detail},
    )


@app.get("/api/health", tags=["system"])
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "ecoloop-api", "version": "1.0.0"}


from routers import auth, users, devices, bins, waste, points, dashboard, admin, ai

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(devices.router)
app.include_router(bins.router)
app.include_router(waste.router)
app.include_router(points.router)
app.include_router(dashboard.router)
app.include_router(admin.router)
app.include_router(ai.router)


<<<<<<< Updated upstream
@app.post("/api/auth/signup", tags=["auth"])
def sign_up(credentials: AuthCredentials) -> dict[str, Any]:
    try:
        return session_response(supabase.auth.sign_up({"email": credentials.email, "password": credentials.password}))
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.post("/api/auth/login", tags=["auth"])
def sign_in(credentials: AuthCredentials) -> dict[str, Any]:
    try:
        return session_response(supabase.auth.sign_in_with_password({"email": credentials.email, "password": credentials.password}))
    except Exception as error:
        raise HTTPException(status_code=401, detail="Invalid email or password") from error
=======
class ContactMessageIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=320)
    subject: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1, max_length=5000)
>>>>>>> Stashed changes


@app.post("/api/contact", status_code=201, tags=["contact"])
def create_contact_message(message: ContactMessageIn):
    # Contact messages are written by the server, not directly by anonymous clients.
    get_admin_client().table("contact_messages").insert(message.model_dump()).execute()
    return {"success": True, "data": {"received": True}}


@app.websocket("/ws/bins")
async def bins_websocket(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
