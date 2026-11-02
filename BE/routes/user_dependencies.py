import base64
import hashlib
import hmac
import json
import time

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from database.database import get_db
from models import User
from security import TOKEN_SECRET

_bearer = HTTPBearer(auto_error=False)


def require_active_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Vui lòng đăng nhập để thực hiện thao tác này.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise unauthorized

    try:
        header_segment, payload_segment, signature_segment = credentials.credentials.split(".")
        header = json.loads(base64.urlsafe_b64decode(
            header_segment + "=" * (-len(header_segment) % 4)
        ))
        payload = json.loads(base64.urlsafe_b64decode(
            payload_segment + "=" * (-len(payload_segment) % 4)
        ))
        if not isinstance(header, dict) or header.get("alg") != "HS256":
            raise ValueError("Unsupported token algorithm")
        if not isinstance(payload, dict):
            raise ValueError("Invalid token payload")

        signing_input = f"{header_segment}.{payload_segment}".encode()
        expected = hmac.new(TOKEN_SECRET.encode(), signing_input, hashlib.sha256).digest()
        actual = base64.urlsafe_b64decode(
            signature_segment + "=" * (-len(signature_segment) % 4)
        )
        if not hmac.compare_digest(expected, actual):
            raise ValueError("Invalid token signature")
        user_id = int(str(payload["sub"]))
        if int(payload["exp"]) <= int(time.time()):
            raise ValueError("Expired token")
    except (KeyError, TypeError, ValueError, json.JSONDecodeError):
        raise unauthorized from None

    user = db.scalar(select(User).where(User.id == user_id))
    if user is None or not user.is_active:
        raise unauthorized
    return user
