from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


class SuccessResponse(BaseModel):
    success: bool = True
    data: Any


class ErrorResponse(BaseModel):
    success: bool = False
    error: str


class AuthCredentials(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=128)


class AuthUser(BaseModel):
    id: str
    email: str
    display_name: Optional[str] = None


class AuthSession(BaseModel):
    user: AuthUser
    accessToken: Optional[str] = None
    refreshToken: Optional[str] = None


class TokenData(BaseModel):
    sub: str
    email: str
    role: str = "user"
    exp: Optional[int] = None


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = Field(default=None, max_length=120)
    phone: Optional[str] = Field(default=None, max_length=30)
    location: Optional[str] = Field(default=None, max_length=200)
    avatar_url: Optional[str] = Field(default=None, max_length=500)


class ProfileOut(BaseModel):
    id: str
    display_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    location: Optional[str]
    avatar_url: Optional[str]
    token_balance: int
    total_waste_kg: float
    co2_saved_kg: float
    streak_days: int
    disposal_count: int
    level: Optional[str]
    level_progress: int
    rank: Optional[int] = None
    joinDate: Optional[datetime] = None

    class Config:
        from_attributes = True


class IoTUltrasonicReading(BaseModel):
    device_id: str = Field(min_length=2, max_length=50)
    ultrasonic_distance: float = Field(ge=0.0, le=500.0)
    ir_detected: bool


class IoTTelemetry(BaseModel):
    fill_level: float = Field(ge=0, le=100)
    battery: float = Field(ge=0, le=100)
    sensor_status: str = Field(default="online", pattern="^(online|offline)$")
    wifi_status: str = Field(default="connected", pattern="^(connected|weak|disconnected)$")
    weight_kg: Optional[float] = Field(default=None, ge=0)
    temperature_c: Optional[float] = None


class BinCreate(BaseModel):
    code: str = Field(min_length=4, pattern=r"^BIN-[A-Z0-9-]+$")
    location: str = Field(min_length=2, max_length=300)
    waste_type: str = Field(pattern=r"^(Recyclable|Organic|General|E-Waste)$")
    device_key: str = Field(min_length=8, max_length=200)
    height_cm: float = Field(default=50.0, gt=0, le=300)


class BinOut(BaseModel):
    id: str
    location: str
    wasteType: str
    fillLevel: float
    battery: float
    sensor: str
    wifi: str
    health: str
    lastUpdated: Optional[str]


class WasteDisposalCreate(BaseModel):
    bin_code: str = Field(min_length=4)
    weight_kg: float = Field(gt=0, le=500)
    manual_waste_type: Optional[str] = Field(default=None, pattern=r"^(Recyclable|Organic|General|E-Waste)$")


class RecyclingEventOut(BaseModel):
    id: str
    user_id: Optional[str]
    bin_id: str
    bin_code: Optional[str]
    waste_type: str
    weight_kg: float
    tokens_earned: int
    created_at: datetime


class PointsTransactionOut(BaseModel):
    id: str
    amount: int
    type: str
    description: Optional[str]
    created_at: datetime


class LeaderboardEntry(BaseModel):
    rank: int
    name: str
    avatar: Optional[str]
    points: int
    wasteKg: float


class RewardOut(BaseModel):
    id: str
    name: str
    description: Optional[str]
    category: Optional[str]
    image: Optional[str]
    tokens: int
    stock: Optional[int]


class RewardRedemption(BaseModel):
    reward_id: str


class NotificationOut(BaseModel):
    id: str
    title: str
    message: str
    category: str
    read: bool
    time: str
    icon: Optional[str] = None


class WeeklyActivityItem(BaseModel):
    day: str
    kg: float
    tokens: int


class WasteDistributionItem(BaseModel):
    name: str
    value: float
    color: str


class DashboardStats(BaseModel):
    tokens: int
    totalWasteKg: float
    co2SavedKg: float
    streakDays: int
    level: Optional[str]
    levelProgress: int
    disposalCount: int


class RecentActivityItem(BaseModel):
    id: str
    bin: str
    type: str
    date: str
    kg: float
    tokens: int


class BadgeOut(BaseModel):
    id: str
    name: str
    icon: str
    earned: bool
    desc: str


class AdminStats(BaseModel):
    totalUsers: int
    totalBins: int
    totalWasteKg: float
    totalTokensIssued: int
    co2SavedKg: float
    onlineBins: int
    criticalBins: int


class ContactMessageIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=320)
    subject: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1, max_length=5000)
