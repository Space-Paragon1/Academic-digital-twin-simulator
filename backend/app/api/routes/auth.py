"""
Authentication routes: register, login, and current-user lookup.

Passwords are hashed with bcrypt (after SHA-256 pre-hashing to remove the
72-byte bcrypt limit).  JWTs are signed with HS256 and expire after 7 days.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

from app.core.security import (
    create_access_token,
    create_email_verify_token,
    create_reset_token,
    decode_email_verify_token,
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


class ChangePasswordRequest(BaseModel):
    student_id: int
    current_password: str
    new_password: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(request: Request, req: RegisterRequest, db: Session = Depends(get_db)):
    import logging
    logger = logging.getLogger(__name__)

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
        is_verified=False,
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    # Auto-send verification email (silently ignore errors)
    try:
        from app.core.config import get_settings
        from app.core.email import send_verification_email
        settings = get_settings()
        verify_token = create_email_verify_token(student.id)
        student.verification_token = verify_token
        db.commit()
        verify_url = f"{settings.FRONTEND_URL}/verify-email?token={verify_token}"
        send_verification_email(student.email, student.name, verify_url)
    except Exception as exc:
        logger.warning("Failed to send verification email on register: %s", exc)

    token = create_access_token(student.id, student.email)
    return AuthResponse(
        access_token=token,
        student_id=student.id,
        name=student.name,
        email=student.email,
    )


@router.post("/login", response_model=AuthResponse)
@limiter.limit("10/minute")
def login(request: Request, req: LoginRequest, db: Session = Depends(get_db)):
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


@router.post("/change-password", status_code=status.HTTP_200_OK)
def change_password(req: ChangePasswordRequest, db: Session = Depends(get_db)):
    """Change password for a logged-in user (requires current password)."""
    if len(req.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="New password must be at least 6 characters.",
        )
    student = crud.get_student(db, req.student_id)
    if not student or not student.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )
    if not verify_password(req.current_password, student.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect.",
        )
    student.password_hash = hash_password(req.new_password)
    db.commit()
    return {"message": "Password updated successfully."}


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


class SendVerificationRequest(BaseModel):
    student_id: int


class VerifyEmailRequest(BaseModel):
    token: str


@router.post("/send-verification", status_code=status.HTTP_200_OK)
def send_verification(req: SendVerificationRequest, db: Session = Depends(get_db)):
    """Generate a new verification token and send a verification email."""
    import logging
    from app.core.config import get_settings
    from app.core.email import send_verification_email

    logger = logging.getLogger(__name__)
    student = crud.get_student(db, req.student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
    if student.is_verified:
        return {"message": "Email is already verified."}

    try:
        settings = get_settings()
        verify_token = create_email_verify_token(student.id)
        student.verification_token = verify_token
        db.commit()
        verify_url = f"{settings.FRONTEND_URL}/verify-email?token={verify_token}"
        send_verification_email(student.email, student.name, verify_url)
    except Exception as exc:
        logger.error("Failed to send verification email: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send verification email: {exc}",
        )

    return {"message": "Verification email sent. Check your inbox."}


@router.post("/verify-email", status_code=status.HTTP_200_OK)
def verify_email(req: VerifyEmailRequest, db: Session = Depends(get_db)):
    """Verify email with the token from the verification email."""
    student_id = decode_email_verify_token(req.token)
    if student_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification link is invalid or has expired. Please request a new one.",
        )

    student = crud.get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    student.is_verified = True
    student.verification_token = None
    db.commit()
    return {"message": "Email verified successfully!"}
