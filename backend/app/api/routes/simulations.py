from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db import crud
from app.schemas.simulation import ScenarioConfig, SimulationResult
from app.simulation.engine import SimulationEngine

router = APIRouter(prefix="/simulations", tags=["simulations"])
engine = SimulationEngine()


@router.post("/run", response_model=SimulationResult, status_code=status.HTTP_201_CREATED)
def run_simulation(config: ScenarioConfig, db: Session = Depends(get_db)):
    """
    Run a full semester simulation for the given scenario configuration.
    Persists the result to the database and returns the full SimulationResult.
    """
    student = crud.get_student(db, config.student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    courses = crud.get_courses_for_student(db, config.student_id)
    if not courses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student has no courses. Add at least one course before running a simulation.",
        )

    try:
        result = engine.run(config=config, courses=courses, student=student)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    run = crud.create_simulation_run(db, config.student_id, config, result)
    result.id = run.id
    result.created_at = run.created_at
    return result


@router.get("/{sim_id}", response_model=SimulationResult)
def get_simulation(sim_id: int, db: Session = Depends(get_db)):
    """Retrieve a stored simulation result by ID."""
    run = crud.get_simulation_run(db, sim_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulation not found.")
    result = SimulationResult(**run.results)
    result.id = run.id
    result.created_at = run.created_at
    return result


@router.get("/student/{student_id}", response_model=list[SimulationResult])
def list_simulations(student_id: int, db: Session = Depends(get_db)):
    """List all simulation runs for a student."""
    student = crud.get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
    runs = crud.get_simulation_runs_for_student(db, student_id)
    results = []
    for run in runs:
        r = SimulationResult(**run.results)
        r.id = run.id
        r.created_at = run.created_at
        results.append(r)
    return results
