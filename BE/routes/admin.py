import re
import unicodedata
from datetime import datetime, timedelta
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database.database import get_db
from models import Category, Food, Restaurant, Review
from models.admin import AdminRestaurantState, FoodModerationSample, PriceChangeRequest
from models.associations import food_restaurants
from routes.admin_dependencies import require_admin
from schemas.admin import (
    AdminDistrictStat,
    AdminDashboardStats,
    AdminKpi,
    AdminOverview,
    AdminRestaurantCreate,
    AdminRestaurantPage,
    AdminRestaurantResult,
    AdminRestaurantStatusUpdate,
    AdminRestaurantUpdate,
    AdminTask,
    AdminTaskResolution,
    AdminTrendPoint,
    ModerationDecision,
    ModerationSampleCreate,
    ModerationSamplePage,
    ModerationSampleResult,
    PriceChangeCreate,
    PriceChangeResult,
)

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"],
    dependencies=[Depends(require_admin)],
)

_RESTAURANT_STATUSES = {"pending", "verified", "rejected", "closed"}


def _slugify(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_value).strip("-").lower()
    return slug or "restaurant"


def _unique_slug(db: Session, value: str, excluded_id: int | None = None) -> str:
    base = _slugify(value)[:170]
    slug = base
    suffix = 2
    while True:
        statement = select(Restaurant.id).where(Restaurant.slug == slug)
        if excluded_id is not None:
            statement = statement.where(Restaurant.id != excluded_id)
        if db.scalar(statement) is None:
            return slug
        slug = f"{base[:160]}-{suffix}"
        suffix += 1


def _restaurant_result(row: tuple) -> AdminRestaurantResult:
    restaurant, state, category_name, price_range, average_rating, review_count = row
    return AdminRestaurantResult(
        id=restaurant.id,
        name=restaurant.name,
        slug=restaurant.slug,
        address=restaurant.address,
        district=restaurant.district,
        phone=restaurant.phone,
        opening_hours=restaurant.opening_hours,
        description=restaurant.description,
        image_url=restaurant.image_url,
        category=state.category_name if state and state.category_name else category_name,
        price_range=(
            state.price_range
            if state and state.price_range
            else (
                f"{int(float(price_range)):,}đ".replace(",", ".")
                if price_range is not None
                else None
            )
        ),
        rating=round(float(average_rating or 0), 1),
        review_count=int(review_count or 0),
        status=state.status if state else "verified",
        heritage=state.heritage if state else None,
        match_score=float(state.match_score or 0) if state else 0,
        taste_score=float(state.taste_score or 0) if state else 0,
        created_at=restaurant.created_at,
    )


def _restaurant_query():
    category = (
        select(Category.name)
        .join(Food, Food.category_id == Category.id)
        .join(food_restaurants, food_restaurants.c.food_id == Food.id)
        .where(food_restaurants.c.restaurant_id == Restaurant.id)
        .order_by(Category.name)
        .limit(1)
        .correlate(Restaurant)
        .scalar_subquery()
    )
    price = (
        select(func.avg(food_restaurants.c.price))
        .where(food_restaurants.c.restaurant_id == Restaurant.id)
        .correlate(Restaurant)
        .scalar_subquery()
    )
    reviews = (
        select(func.count(Review.id))
        .select_from(food_restaurants)
        .join(Review, Review.food_id == food_restaurants.c.food_id)
        .where(food_restaurants.c.restaurant_id == Restaurant.id)
        .correlate(Restaurant)
        .scalar_subquery()
    )
    rating = (
        select(func.avg(Review.rating))
        .select_from(food_restaurants)
        .join(Review, Review.food_id == food_restaurants.c.food_id)
        .where(food_restaurants.c.restaurant_id == Restaurant.id)
        .correlate(Restaurant)
        .scalar_subquery()
    )
    return select(
        Restaurant,
        AdminRestaurantState,
        category.label("category_name"),
        price.label("average_price"),
        rating.label("average_rating"),
        reviews.label("review_count"),
    ).outerjoin(
        AdminRestaurantState,
        AdminRestaurantState.restaurant_id == Restaurant.id,
    )


def _get_restaurant_row(db: Session, restaurant_id: int):
    row = db.execute(
        _restaurant_query().where(Restaurant.id == restaurant_id)
    ).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy quán ăn.")
    return row


