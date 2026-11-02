from sqlalchemy import (
    Column, BigInteger, String,
    Boolean, DateTime
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from database.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    email = Column(String(100), unique=True, nullable=False)
    phone = Column(String(20), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)


    full_name = Column(String(100))
    avatar_url = Column(String(500))

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now()
    )

    roles = relationship(
        "Role",
        secondary="user_roles",
        back_populates="users"
    )

    reviews = relationship(
        "Review",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    favorites = relationship(
        "Food",
        secondary="favorites",
        back_populates="favorited_by"
    )