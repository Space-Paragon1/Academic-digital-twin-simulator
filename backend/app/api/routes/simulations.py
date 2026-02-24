from fastapi import APIRouter, Depends, HTTPException, Query, status
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
def list_simulations(
    student_id: int,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """List simulation runs for a student with pagination."""
    student = crud.get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
    runs = crud.get_simulation_runs_for_student(db, student_id, skip=skip, limit=limit)
    results = []
    for run in runs:
        r = SimulationResult(**run.results)
        r.id = run.id
        r.created_at = run.created_at
        results.append(r)
    return results


@router.delete("/{sim_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_simulation(sim_id: int, db: Session = Depends(get_db)):
    """Delete a simulation run by ID."""
    deleted = crud.delete_simulation_run(db, sim_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulation not found.")
