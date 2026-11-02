import base64
import hashlib
import hmac
import json
import os
import secrets
import time

TOKEN_SECRET = os.getenv("AUTH_TOKEN_SECRET")
if not TOKEN_SECRET:
    TOKEN_SECRET = secrets.token_urlsafe(32)


def encode_segment(value: dict[str, object]) -> str:
    encoded = json.dumps(value, separators=(",", ":")).encode()
    return base64.urlsafe_b64encode(encoded).rstrip(b"=").decode()


def create_access_token(user_id: int) -> str:
    header = encode_segment({"alg": "HS256", "typ": "JWT"})
    payload = encode_segment(
        {"sub": str(user_id), "iat": int(time.time()), "exp": int(time.time()) + 3600}
    )
    signing_input = f"{header}.{payload}".encode()
    signature = hmac.new(TOKEN_SECRET.encode(), signing_input, hashlib.sha256).digest()
    encoded_signature = base64.urlsafe_b64encode(signature).rstrip(b"=").decode()
    return f"{header}.{payload}.{encoded_signature}"
