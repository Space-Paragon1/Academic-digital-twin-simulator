from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db import crud
from app.schemas.student import StudentCreate, StudentOut, StudentUpdate

router = APIRouter(prefix="/students", tags=["students"])


@router.get("/", response_model=list[StudentOut])
def list_students(db: Session = Depends(get_db)):
    """List all student profiles (used by multi-student advisor view)."""
    return crud.get_all_students(db)


@router.post("/", response_model=StudentOut, status_code=status.HTTP_201_CREATED)
def create_student(payload: StudentCreate, db: Session = Depends(get_db)):
    """Create a new student profile."""
    existing = crud.get_student_by_email(db, payload.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Student with email '{payload.email}' already exists.",
        )
    return crud.create_student(db, payload)


@router.get("/{student_id}", response_model=StudentOut)
def get_student(student_id: int, db: Session = Depends(get_db)):
    """Retrieve a student profile by ID."""
    student = crud.get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
    return student


@router.put("/{student_id}", response_model=StudentOut)
def update_student(student_id: int, payload: StudentUpdate, db: Session = Depends(get_db)):
    """Update a student profile."""
    student = crud.update_student(db, student_id, payload)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
    return student


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(student_id: int, db: Session = Depends(get_db)):
    """Delete a student account and all associated data."""
    deleted = crud.delete_student(db, student_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")


@router.post("/{student_id}/send-summary", status_code=status.HTTP_200_OK)
def send_summary(student_id: int, db: Session = Depends(get_db)):
    """Email the student a summary of their simulation history."""
    import logging
    from app.core.email import send_weekly_summary_email

    student = crud.get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
    if not student.email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Student has no email.")

    if not getattr(student, "notify_weekly_summary", True):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Student has disabled weekly summary emails.")

    runs = crud.get_simulation_runs_for_student(db, student_id, limit=100)
    if not runs:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No simulations to summarize.")

    gpas = [r.results["summary"]["predicted_gpa_mean"] for r in runs if r.results]
    risks = [r.results["summary"]["burnout_risk"] for r in runs if r.results]
    tips_list = [r.results["summary"].get("recommendation", "") for r in runs if r.results]
    tip = next((t for t in reversed(tips_list) if t), "Keep running simulations to track your academic progress.")

    try:
        send_weekly_summary_email(
            to_email=student.email,
            student_name=student.name,
            total_sims=len(runs),
            best_gpa=max(gpas),
            latest_gpa=gpas[-1],
            latest_risk=risks[-1],
            tip=tip,
        )
    except Exception as exc:
        logging.getLogger(__name__).error("Failed to send summary email: %s", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))

    return {"message": "Summary email sent."}
