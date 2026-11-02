from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from pwdlib import PasswordHash

from database.database import get_db
from models import Food, Restaurant, Review, Role, User
from models.admin import AdminRestaurantState
from models.associations import restaurant_favorites
from routes.user_dependencies import require_active_user
from schemas.auth import (
    AuthProfileResponse,
    AuthProfileUpdate,
    AuthReviewResponse,
    LoginRequest,
    LoginResponse,
    UserRegister,
    UserResponse,
)
from security import create_access_token


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)

password_hash = PasswordHash.recommended()


@router.get("/me", response_model=AuthProfileResponse)
def get_current_user(
    db: Session = Depends(get_db),
    user: User = Depends(require_active_user),
):
    saved_restaurant_count = db.scalar(
        select(func.count())
        .select_from(restaurant_favorites)
        .join(
            Restaurant,
            Restaurant.id == restaurant_favorites.c.restaurant_id,
        )
        .outerjoin(
            AdminRestaurantState,
            AdminRestaurantState.restaurant_id == Restaurant.id,
        )
        .where(restaurant_favorites.c.user_id == user.id)
        .where(
            func.coalesce(AdminRestaurantState.status, "verified") == "verified"
        )
    ) or 0
    review_count = db.scalar(
        select(func.count(Review.id)).where(Review.user_id == user.id)
    ) or 0
    foods_reviewed_count = db.scalar(
        select(func.count(func.distinct(Review.food_id))).where(
            Review.user_id == user.id
        )
    ) or 0

    return AuthProfileResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        created_at=user.created_at,
        saved_restaurant_count=saved_restaurant_count,
        review_count=review_count,
        foods_reviewed_count=foods_reviewed_count,
    )


@router.patch("/me", response_model=AuthProfileResponse)
def update_current_user(
    data: AuthProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_active_user),
):
    updates = data.model_dump(exclude_unset=True)

    if "phone" in updates:
        existing_phone = db.scalar(
            select(User.id).where(
                User.phone == updates["phone"],
                User.id != user.id,
            )
        )
        if existing_phone is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Số điện thoại đã được sử dụng.",
            )

    for field, value in updates.items():
        setattr(user, field, value)

    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Thông tin hồ sơ bị trùng.",
        )

    return get_current_user(db=db, user=user)


@router.get("/me/reviews", response_model=list[AuthReviewResponse])
def get_current_user_reviews(
    db: Session = Depends(get_db),
    user: User = Depends(require_active_user),
):
    rows = db.execute(
        select(Review, Food.name)
        .join(Food, Food.id == Review.food_id)
        .where(Review.user_id == user.id)
        .order_by(Review.created_at.desc(), Review.id.desc())
    ).all()

    return [
        AuthReviewResponse(
            id=review.id,
            food_name=food_name,
            rating=review.rating,
            comment=review.comment,
            created_at=review.created_at,
        )
        for review, food_name in rows
    ]


@router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    identifier = data.identifier.strip()
    user = db.scalar(
        select(User).where(
            or_(
                func.lower(User.email) == identifier.lower(),
                User.phone == identifier,
                )
        )
    )

    if (
            user is None
            or not user.is_active
            or not password_hash.verify(data.password, user.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email/số điện thoại hoặc mật khẩu không chính xác.",
        )

    return {
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "roles": [role.name for role in user.roles],
        },
    }


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(data: UserRegister, db: Session = Depends(get_db)):
    email = str(data.email).strip().lower()
    phone = data.phone.strip()

    existing_user = db.scalar(
        select(User).where(
            or_(
                func.lower(User.email) == email,
                User.phone == phone,
                )
        )
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email hoặc số điện thoại đã được đăng ký.",
        )

    user_role = db.scalar(
        select(Role).where(func.lower(Role.name) == "user")
    )
    if user_role is None:
        user_role = Role(name="user", description="Người dùng")

    user = User(
        full_name=data.fullname,
        email=email,
        phone=phone,
        password_hash=password_hash.hash(data.password),
        roles=[user_role],
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email hoặc số điện thoại đã được sử dụng.",
        )

    return user