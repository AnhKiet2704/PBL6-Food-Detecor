import base64
import hashlib
import hmac
import json
import time

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from database.database import get_db
from models import User
from security import TOKEN_SECRET

_bearer = HTTPBearer(auto_error=False)
_ADMIN_ROLES = {
    "admin",
    "administrator",
    "super_admin",
    "quản trị viên",
    "quản trị viên trưởng",
}


def _decode_segment(segment: str) -> dict[str, object]:
    padding = "=" * (-len(segment) % 4)
    decoded = base64.urlsafe_b64decode(segment + padding)
    value = json.loads(decoded)
    if not isinstance(value, dict):
        raise ValueError("Invalid token segment")
    return value


def require_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Vui lòng đăng nhập để truy cập trang quản trị.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise unauthorized

    try:
        header_segment, payload_segment, signature_segment = credentials.credentials.split(".")
        header = _decode_segment(header_segment)
        payload = _decode_segment(payload_segment)
        if header.get("alg") != "HS256":
            raise ValueError("Unsupported token algorithm")

        signing_input = f"{header_segment}.{payload_segment}".encode()
        expected_signature = hmac.new(
            TOKEN_SECRET.encode(),
            signing_input,
            hashlib.sha256,
        ).digest()
        padding = "=" * (-len(signature_segment) % 4)
        actual_signature = base64.urlsafe_b64decode(signature_segment + padding)
        if not hmac.compare_digest(expected_signature, actual_signature):
            raise ValueError("Invalid token signature")

        user_id = int(str(payload["sub"]))
        expires_at = int(payload["exp"])
        if expires_at <= int(time.time()):
            raise ValueError("Expired token")
    except (KeyError, TypeError, ValueError, json.JSONDecodeError):
        raise unauthorized from None

    user = db.scalar(
        select(User)
        .options(selectinload(User.roles))
        .where(User.id == user_id)
    )
    if user is None or not user.is_active:
        raise unauthorized

    role_names = {role.name.strip().casefold() for role in user.roles}
    if not role_names.intersection(_ADMIN_ROLES):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản không có quyền quản trị.",
        )
    return user
