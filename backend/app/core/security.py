"""
Security utilities: password hashing and JWT tokens.

Password hashing strategy
--------------------------
Uses the `bcrypt` library directly (bypassing passlib, which is incompatible
with bcrypt >= 4.x due to a removed __about__ attribute).

Passwords are SHA-256 pre-hashed before bcrypt so that inputs of any length
produce a fixed 44-byte base64 string — well within bcrypt's 72-byte limit.

JWTs are signed with HS256 and expire after 7 days.
"""

import base64
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import JWTError, jwt

from app.core.config import get_settings

ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


def _prepare(plain: str) -> bytes:
    """SHA-256 → base64 = 44 ASCII bytes, always within bcrypt's 72-byte limit."""
    digest = hashlib.sha256(plain.encode("utf-8")).digest()
    return base64.b64encode(digest)


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(_prepare(plain), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(_prepare(plain), hashed.encode("utf-8"))


def create_access_token(student_id: int, email: str) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(student_id), "email": email, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def decode_token(token: str) -> Optional[dict]:
    """Returns payload dict or None if token is invalid or expired."""
    try:
        return jwt.decode(token, get_settings().SECRET_KEY, algorithms=["HS256"])
    except JWTError:
        return None
