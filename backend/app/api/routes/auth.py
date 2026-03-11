"""
Authentication routes: register, login, and current-user lookup.

Passwords are hashed with bcrypt (after SHA-256 pre-hashing to remove the
72-byte bcrypt limit).  JWTs are signed with HS256 and expire after 7 days.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    create_reset_token,
    decode_reset_token,
    hash_password,
    verify_password,
)
from app.db.database import get_db
from app.db import crud
from app.models.student import Student

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Request / response schemas ────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    target_gpa: float = 3.5
    weekly_work_hours: float = 0.0
    sleep_target_hours: float = 7.0


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    student_id: int
    name: str
    email: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if crud.get_student_by_email(db, req.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with that email already exists.",
        )

    student = Student(
        name=req.name,
        email=req.email,
        target_gpa=req.target_gpa,
        weekly_work_hours=req.weekly_work_hours,
        sleep_target_hours=req.sleep_target_hours,
        password_hash=hash_password(req.password),
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    token = create_access_token(student.id, student.email)
    return AuthResponse(
        access_token=token,
        student_id=student.id,
        name=student.name,
        email=student.email,
    )


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    student = crud.get_student_by_email(db, req.email)
    if not student or not student.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    if not verify_password(req.password, student.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = create_access_token(student.id, student.email)
    return AuthResponse(
        access_token=token,
        student_id=student.id,
        name=student.name,
        email=student.email,
    )


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Send a password-reset email.

    Always returns 200 regardless of whether the email exists (prevents
    user-enumeration attacks). If SMTP is not configured the error is logged
    server-side but the client still receives 200.
    """
    from app.core.config import get_settings
    from app.core.email import send_password_reset_email
    import logging

    logger = logging.getLogger(__name__)
    student = crud.get_student_by_email(db, req.email)
    if not student:
        logger.warning("Forgot-password: no account found for %s", req.email)
    elif not student.password_hash:
        logger.warning("Forgot-password: account %s has no password_hash (seed/guest account)", req.email)
    else:
        try:
            settings = get_settings()
            token = create_reset_token(req.email)
            reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
            logger.warning("Sending reset email to %s", req.email)
            send_password_reset_email(req.email, reset_url)
            logger.warning("Reset email sent successfully to %s", req.email)
        except Exception as exc:
            logger.error("Failed to send reset email to %s: %s", req.email, exc)

    return {"message": "If that email is registered, a reset link has been sent."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Verify the reset token and update the password."""
    if len(req.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 6 characters.",
        )

    email = decode_reset_token(req.token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset link is invalid or has expired. Please request a new one.",
        )

    student = crud.get_student_by_email(db, email)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found.",
        )

    student.password_hash = hash_password(req.new_password)
    db.commit()
    return {"message": "Password updated successfully. You can now sign in."}


@router.get("/me", response_model=AuthResponse)
def me(token: str, db: Session = Depends(get_db)):
    from app.core.security import decode_token
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or expired.",
        )
    student = crud.get_student(db, int(payload["sub"]))
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    return AuthResponse(
        access_token=token,
        student_id=student.id,
        name=student.name,
        email=student.email,
    )
