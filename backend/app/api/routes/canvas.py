"""
Canvas LMS integration route.

Provides a single preview endpoint that fetches a student's active
courses from their Canvas instance and returns them for review before
the frontend commits them to the database via the existing courses API.

The Canvas token is used only for this request and is never persisted.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

import httpx

from app.db.database import get_db
from app.db import crud
from app.services.canvas_service import CanvasImportPreview, fetch_canvas_courses

router = APIRouter(prefix="/canvas", tags=["canvas"])


class CanvasPreviewRequest(BaseModel):
    student_id: int
    canvas_url: str
    canvas_token: str


@router.post("/preview", response_model=CanvasImportPreview)
def preview_canvas_courses(
    request: CanvasPreviewRequest,
    db: Session = Depends(get_db),
):
    """
    Fetch active course enrollments from the student's Canvas LMS instance.

    Returns courses for user review — nothing is saved. The frontend
    calls the existing POST /students/{id}/courses endpoint per course
    after the user confirms and adjusts the defaults.

    The canvas_token is used only for this request and is never stored.
    """
    student = crud.get_student(db, request.student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found.",
        )

    try:
        courses = fetch_canvas_courses(request.canvas_url, request.canvas_token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Canvas returned an unexpected error: {exc.response.status_code}",
        )

    if not courses:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "No active courses found in your Canvas account. "
                "Make sure you are enrolled in courses with 'active' status."
            ),
        )

    return CanvasImportPreview(courses=courses, count=len(courses))
