from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db import crud
from app.schemas.simulation import OptimizationRequest, OptimizationResult, ScenarioConfig
from app.simulation.engine import SimulationEngine
from app.simulation.optimizer import optimize_schedule

from app.api.dependencies import get_current_student, require_owner
from app.models.student import Student

router = APIRouter(prefix="/scenarios", tags=["scenarios"])
engine = SimulationEngine()


@router.post("/optimize", response_model=OptimizationResult, status_code=status.HTTP_200_OK)
def optimize(request: OptimizationRequest, db: Session = Depends(get_db), current_student: Student = Depends(get_current_student)):
    """
    Find the optimal schedule configuration for a student using differential evolution.
    Returns the best work hours, sleep hours, and study strategy for the given objective.
    """
    require_owner(current_student, request.student_id)
    student = crud.get_student(db, request.student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    courses = crud.get_courses_for_student(db, request.student_id)
    if not courses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No courses found. Add courses before running optimization.",
        )

    try:
        result = optimize_schedule(
            engine=engine,
            student=student,
            courses=courses,
            request=request,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Optimization failed: {str(e)}",
        )

    return result
