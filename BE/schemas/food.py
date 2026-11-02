from datetime import datetime

from pydantic import BaseModel, Field


class GooglePlaceInfo(BaseModel):
    place_id: str | None
    name: str | None
    address: str | None
    phone: str | None
    website_url: str | None
    maps_url: str | None
    latitude: float | None
    longitude: float | None
    rating: float | None
    user_rating_count: int | None
    opening_hours: list[str] | None


class FoodRestaurantResult(BaseModel):
    id: int
    name: str
    address: str
    image_url: str | None
    price: float | None
    google_place: GooglePlaceInfo | None = None


class FoodSearchItem(BaseModel):
    id: int
    name: str
    description: str | None
    category: str | None
    image_url: str | None
    average_price: float | None
    average_rating: float
    review_count: int
    restaurants: list[FoodRestaurantResult]


class FoodSearchResponse(BaseModel):
    items: list[FoodSearchItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class HomeCategory(BaseModel):
    name: str
    slug: str
    image_url: str | None
    food_count: int


class HomeRestaurant(BaseModel):
    id: int
    slug: str
    name: str
    address: str
    district: str | None
    image_url: str | None
    latitude: float | None
    longitude: float | None
    average_rating: float
    review_count: int
    min_price: float | None
    distance_km: float | None
    maps_url: str | None = None


class HomeReview(BaseModel):
    id: int
    author: str
    food_name: str
    rating: int
    comment: str
    created_at: datetime | None


class HomepageResponse(BaseModel):
    categories: list[HomeCategory]
    featured_foods: list[FoodSearchItem]
    popular_foods: list[FoodSearchItem]
    nearby_restaurants: list[HomeRestaurant]
    recent_reviews: list[HomeReview]
    restaurant_count: int
    district: str | None


class RestaurantMenuItem(BaseModel):
    food_id: int
    name: str
    description: str | None
    image_url: str | None
    price: float | None
    category: str | None


class RestaurantReviewItem(BaseModel):
    id: int
    author: str
    rating: int
    comment: str
    food_name: str
    created_at: datetime | None


class RestaurantReviewPage(BaseModel):
    items: list[RestaurantReviewItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class RestaurantDetailResponse(BaseModel):
    id: int
    name: str
    slug: str
    address: str
    district: str | None
    phone: str | None
    opening_hours: str | None
    description: str | None
    image_url: str | None
    latitude: float | None
    longitude: float | None
    verified: bool
    verified_at: datetime | None
    price_min: float | None
    price_max: float | None
    average_rating: float
    review_count: int
    gallery: list[str]
    menu: list[RestaurantMenuItem]
    reviews: RestaurantReviewPage
    similar_restaurants: list[HomeRestaurant]


class SavedRestaurantItem(BaseModel):
    id: int
    name: str
    slug: str
    address: str
    district: str | None
    phone: str | None
    opening_hours: str | None
    image_url: str | None
    average_rating: float
    review_count: int
    min_price: float | None
    max_price: float | None


class RestaurantReviewCreate(BaseModel):
    food_id: int
    rating: int = Field(ge=1, le=5)
    comment: str = Field(min_length=1, max_length=3000)
