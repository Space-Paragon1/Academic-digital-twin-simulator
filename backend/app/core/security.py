"""
JWT authentication utilities.

Uses python-jose for token creation/verification and passlib[bcrypt]
for password hashing.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Token expires after 7 days by default
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7


def _truncate(plain: str) -> str:
    """bcrypt silently breaks on inputs > 72 bytes; truncate to the limit."""
    encoded = plain.encode("utf-8")
    return encoded[:72].decode("utf-8", errors="ignore") if len(encoded) > 72 else plain


def hash_password(plain: str) -> str:
    return _pwd_context.hash(_truncate(plain))


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_context.verify(_truncate(plain), hashed)


def create_access_token(student_id: int, email: str) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(student_id),
        "email": email,
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def decode_token(token: str) -> Optional[dict]:
    """Returns payload dict or None if token is invalid/expired."""
    try:
        return jwt.decode(token, get_settings().SECRET_KEY, algorithms=["HS256"])
    except JWTError:
        return None
