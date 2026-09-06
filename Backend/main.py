from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic_settings import BaseSettings, SettingsConfigDict
from supabase import Client, create_client


class Settings(BaseSettings):
    """Application configuration loaded from Backend/.env."""

    supabase_url: str
    supabase_key: str
    frontend_origin: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=Path(__file__).with_name(".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
supabase: Client = create_client(settings.supabase_url, settings.supabase_key)


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield


app = FastAPI(
    title="EcoLoop API",
    version="0.1.0",
    description="FastAPI service for the EcoLoop frontend and Supabase data.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", tags=["system"])
def health_check() -> dict[str, str]:
    """Confirm the API process is running without exposing secret configuration."""
    return {"status": "ok", "service": "ecoloop-api"}


@app.get("/api/config/status", tags=["system"])
def configuration_status() -> dict[str, bool]:
    """Expose only whether required Supabase configuration is present."""
    return {
        "supabaseConfigured": bool(settings.supabase_url and settings.supabase_key),
    }

