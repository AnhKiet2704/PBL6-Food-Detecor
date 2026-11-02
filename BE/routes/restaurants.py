from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, insert, select
from sqlalchemy.orm import Session

from database.database import get_db
from models import Category, Food, Restaurant, Review, User
from models.admin import AdminRestaurantState
from models.associations import food_restaurants, restaurant_favorites
from routes.user_dependencies import require_active_user
from schemas.food import (
    HomeRestaurant,
    RestaurantDetailResponse,
    RestaurantMenuItem,
    RestaurantReviewCreate,
    RestaurantReviewItem,
    RestaurantReviewPage,
    SavedRestaurantItem,
)

router = APIRouter(prefix="/api/restaurants", tags=["Restaurants"])


def _verified_clause():
    return func.coalesce(AdminRestaurantState.status, "verified") == "verified"


def _restaurant_rating(restaurant_id: int):
    return (
        select(func.coalesce(func.avg(Review.rating), 0))
        .select_from(food_restaurants)
        .join(Review, Review.food_id == food_restaurants.c.food_id)
        .where(
            food_restaurants.c.restaurant_id == restaurant_id,
            Review.rating.between(1, 5),
        )
        .scalar_subquery()
    )


def _restaurant_review_count(restaurant_id: int):
    return (
        select(func.count(Review.id))
        .select_from(food_restaurants)
        .join(Review, Review.food_id == food_restaurants.c.food_id)
        .where(
            food_restaurants.c.restaurant_id == restaurant_id,
            Review.rating.between(1, 5),
        )
        .scalar_subquery()
    )


def _get_public_restaurant(db: Session, restaurant_id: int):
    row = db.execute(
        select(Restaurant, AdminRestaurantState)
        .outerjoin(
            AdminRestaurantState,
            AdminRestaurantState.restaurant_id == Restaurant.id,
        )
        .where(Restaurant.id == restaurant_id, _verified_clause())
    ).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy quán đã xác minh.")
    return row


@router.get("/saved", response_model=list[SavedRestaurantItem])
def get_saved_restaurants(
    db: Session = Depends(get_db),
    user: User = Depends(require_active_user),
):
    rows = db.execute(
        select(
            Restaurant,
            _restaurant_rating(Restaurant.id),
            _restaurant_review_count(Restaurant.id),
            select(func.min(food_restaurants.c.price))
            .where(food_restaurants.c.restaurant_id == Restaurant.id)
            .correlate(Restaurant)
            .scalar_subquery(),
            select(func.max(food_restaurants.c.price))
            .where(food_restaurants.c.restaurant_id == Restaurant.id)
            .correlate(Restaurant)
            .scalar_subquery(),
        )
        .join(
            restaurant_favorites,
            restaurant_favorites.c.restaurant_id == Restaurant.id,
        )
        .outerjoin(
            AdminRestaurantState,
            AdminRestaurantState.restaurant_id == Restaurant.id,
        )
        .where(
            restaurant_favorites.c.user_id == user.id,
            _verified_clause(),
        )
        .order_by(
            restaurant_favorites.c.created_at.desc(),
            Restaurant.id.desc(),
        )
    ).all()

    return [
        SavedRestaurantItem(
            id=restaurant.id,
            name=restaurant.name,
            slug=restaurant.slug,
            address=restaurant.address,
            district=restaurant.district,
            phone=restaurant.phone,
            opening_hours=restaurant.opening_hours,
            image_url=restaurant.image_url,
            average_rating=round(float(rating or 0), 1),
            review_count=int(review_count or 0),
            min_price=float(min_price) if min_price is not None else None,
            max_price=float(max_price) if max_price is not None else None,
        )
        for restaurant, rating, review_count, min_price, max_price in rows
    ]