@router.get("/restaurants", response_model=AdminRestaurantPage)
def list_restaurants(
    q: str = Query(default="", max_length=100),
    district: str | None = Query(default=None, max_length=100),
    category: str | None = Query(default=None, max_length=100),
    restaurant_status: str | None = Query(default=None, alias="status"),
    sort: str = Query(default="rating_desc", pattern="^(rating_desc|rating_asc|name)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    statement = _restaurant_query()
    if q.strip():
        term = f"%{q.strip()}%"
        statement = statement.where(
            or_(
                Restaurant.name.ilike(term),
                Restaurant.address.ilike(term),
                Restaurant.description.ilike(term),
                Restaurant.district.ilike(term),
            )
        )
    if district:
        statement = statement.where(Restaurant.district.ilike(f"%{district.strip()}%"))
    if category:
        matching_restaurant_ids = (
            select(food_restaurants.c.restaurant_id)
            .join(Food, Food.id == food_restaurants.c.food_id)
            .join(Category, Category.id == Food.category_id)
            .where(Category.name.ilike(f"%{category.strip()}%"))
        )
        statement = statement.where(
            or_(
                AdminRestaurantState.category_name.ilike(f"%{category.strip()}%"),
                Restaurant.id.in_(matching_restaurant_ids),
            )
        )
    if restaurant_status:
        if restaurant_status not in _RESTAURANT_STATUSES:
            raise HTTPException(status_code=422, detail="Trạng thái quán không hợp lệ.")
        statement = statement.where(
            func.coalesce(AdminRestaurantState.status, "verified") == restaurant_status
        )

    total = db.scalar(
        select(func.count()).select_from(statement.order_by(None).subquery())
    ) or 0

    if sort == "name":
        statement = statement.order_by(Restaurant.name.asc())
    elif sort == "rating_asc":
        statement = statement.order_by(
            statement.selected_columns.average_rating.asc(),
            Restaurant.name.asc(),
        )
    else:
        statement = statement.order_by(
            statement.selected_columns.average_rating.desc(),
            Restaurant.name.asc(),
        )

    rows = db.execute(
        statement.offset((page - 1) * page_size).limit(page_size)
    ).all()
    pending_count = db.scalar(
        select(func.count(AdminRestaurantState.restaurant_id)).where(
            AdminRestaurantState.status == "pending"
        )
    ) or 0
    verified_count = db.scalar(
        select(func.count(Restaurant.id)).outerjoin(
            AdminRestaurantState,
            AdminRestaurantState.restaurant_id == Restaurant.id,
        ).where(func.coalesce(AdminRestaurantState.status, "verified") == "verified")
    ) or 0
    return AdminRestaurantPage(
        items=[_restaurant_result(row) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size),
        selected_count=0,
        pending_count=pending_count,
        verified_count=verified_count,
    )


@router.get("/dashboard/stats", response_model=AdminDashboardStats)
def get_admin_dashboard_stats(db: Session = Depends(get_db)):
    restaurant_count = db.scalar(select(func.count(Restaurant.id))) or 0
    verified_count = db.scalar(
        select(func.count(Restaurant.id))
        .outerjoin(
            AdminRestaurantState,
            AdminRestaurantState.restaurant_id == Restaurant.id,
        )
        .where(func.coalesce(AdminRestaurantState.status, "verified") == "verified")
    ) or 0
    pending_count = db.scalar(
        select(func.count(AdminRestaurantState.restaurant_id)).where(
            AdminRestaurantState.status == "pending"
        )
    ) or 0
    average_rating = db.scalar(
        select(func.avg(Review.rating)).where(Review.rating.between(1, 5))
    ) or 0
    review_count = db.scalar(
        select(func.count(Review.id)).where(Review.rating.between(1, 5))
    ) or 0

    return AdminDashboardStats(
        restaurant_count=restaurant_count,
        verified_count=verified_count,
        pending_count=pending_count,
        average_rating=round(float(average_rating), 2),
        review_count=review_count,
    )


@router.post(
    "/restaurants",
    response_model=AdminRestaurantResult,
    status_code=status.HTTP_201_CREATED,
)
def create_restaurant(data: AdminRestaurantCreate, db: Session = Depends(get_db)):
    restaurant = Restaurant(
        name=data.name.strip(),
        slug=_unique_slug(db, data.name),
        address=data.address.strip(),
        district=data.district,
        phone=data.phone,
        opening_hours=data.opening_hours,
        description=data.description,
        image_url=data.image_url,
    )
    try:
        db.add(restaurant)
        db.flush()
        db.add(
            AdminRestaurantState(
                restaurant_id=restaurant.id,
                status="pending",
                category_name=data.category,
                price_range=data.price_range,
            )
        )
        db.commit()
        db.refresh(restaurant)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Không thể tạo hồ sơ quán ăn.") from None
    return _restaurant_result(_get_restaurant_row(db, restaurant.id))


@router.patch("/restaurants/{restaurant_id}", response_model=AdminRestaurantResult)
def update_restaurant(
    restaurant_id: int,
    data: AdminRestaurantUpdate,
    db: Session = Depends(get_db),
):
    row = _get_restaurant_row(db, restaurant_id)
    restaurant = row[0]
    state = row[1]
    updates = data.model_dump(exclude_unset=True)
    for field in ("name", "address", "district", "phone", "opening_hours", "description", "image_url"):
        if field in updates and updates[field] is not None:
            setattr(restaurant, field, updates[field].strip() if isinstance(updates[field], str) else updates[field])
    if "name" in updates and updates["name"]:
        restaurant.slug = _unique_slug(db, updates["name"], excluded_id=restaurant_id)

    if "category" in updates or "price_range" in updates:
        if state is None:
            state = AdminRestaurantState(restaurant_id=restaurant_id, status="verified")
            db.add(state)
        if "category" in updates:
            state.category_name = updates["category"]
        if "price_range" in updates:
            state.price_range = updates["price_range"]
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Tên quán đã được sử dụng.") from None
    return _restaurant_result(_get_restaurant_row(db, restaurant_id))


@router.patch("/restaurants/{restaurant_id}/status", response_model=AdminRestaurantResult)
def update_restaurant_status(
    restaurant_id: int,
    data: AdminRestaurantStatusUpdate,
    db: Session = Depends(get_db),
):
    row = _get_restaurant_row(db, restaurant_id)
    state = row[1]
    if state is None:
        state = AdminRestaurantState(restaurant_id=restaurant_id)
        db.add(state)
    state.status = data.status
    db.commit()
    return _restaurant_result(_get_restaurant_row(db, restaurant_id))


@router.get("/moderation/samples", response_model=ModerationSamplePage)
def list_moderation_samples(
    sample_status: str = Query(default="pending", alias="status", pattern="^(pending|approved|rejected|all)$"),
    min_confidence: float = Query(default=0, ge=0, le=100),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=50),
    db: Session = Depends(get_db),
):
    statement = select(FoodModerationSample).where(
        FoodModerationSample.confidence >= min_confidence
    )
    if sample_status != "all":
        statement = statement.where(FoodModerationSample.status == sample_status)
    total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0
    rows = db.scalars(
        statement.order_by(FoodModerationSample.created_at.asc(), FoodModerationSample.id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return ModerationSamplePage(
        items=rows,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size),
    )


@router.post(
    "/moderation/samples",
    response_model=ModerationSampleResult,
    status_code=status.HTTP_201_CREATED,
)
def create_moderation_sample(data: ModerationSampleCreate, db: Session = Depends(get_db)):
    sample = FoodModerationSample(**data.model_dump())
    db.add(sample)
    db.commit()
    db.refresh(sample)
    return sample


@router.patch(
    "/moderation/samples/{sample_id}",
    response_model=ModerationSampleResult,
)
def decide_moderation_sample(
    sample_id: int,
    data: ModerationDecision,
    db: Session = Depends(get_db),
):
    sample = db.get(FoodModerationSample, sample_id)
    if sample is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy mẫu cần kiểm duyệt.")
    if sample.status != "pending":
        raise HTTPException(status_code=409, detail="Mẫu này đã được xử lý trước đó.")
    if data.corrected_label is not None:
        sample.corrected_label = data.corrected_label.strip()
    if data.venue_name is not None:
        sample.venue_name = data.venue_name.strip()
    sample.reviewer_note = data.reviewer_note
    sample.status = data.decision
    sample.reviewed_at = datetime.utcnow() if data.decision != "pending" else None
    db.commit()
    db.refresh(sample)
    return sample


@router.get("/price-changes", response_model=list[PriceChangeResult])
def list_price_changes(
    price_status: str = Query(default="pending", alias="status", pattern="^(pending|approved|rejected|all)$"),
    db: Session = Depends(get_db),
):
    statement = select(PriceChangeRequest)
    if price_status != "all":
        statement = statement.where(PriceChangeRequest.status == price_status)
    return db.scalars(
        statement.order_by(PriceChangeRequest.created_at.asc(), PriceChangeRequest.id.asc())
    ).all()


@router.post(
    "/price-changes",
    response_model=PriceChangeResult,
    status_code=status.HTTP_201_CREATED,
)
def create_price_change(data: PriceChangeCreate, db: Session = Depends(get_db)):
    if db.get(Restaurant, data.restaurant_id) is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy quán ăn.")
    request = PriceChangeRequest(**data.model_dump())
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


@router.patch("/price-changes/{request_id}", response_model=PriceChangeResult)
def decide_price_change(
    request_id: int,
    data: AdminTaskResolution,
    db: Session = Depends(get_db),
):
    request = db.get(PriceChangeRequest, request_id)
    if request is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy đề xuất thay đổi giá.")
    if request.status != "pending":
        raise HTTPException(status_code=409, detail="Đề xuất thay đổi giá đã được xử lý.")
    if data.decision == "approved":
        food_id = db.scalar(
            select(Food.id)
            .join(food_restaurants, food_restaurants.c.food_id == Food.id)
            .where(
                food_restaurants.c.restaurant_id == request.restaurant_id,
                func.lower(Food.name) == request.item_name.lower(),
            )
        )
        if food_id is None:
            raise HTTPException(
                status_code=409,
                detail="Món chưa được liên kết với quán nên không thể cập nhật giá.",
            )
        db.execute(
            update(food_restaurants)
            .where(
                food_restaurants.c.restaurant_id == request.restaurant_id,
                food_restaurants.c.food_id == food_id,
            )
            .values(price=request.proposed_price)
        )
    request.status = data.decision
    request.reviewer_note = data.reviewer_note
    request.reviewed_at = datetime.utcnow()
    db.commit()
    db.refresh(request)
    return request


@router.get("/overview", response_model=AdminOverview)
def get_admin_overview(
    period: str = Query(default="7d", pattern="^(7d|30d|quarter)$"),
    db: Session = Depends(get_db),
):
    now = datetime.now()
    if period == "quarter":
        quarter_start_month = ((now.month - 1) // 3) * 3 + 1
        period_start = datetime(now.year, quarter_start_month, 1)
        bucket_starts = [
            datetime(
                now.year + ((quarter_start_month - 1 + index) // 12),
                ((quarter_start_month - 1 + index) % 12) + 1,
                1,
            )
            for index in range(3)
        ]
        trend_labels = [start.strftime("%m/%Y") for start in bucket_starts]
    elif period == "30d":
        period_start = now - timedelta(days=30)
        bucket_starts = [period_start + timedelta(days=index * 5) for index in range(6)]
        trend_labels = [
            f"{start.strftime('%d/%m')}–{(start + timedelta(days=4)).strftime('%d/%m')}"
            for start in bucket_starts
        ]
    else:
        period_start = datetime(now.year, now.month, now.day) - timedelta(days=6)
        bucket_starts = [period_start + timedelta(days=index) for index in range(7)]
        trend_labels = [start.strftime("%d/%m") for start in bucket_starts]

    trend_rows = [
        db.scalars(
            select(model.created_at).where(
                model.created_at >= period_start,
                model.created_at <= now,
            )
        ).all()
        for model in (Restaurant, Review, FoodModerationSample)
    ]
    trend_values = [[0, 0, 0] for _ in bucket_starts]
    for metric_index, timestamps in enumerate(trend_rows):
        for timestamp in timestamps:
            if timestamp is None:
                continue
            if period == "quarter":
                bucket_index = (timestamp.year - period_start.year) * 12 + timestamp.month - period_start.month
            elif period == "30d":
                bucket_index = min((timestamp - period_start).days // 5, 5)
            else:
                bucket_index = (timestamp.date() - period_start.date()).days
            if 0 <= bucket_index < len(trend_values):
                trend_values[bucket_index][metric_index] += 1

    restaurant_count = db.scalar(select(func.count(Restaurant.id)) ) or 0
    verified_count = db.scalar(
        select(func.count(Restaurant.id)).outerjoin(
            AdminRestaurantState,
            AdminRestaurantState.restaurant_id == Restaurant.id,
        ).where(func.coalesce(AdminRestaurantState.status, "verified") == "verified")
    ) or 0
    pending_restaurants = db.scalar(
        select(func.count(AdminRestaurantState.restaurant_id)).where(
            AdminRestaurantState.status == "pending"
        )
    ) or 0
    food_search_count = db.scalar(
        select(func.count(Food.id)).where(Food.status == "PUBLISHED")
    ) or 0
    total_food_count = db.scalar(select(func.count(Food.id))) or 0
    moderation_total = db.scalar(select(func.count(FoodModerationSample.id))) or 0
    moderation_count = db.scalar(
        select(func.count(FoodModerationSample.id)).where(
            FoodModerationSample.status == "pending"
        )
    ) or 0
    price_change_count = db.scalar(
        select(func.count(PriceChangeRequest.id)).where(
            PriceChangeRequest.status == "pending"
        )
    ) or 0
    review_count = db.scalar(select(func.count(Review.id))) or 0
    valid_reviews = db.scalar(select(func.count(Review.id)).where(Review.rating.between(1, 5))) or 0

    district_rows = db.execute(
        select(Restaurant.district, func.count(Restaurant.id))
        .group_by(Restaurant.district)
        .order_by(func.count(Restaurant.id).desc())
    ).all()
    districts = [
        AdminDistrictStat(
            name=district or "Chưa phân khu",
            restaurant_count=count,
            percent=round((count / restaurant_count * 100), 1) if restaurant_count else 0,
        )
        for district, count in district_rows
    ]

    task_rows = db.execute(
        select(Restaurant.id, Restaurant.name, Restaurant.address, Restaurant.created_at)
        .join(
            AdminRestaurantState,
            AdminRestaurantState.restaurant_id == Restaurant.id,
        )
        .where(AdminRestaurantState.status == "pending")
        .order_by(Restaurant.created_at.asc())
        .limit(100)
    ).all()
    tasks = [
        AdminTask(
            id=f"restaurant-{restaurant_id}",
            kind="review",
            title=f"Thẩm định hồ sơ: {name}",
            description=address,
            status="pending",
            created_at=created_at,
            restaurant_id=restaurant_id,
        )
        for restaurant_id, name, address, created_at in task_rows
    ]
    moderation_rows = db.scalars(
        select(FoodModerationSample)
        .where(FoodModerationSample.status == "pending")
        .order_by(FoodModerationSample.created_at.asc())
        .limit(100)
    ).all()
    tasks.extend(
        AdminTask(
            id=f"moderation-{sample.id}",
            kind="ai",
            title=f"Kiểm duyệt ảnh: {sample.predicted_label}",
            description=sample.location or "Chưa có thông tin vị trí",
            status="pending",
            created_at=sample.created_at,
            sample_id=sample.id,
        )
        for sample in moderation_rows
    )
    price_change_rows = db.execute(
        select(
            PriceChangeRequest.id,
            PriceChangeRequest.item_name,
            PriceChangeRequest.proposed_price,
            Restaurant.name,
            PriceChangeRequest.created_at,
        )
        .join(Restaurant, Restaurant.id == PriceChangeRequest.restaurant_id)
        .where(PriceChangeRequest.status == "pending")
        .order_by(PriceChangeRequest.created_at.asc())
        .limit(100)
    ).all()
    tasks.extend(
        AdminTask(
            id=f"price-{request_id}",
            kind="price",
            title=f"Đề xuất giá: {item_name}",
            description=f"{restaurant_name} · Giá mới {proposed_price:,.0f}đ",
            status="pending",
            created_at=created_at,
            price_change_id=request_id,
        )
        for request_id, item_name, proposed_price, restaurant_name, created_at in price_change_rows
    )
    tasks.sort(key=lambda task: (task.created_at or datetime.max, task.id))
    tasks = tasks[:100]

    return AdminOverview(
        kpis=[
            AdminKpi(
                key="restaurants",
                title="Tổng số quán ăn",
                value=restaurant_count,
                detail=f"{verified_count} quán đã xác minh",
                progress=round(verified_count / restaurant_count * 100, 1) if restaurant_count else 0,
            ),
            AdminKpi(
                key="published_foods",
                title="Món ăn đã công bố",
                value=food_search_count,
                detail="Món đang hiển thị trên cẩm nang",
                progress=round(food_search_count / total_food_count * 100, 1) if total_food_count else 0,
            ),
            AdminKpi(
                key="moderation",
                title="Ảnh chờ kiểm duyệt",
                value=moderation_count,
                detail="Mẫu ảnh đang chờ quản trị viên",
                progress=round((moderation_total - moderation_count) / moderation_total * 100, 1)
                if moderation_total else 0,
            ),
            AdminKpi(
                key="reviews",
                title="Đánh giá thực khách",
                value=review_count,
                detail=f"{valid_reviews} đánh giá có điểm từ 1 đến 5",
                progress=round(valid_reviews / review_count * 100, 1) if review_count else 0,
            ),
        ],
        districts=districts,
        tasks=tasks,
        task_counts={
            "review": pending_restaurants,
            "price": price_change_count,
            "ai": moderation_count,
            "all": pending_restaurants + price_change_count + moderation_count,
        },
        period=period,
        trends=[
            AdminTrendPoint(
                label=label,
                restaurants=values[0],
                reviews=values[1],
                moderation_samples=values[2],
            )
            for label, values in zip(trend_labels, trend_values)
        ],
    )


@router.post("/tasks/{task_id}/resolve")
def resolve_admin_task(
    task_id: str,
    data: AdminTaskResolution = AdminTaskResolution(decision="approved"),
    db: Session = Depends(get_db),
):
    task_kind, separator, task_value = task_id.partition("-")
    if not separator or not task_value.isdigit():
        raise HTTPException(status_code=422, detail="Mã tác vụ không hợp lệ.")
    record_id = int(task_value)
    if task_kind == "restaurant":
        row = _get_restaurant_row(db, record_id)
        state = row[1]
        if state is None:
            raise HTTPException(status_code=409, detail="Hồ sơ quán không ở trạng thái chờ duyệt.")
        if state.status != "pending":
            raise HTTPException(status_code=409, detail="Hồ sơ quán đã được xử lý.")
        state.status = "verified"
        db.commit()
        return {"message": "Đã xác minh hồ sơ quán.", "task_id": task_id}
    if task_kind == "moderation":
        sample = db.get(FoodModerationSample, record_id)
        if sample is None:
            raise HTTPException(status_code=404, detail="Không tìm thấy mẫu kiểm duyệt.")
        if sample.status != "pending":
            raise HTTPException(status_code=409, detail="Mẫu kiểm duyệt đã được xử lý.")
        sample.status = data.decision
        sample.reviewer_note = data.reviewer_note
        sample.reviewed_at = datetime.utcnow()
        db.commit()
        return {"message": "Đã xử lý mẫu kiểm duyệt.", "task_id": task_id}
    if task_kind == "price":
        request = db.get(PriceChangeRequest, record_id)
        if request is None:
            raise HTTPException(status_code=404, detail="Không tìm thấy đề xuất thay đổi giá.")
        if request.status != "pending":
            raise HTTPException(status_code=409, detail="Đề xuất thay đổi giá đã được xử lý.")
        if data.decision == "approved":
            food_id = db.scalar(
                select(Food.id)
                .join(food_restaurants, food_restaurants.c.food_id == Food.id)
                .where(
                    food_restaurants.c.restaurant_id == request.restaurant_id,
                    func.lower(Food.name) == request.item_name.lower(),
                )
            )
            if food_id is None:
                raise HTTPException(
                    status_code=409,
                    detail="Món chưa được liên kết với quán nên không thể cập nhật giá.",
                )
            db.execute(
                update(food_restaurants)
                .where(
                    food_restaurants.c.restaurant_id == request.restaurant_id,
                    food_restaurants.c.food_id == food_id,
                )
                .values(price=request.proposed_price)
            )
        request.status = data.decision
        request.reviewer_note = data.reviewer_note
        request.reviewed_at = datetime.utcnow()
        db.commit()
        return {"message": "Đã xử lý đề xuất thay đổi giá.", "task_id": task_id}
    raise HTTPException(status_code=422, detail="Loại tác vụ không hỗ trợ.")
