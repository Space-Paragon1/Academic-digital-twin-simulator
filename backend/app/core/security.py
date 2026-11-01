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
RESET_TOKEN_EXPIRE_MINUTES = 15            # short-lived reset tokens


def _prepare(plain: str) -> bytes:
    """SHA-256 → base64 = 44 ASCII bytes, always within bcrypt's 72-byte limit."""
    digest = hashlib.sha256(plain.encode("utf-8")).digest()
    return base64.b64encode(digest)


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(_prepare(plain), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(_prepare(plain), hashed.encode("utf-8"))


def password_version(password_hash: str) -> str:
    """Bind tokens to the current password without disclosing its stored hash."""
    return hashlib.sha256(password_hash.encode("utf-8")).hexdigest()


def create_access_token(student_id: int, email: str, password_hash: str) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(student_id), "email": email, "exp": expire, "type": "access", "ver": password_version(password_hash)}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def decode_token(token: str) -> Optional[dict]:
    """Returns payload dict or None if token is invalid or expired."""
    try:
        payload = jwt.decode(token, get_settings().SECRET_KEY, algorithms=["HS256"], options={"require_exp": True, "require_sub": True})
        if payload.get("type") != "access" or not isinstance(payload.get("sub"), str) or not payload["sub"].isdigit():
            return None
        return payload
    except JWTError:
        return None


def create_reset_token(email: str, password_hash: str) -> str:
    """Create a short-lived (15 min) JWT for password reset."""
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": email, "type": "password_reset", "exp": expire, "ver": password_version(password_hash)}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def decode_reset_token(token: str) -> Optional[dict]:
    """Verify a password-reset JWT. Returns the payload on success, None otherwise."""
    try:
        payload = jwt.decode(token, get_settings().SECRET_KEY, algorithms=["HS256"])
        if payload.get("type") != "password_reset":
            return None
        return payload if payload.get("sub") and payload.get("ver") and payload.get("exp") else None
    except JWTError:
        return None


EMAIL_VERIFY_EXPIRE_HOURS = 24


def create_email_verify_token(student_id: int) -> str:
    """Create a 24-hour JWT for email verification."""
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(hours=EMAIL_VERIFY_EXPIRE_HOURS)
    payload = {"sub": str(student_id), "type": "email_verify", "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def decode_email_verify_token(token: str) -> Optional[int]:
    """Verify an email-verification JWT. Returns student_id on success, None otherwise."""
    try:
        payload = jwt.decode(token, get_settings().SECRET_KEY, algorithms=["HS256"])
        if payload.get("type") != "email_verify":
            return None
        return int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        return None
