from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    Float,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.sql import func

from database.database import Base


class AdminRestaurantState(Base):
    __tablename__ = "admin_restaurant_states"

    restaurant_id = Column(
        BigInteger,
        ForeignKey("restaurants.id", ondelete="CASCADE"),
        primary_key=True,
    )
    status = Column(String(20), nullable=False, default="verified")
    category_name = Column(String(100))
    price_range = Column(String(100))
    heritage = Column(String(255))
    match_score = Column(Float, nullable=False, default=0)
    taste_score = Column(Float, nullable=False, default=0)
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class FoodModerationSample(Base):
    __tablename__ = "food_moderation_samples"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    image_url = Column(String(500), nullable=False)
    predicted_label = Column(String(150), nullable=False)
    corrected_label = Column(String(150))
    confidence = Column(Float, nullable=False)
    location = Column(String(255))
    device = Column(String(150))
    resolution = Column(String(80))
    gps = Column(String(80))
    venue_name = Column(String(150))
    venue_address = Column(String(255))
    status = Column(String(20), nullable=False, default="pending")
    reviewer_note = Column(Text)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    reviewed_at = Column(DateTime)


class PriceChangeRequest(Base):
    __tablename__ = "admin_price_change_requests"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    restaurant_id = Column(
        BigInteger,
        ForeignKey("restaurants.id", ondelete="CASCADE"),
        nullable=False,
    )
    item_name = Column(String(150), nullable=False)
    current_price = Column(Float)
    proposed_price = Column(Float, nullable=False)
    evidence_url = Column(String(500))
    status = Column(String(20), nullable=False, default="pending")
    reviewer_note = Column(Text)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    reviewed_at = Column(DateTime)
