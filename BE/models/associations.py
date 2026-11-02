from sqlalchemy import (
    Table, Column,
    BigInteger, ForeignKey,
    DateTime, DECIMAL,
    String
)
from sqlalchemy.sql import func

from database.database import Base

user_roles = Table(
    "user_roles",
    Base.metadata,
    Column(
        "user_id",
        BigInteger,
        ForeignKey(
            "users.id",
            ondelete="CASCADE"
        ),
        primary_key=True
    ),
    Column(
        "role_id",
        BigInteger,
        ForeignKey(
            "roles.id",
            ondelete="CASCADE"
        ),
        primary_key=True
    ),
)

favorites = Table(
    "favorites",
    Base.metadata,
    Column(
        "user_id",
        BigInteger,
        ForeignKey(
            "users.id",
            ondelete="CASCADE"
        ),
        primary_key=True
    ),
    Column(
        "food_id",
        BigInteger,
        ForeignKey(
            "foods.id",
            ondelete="CASCADE"
        ),
        primary_key=True
    ),
    Column(
        "created_at",
        DateTime,
        server_default=func.now()
    ),
)

restaurant_favorites = Table(
    "restaurant_favorites",
    Base.metadata,
    Column(
        "user_id",
        BigInteger,
        ForeignKey(
            "users.id",
            ondelete="CASCADE"
        ),
        primary_key=True
    ),
    Column(
        "restaurant_id",
        BigInteger,
        ForeignKey(
            "restaurants.id",
            ondelete="CASCADE"
        ),
        primary_key=True
    ),
    Column(
        "created_at",
        DateTime,
        server_default=func.now()
    ),
)

food_restaurants = Table(
    "food_restaurants",
    Base.metadata,
    Column(
        "food_id",
        BigInteger,
        ForeignKey(
            "foods.id",
            ondelete="CASCADE"
        ),
        primary_key=True
    ),
    Column(
        "restaurant_id",
        BigInteger,
        ForeignKey(
            "restaurants.id",
            ondelete="CASCADE"
        ),
        primary_key=True
    ),
    Column("price", DECIMAL(12, 2)),
    Column("note", String(255)),
)