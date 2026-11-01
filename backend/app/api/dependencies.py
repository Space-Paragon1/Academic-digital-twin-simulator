"""Authentication and authorization shared by all private API routes."""
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import decode_token, password_version
from app.db import crud
from app.db.database import get_db
from app.models.student import Student

bearer = HTTPBearer(auto_error=False)


def get_current_student(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> Student:
    payload = decode_token(credentials.credentials) if credentials else None
    student = crud.get_student(db, int(payload["sub"])) if payload else None
    if (not student or not student.password_hash
            or payload.get("ver") != password_version(student.password_hash)):
        raise HTTPException(401, "Sign in again to continue.", headers={"WWW-Authenticate": "Bearer"})
    return student


def require_admin(student: Student) -> None:
    if student.id not in get_settings().admin_student_ids:
        raise HTTPException(403, "Administrator access required.")


def require_owner(student: Student, student_id: int) -> None:
    # Admin privileges are configured on the server, never in client state.
    if student.id != student_id and student.id not in get_settings().admin_student_ids:
        raise HTTPException(404, "Resource not found.")


def require_simulation_owner(db: Session, student: Student, sim_id: int) -> None:
    run = crud.get_simulation_run(db, sim_id)
    if not run:
        raise HTTPException(404, "Simulation not found.")
    require_owner(student, run.student_id)


def require_course_owner(db: Session, student: Student, course_id: int) -> None:
    course = crud.get_course(db, course_id)
    if not course:
        raise HTTPException(404, "Course not found.")
    require_owner(student, course.student_id)