@router.put("/{restaurant_id}/favorite", status_code=status.HTTP_200_OK)
def save_restaurant(
    restaurant_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_active_user),
):
    _get_public_restaurant(db, restaurant_id)

    already_saved = db.scalar(
        select(restaurant_favorites.c.user_id).where(
            restaurant_favorites.c.user_id == user.id,
            restaurant_favorites.c.restaurant_id == restaurant_id,
        )
    )
    if already_saved is None:
        db.execute(
            insert(restaurant_favorites).values(
                user_id=user.id,
                restaurant_id=restaurant_id,
            )
        )
        db.commit()

    return {"saved": True}


@router.delete("/{restaurant_id}/favorite", status_code=status.HTTP_200_OK)
def remove_saved_restaurant(
    restaurant_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_active_user),
):
    db.execute(
        delete(restaurant_favorites).where(
            restaurant_favorites.c.user_id == user.id,
            restaurant_favorites.c.restaurant_id == restaurant_id,
        )
    )
    db.commit()
    return {"saved": False}


@router.get("/{restaurant_id}", response_model=RestaurantDetailResponse)
def get_restaurant_detail(
    restaurant_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=6, ge=1, le=30),
    db: Session = Depends(get_db),
):
    restaurant, state = _get_public_restaurant(db, restaurant_id)

    menu_rows = db.execute(
        select(
            Food,
            food_restaurants.c.price,
            Category.name,
        )
        .select_from(food_restaurants)
        .join(Food, Food.id == food_restaurants.c.food_id)
        .outerjoin(Category, Category.id == Food.category_id)
        .where(
            food_restaurants.c.restaurant_id == restaurant_id,
            Food.status == "PUBLISHED",
        )
        .order_by(Food.is_featured.desc(), Food.name)
        .limit(12)
    ).all()
    menu = [
        RestaurantMenuItem(
            food_id=food.id,
            name=food.name,
            description=food.short_description or food.description,
            image_url=food.main_image_url,
            price=float(price) if price is not None else None,
            category=category_name,
        )
        for food, price, category_name in menu_rows
    ]

    gallery = []
    for image_url in [restaurant.image_url, *(item.image_url for item in menu)]:
        if image_url and image_url not in gallery:
            gallery.append(image_url)
    image_rows = db.scalars(
        select(Food.main_image_url)
        .select_from(food_restaurants)
        .join(Food, Food.id == food_restaurants.c.food_id)
        .where(
            food_restaurants.c.restaurant_id == restaurant_id,
            Food.status == "PUBLISHED",
            Food.main_image_url.is_not(None),
        )
        .order_by(Food.is_featured.desc(), Food.name)
        .limit(10)
    ).all()
    for image_url in image_rows:
        if image_url and image_url not in gallery:
            gallery.append(image_url)

    review_base = (
        select(Review.id)
        .select_from(food_restaurants)
        .join(Review, Review.food_id == food_restaurants.c.food_id)
        .where(
            food_restaurants.c.restaurant_id == restaurant_id,
            Review.rating.between(1, 5),
            Review.comment.is_not(None),
            func.length(func.trim(Review.comment)) > 0,
        )
    )
    review_total = db.scalar(
        select(func.count()).select_from(review_base.subquery())
    ) or 0
    review_rows = db.execute(
        select(Review, User.full_name, Food.name)
        .select_from(food_restaurants)
        .join(Review, Review.food_id == food_restaurants.c.food_id)
        .join(User, User.id == Review.user_id)
        .join(Food, Food.id == Review.food_id)
        .where(
            food_restaurants.c.restaurant_id == restaurant_id,
            Review.rating.between(1, 5),
            Review.comment.is_not(None),
            func.length(func.trim(Review.comment)) > 0,
        )
        .order_by(Review.created_at.desc(), Review.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    reviews = RestaurantReviewPage(
        items=[
            RestaurantReviewItem(
                id=review.id,
                author=full_name or "Thực khách",
                rating=review.rating,
                comment=review.comment,
                food_name=food_name,
                created_at=review.created_at,
            )
            for review, full_name, food_name in review_rows
        ],
        total=review_total,
        page=page,
        page_size=page_size,
        total_pages=ceil(review_total / page_size),
    )

    prices = [item.price for item in menu if item.price is not None]
    if prices:
        price_min, price_max = min(prices), max(prices)
    else:
        price_min = price_max = None

    similar_rows = db.execute(
        select(
            Restaurant,
            _restaurant_rating(Restaurant.id),
            _restaurant_review_count(Restaurant.id),
            select(func.min(food_restaurants.c.price))
            .where(food_restaurants.c.restaurant_id == Restaurant.id)
            .correlate(Restaurant)
            .scalar_subquery(),
        )
        .outerjoin(
            AdminRestaurantState,
            AdminRestaurantState.restaurant_id == Restaurant.id,
        )
        .where(
            Restaurant.id != restaurant_id,
            Restaurant.district == restaurant.district,
            _verified_clause(),
        )
        .order_by(Restaurant.name)
        .limit(4)
    ).all()
    similar_restaurants = [
        HomeRestaurant(
            id=similar.id,
            slug=similar.slug,
            name=similar.name,
            address=similar.address,
            district=similar.district,
            image_url=similar.image_url,
            latitude=float(similar.latitude) if similar.latitude is not None else None,
            longitude=float(similar.longitude) if similar.longitude is not None else None,
            average_rating=round(float(rating or 0), 1),
            review_count=int(count or 0),
            min_price=float(min_price) if min_price is not None else None,
            distance_km=None,
        )
        for similar, rating, count, min_price in similar_rows
    ]

    average_rating = db.scalar(select(_restaurant_rating(restaurant_id))) or 0
    total_reviews = db.scalar(select(_restaurant_review_count(restaurant_id))) or 0
    return RestaurantDetailResponse(
        id=restaurant.id,
        name=restaurant.name,
        slug=restaurant.slug,
        address=restaurant.address,
        district=restaurant.district,
        phone=restaurant.phone,
        opening_hours=restaurant.opening_hours,
        description=restaurant.description,
        image_url=restaurant.image_url,
        latitude=float(restaurant.latitude) if restaurant.latitude is not None else None,
        longitude=float(restaurant.longitude) if restaurant.longitude is not None else None,
        verified=True,
        verified_at=state.updated_at if state else restaurant.created_at,
        price_min=price_min,
        price_max=price_max,
        average_rating=round(float(average_rating), 1),
        review_count=int(total_reviews),
        gallery=gallery,
        menu=menu,
        reviews=reviews,
        similar_restaurants=similar_restaurants,
    )


@router.post(
    "/{restaurant_id}/reviews",
    status_code=status.HTTP_201_CREATED,
    response_model=RestaurantReviewItem,
)
def create_restaurant_review(
    restaurant_id: int,
    data: RestaurantReviewCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_active_user),
):
    _get_public_restaurant(db, restaurant_id)
    comment = data.comment.strip()
    if not comment:
        raise HTTPException(status_code=422, detail="Nội dung đánh giá không được để trống.")
    linked_food = db.scalar(
        select(Food.id)
        .select_from(food_restaurants)
        .join(Food, Food.id == food_restaurants.c.food_id)
        .where(
            food_restaurants.c.restaurant_id == restaurant_id,
            food_restaurants.c.food_id == data.food_id,
            Food.status == "PUBLISHED",
        )
    )
    if linked_food is None:
        raise HTTPException(
            status_code=422,
            detail="Món ăn không thuộc menu đang công bố của quán này.",
        )
    review = Review(
        user_id=user.id,
        food_id=data.food_id,
        rating=data.rating,
        comment=comment,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    food_name = db.scalar(select(Food.name).where(Food.id == data.food_id))
    return RestaurantReviewItem(
        id=review.id,
        author=user.full_name or "Thực khách",
        rating=review.rating,
        comment=review.comment,
        food_name=food_name or "",
        created_at=review.created_at,
    )
