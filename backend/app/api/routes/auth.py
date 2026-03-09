"""
Authentication routes: register, login, and current-user lookup.

Passwords are hashed with bcrypt. JWTs are signed with HS256 and expire
after 7 days. Existing accounts without a password_hash (e.g. seed data)
can still be accessed via student ID on the frontend — auth is additive,
not a breaking change.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.db.database import get_db
from app.db import crud

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


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """
    Create a new student account with a hashed password and return a JWT.
    Rejects if the email is already registered.
    """
    if crud.get_student_by_email(db, req.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with that email already exists.",
        )

    from app.schemas.simulation import StudentCreate
    student = crud.create_student(
        db,
        StudentCreate(
            name=req.name,
            email=req.email,
            target_gpa=req.target_gpa,
            weekly_work_hours=req.weekly_work_hours,
            sleep_target_hours=req.sleep_target_hours,
        ),
    )
    # Store password hash on the newly created student
    student.password_hash = hash_password(req.password)
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
    """
    Authenticate with email + password and return a JWT.
    Returns 401 for wrong email or password (intentionally identical message
    to prevent email enumeration).
    """
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


@router.get("/me", response_model=AuthResponse)
def me(token: str, db: Session = Depends(get_db)):
    """
    Validate a JWT and return the associated student info.
    Used by the frontend on page load to verify a stored token is still valid.
    """
    from app.core.security import decode_token
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or expired.",
        )
    student_id = int(payload["sub"])
    student = crud.get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    return AuthResponse(
        access_token=token,
        student_id=student.id,
        name=student.name,
        email=student.email,
    )
