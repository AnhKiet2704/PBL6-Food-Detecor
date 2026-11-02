from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AdminRestaurantCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    address: str = Field(min_length=1, max_length=255)
    category: str | None = Field(default=None, max_length=100)
    price_range: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=5000)
    image_url: str | None = Field(default=None, max_length=500)
    phone: str | None = Field(default=None, max_length=20)
    opening_hours: str | None = Field(default=None, max_length=255)
    district: str | None = Field(default=None, max_length=100)


class AdminRestaurantUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    address: str | None = Field(default=None, min_length=1, max_length=255)
    category: str | None = Field(default=None, max_length=100)
    price_range: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=5000)
    image_url: str | None = Field(default=None, max_length=500)
    phone: str | None = Field(default=None, max_length=20)
    opening_hours: str | None = Field(default=None, max_length=255)
    district: str | None = Field(default=None, max_length=100)


class AdminRestaurantStatusUpdate(BaseModel):
    status: str = Field(pattern="^(pending|verified|rejected|closed)$")


class AdminRestaurantResult(BaseModel):
    id: int
    name: str
    slug: str
    address: str
    district: str | None
    phone: str | None
    opening_hours: str | None
    description: str | None
    image_url: str | None
    category: str | None
    price_range: str | None
    rating: float
    review_count: int
    status: str
    heritage: str | None
    match_score: float
    taste_score: float
    created_at: datetime | None


class AdminRestaurantPage(BaseModel):
    items: list[AdminRestaurantResult]
    total: int
    page: int
    page_size: int
    total_pages: int
    selected_count: int
    pending_count: int
    verified_count: int


class AdminDashboardStats(BaseModel):
    restaurant_count: int
    verified_count: int
    pending_count: int
    average_rating: float
    review_count: int


class AdminKpi(BaseModel):
    key: str
    title: str
    value: int | float
    detail: str
    progress: float = Field(default=0, ge=0, le=100)


class AdminDistrictStat(BaseModel):
    name: str
    restaurant_count: int
    percent: float


class AdminTask(BaseModel):
    id: str
    kind: str
    title: str
    description: str
    status: str
    created_at: datetime | None
    restaurant_id: int | None = None
    sample_id: int | None = None
    price_change_id: int | None = None


class AdminTrendPoint(BaseModel):
    label: str
    restaurants: int
    reviews: int
    moderation_samples: int


class AdminTaskResolution(BaseModel):
    decision: str = Field(pattern="^(approved|rejected)$")
    reviewer_note: str | None = Field(default=None, max_length=5000)


class PriceChangeCreate(BaseModel):
    restaurant_id: int
    item_name: str = Field(min_length=1, max_length=150)
    current_price: float | None = Field(default=None, ge=0)
    proposed_price: float = Field(gt=0)
    evidence_url: str | None = Field(default=None, max_length=500)


class PriceChangeResult(BaseModel):
    id: int
    restaurant_id: int
    item_name: str
    current_price: float | None
    proposed_price: float
    evidence_url: str | None
    status: str
    reviewer_note: str | None
    created_at: datetime | None
    reviewed_at: datetime | None


class AdminOverview(BaseModel):
    kpis: list[AdminKpi]
    districts: list[AdminDistrictStat]
    tasks: list[AdminTask]
    task_counts: dict[str, int]
    period: str
    trends: list[AdminTrendPoint]


class ModerationSampleCreate(BaseModel):
    image_url: str = Field(min_length=1, max_length=500)
    predicted_label: str = Field(min_length=1, max_length=150)
    confidence: float = Field(ge=0, le=100)
    location: str | None = Field(default=None, max_length=255)
    device: str | None = Field(default=None, max_length=150)
    resolution: str | None = Field(default=None, max_length=80)
    gps: str | None = Field(default=None, max_length=80)
    venue_name: str | None = Field(default=None, max_length=150)
    venue_address: str | None = Field(default=None, max_length=255)


class ModerationDecision(BaseModel):
    decision: str = Field(pattern="^(pending|approved|rejected)$")
    corrected_label: str | None = Field(default=None, max_length=150)
    venue_name: str | None = Field(default=None, max_length=150)
    reviewer_note: str | None = Field(default=None, max_length=5000)


class ModerationSampleResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    image_url: str
    predicted_label: str
    corrected_label: str | None
    confidence: float
    location: str | None
    device: str | None
    resolution: str | None
    gps: str | None
    venue_name: str | None
    venue_address: str | None
    status: str
    reviewer_note: str | None
    created_at: datetime | None
    reviewed_at: datetime | None


class ModerationSamplePage(BaseModel):
    items: list[ModerationSampleResult]
    total: int
    page: int
    page_size: int
    total_pages: int
