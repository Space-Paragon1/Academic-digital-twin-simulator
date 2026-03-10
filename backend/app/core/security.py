"""
Security utilities: password hashing and JWT tokens.

Password hashing strategy
--------------------------
bcrypt has a hard 72-byte input limit.  We eliminate this entirely by
pre-hashing the plaintext with SHA-256 (always 32 bytes / 44 base64 chars)
before passing it to bcrypt.  The same transform is applied on verify, so
passwords of any length work correctly.

JWTs are signed with HS256 and expire after 7 days.
"""

import base64
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


def _prepare(plain: str) -> str:
    """SHA-256 digest → base64 string (44 ASCII chars, always < 72 bytes)."""
    digest = hashlib.sha256(plain.encode("utf-8")).digest()
    return base64.b64encode(digest).decode("ascii")


def hash_password(plain: str) -> str:
    return _pwd_context.hash(_prepare(plain))


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_context.verify(_prepare(plain), hashed)


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
