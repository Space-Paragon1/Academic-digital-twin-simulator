from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db import crud
from app.schemas.course import CourseCreate, CourseOut

router = APIRouter(tags=["courses"])


@router.post("/students/{student_id}/courses", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
def add_course(student_id: int, payload: CourseCreate, db: Session = Depends(get_db)):
    """Add a course to a student's profile."""
    student = crud.get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
    return crud.create_course(db, student_id, payload)


@router.get("/students/{student_id}/courses", response_model=list[CourseOut])
def list_courses(student_id: int, db: Session = Depends(get_db)):
    """List all courses for a student."""
    student = crud.get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
    return crud.get_courses_for_student(db, student_id)


@router.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_course(course_id: int, db: Session = Depends(get_db)):
    """Remove a course from a student's profile."""
    deleted = crud.delete_course(db, course_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")
