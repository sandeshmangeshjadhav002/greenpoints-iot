from pathlib import Path
from typing import Any
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str
    supabase_service_role_key: str = Field(default="")

    jwt_secret: str = Field(default="change-me-please-use-a-strong-32-char-secret-key")
    jwt_algorithm: str = Field(default="HS256")
    jwt_access_token_expire_minutes: int = Field(default=1440)

    frontend_origins: str = Field(
        default="http://localhost:5173",
        validation_alias=AliasChoices("FRONTEND_ORIGINS", "FRONTEND_ORIGIN"),
    )

    default_bin_height_cm: float = Field(default=50.0)
    full_threshold_percent: float = Field(default=90.0)
    near_full_threshold_percent: float = Field(default=75.0)
    offline_timeout_seconds: int = Field(default=300)

    points_per_kg_general: int = Field(default=2)
    points_per_kg_recyclable: int = Field(default=5)
    points_per_kg_organic: int = Field(default=3)
    points_per_kg_ewaste: int = Field(default=10)
    points_base_disposal: int = Field(default=1)

    co2_general: float = Field(default=0.5)
    co2_recyclable: float = Field(default=2.1)
    co2_organic: float = Field(default=0.3)
    co2_ewaste: float = Field(default=5.0)

    level_bronze_max: int = Field(default=499)
    level_silver_max: int = Field(default=1999)
    level_gold_max: int = Field(default=4999)

    openai_api_key: str = Field(default="")
    ai_model: str = Field(default="gpt-3.5-turbo-0125")

    model_config = SettingsConfigDict(
        env_file=Path(__file__).with_name(".env"), extra="ignore"
    )

    @property
    def origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]

    def points_for_waste_type(self, waste_type: str, weight_kg: float) -> int:
        per_kg = {
            "Recyclable": self.points_per_kg_recyclable,
            "Organic": self.points_per_kg_organic,
            "E-Waste": self.points_per_kg_ewaste,
            "General": self.points_per_kg_general,
        }.get(waste_type, self.points_per_kg_general)
        return self.points_base_disposal + int(round(per_kg * max(0.0, weight_kg)))

    def co2_for_waste_type(self, waste_type: str, weight_kg: float) -> float:
        factor = {
            "Recyclable": self.co2_recyclable,
            "Organic": self.co2_organic,
            "E-Waste": self.co2_ewaste,
            "General": self.co2_general,
        }.get(waste_type, self.co2_general)
        return round(factor * max(0.0, weight_kg), 3)

    def level_for_tokens(self, total_tokens: int) -> str:
        if total_tokens >= 5000:
            return "Platinum"
        if total_tokens > self.level_gold_max:
            return "Gold"
        if total_tokens > self.level_silver_max:
            return "Silver"
        return "Bronze"


settings = Settings()
