from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db import crud
from app.schemas.simulation import (
    ActualGradeEntry,
    ActualGradesResponse,
    ActualGradesUpdate,
    MonteCarloRequest,
    MonteCarloResult,
    ScenarioConfig,
    SimulationResult,
)
from app.simulation.engine import SimulationEngine
from app.simulation.monte_carlo import run_monte_carlo

router = APIRouter(prefix="/simulations", tags=["simulations"])
engine = SimulationEngine()


class LeaderboardEntry(BaseModel):
    rank: int
    gpa_mean: float
    burnout_risk: str
    strategy: str
    week_count: int


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

    # Send burnout alert email if risk is HIGH, student wants it, and has email + password
    _want_alert = getattr(student, "notify_burnout_alert", True)
    if result.summary.burnout_risk == "HIGH" and student.email and student.password_hash and _want_alert:
        try:
            import logging
            from app.core.email import send_burnout_alert_email
            send_burnout_alert_email(
                to_email=student.email,
                student_name=student.name,
                burnout_probability=result.summary.burnout_probability,
                scenario_name=config.scenario_name or f"Scenario #{run.id}",
            )
        except Exception as exc:
            logging.getLogger(__name__).warning("Burnout alert email failed: %s", exc)

    return result


@router.post("/monte-carlo", response_model=MonteCarloResult)
def run_monte_carlo_endpoint(request: MonteCarloRequest, db: Session = Depends(get_db)):
    """
    Run a Monte Carlo simulation to produce GPA confidence bands (p10/p50/p90).
    Results are NOT persisted — call /run first to save the base scenario.
    """
    student = crud.get_student(db, request.scenario_config.student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    courses = crud.get_courses_for_student(db, request.scenario_config.student_id)
    if not courses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student has no courses enrolled.",
        )

    if request.scenario_config.include_course_ids:
        courses = [c for c in courses if c.id in request.scenario_config.include_course_ids]

    try:
        return run_monte_carlo(request=request, courses=courses, student=student)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
def get_leaderboard(db: Session = Depends(get_db)):
    """
    Return top 10 anonymous leaderboard entries.
    Each entry is the best simulation per student ordered by GPA descending.
    """
    from app.models.simulation import SimulationRun

    # Get all simulation runs
    all_runs = db.query(SimulationRun).all()

    # Best sim per student (max predicted_gpa_mean)
    best_per_student: dict[int, SimulationRun] = {}
    for run in all_runs:
        if not run.results:
            continue
        try:
            gpa = run.results["summary"]["predicted_gpa_mean"]
        except (KeyError, TypeError):
            continue
        prev = best_per_student.get(run.student_id)
        if prev is None:
            best_per_student[run.student_id] = run
        else:
            prev_gpa = prev.results["summary"]["predicted_gpa_mean"]
            if gpa > prev_gpa:
                best_per_student[run.student_id] = run

    # Sort by GPA desc, take top 10
    sorted_runs = sorted(
        best_per_student.values(),
        key=lambda r: r.results["summary"]["predicted_gpa_mean"],
        reverse=True,
    )[:10]

    entries = []
    for rank, run in enumerate(sorted_runs, start=1):
        summary = run.results["summary"]
        config = run.results.get("scenario_config", {})
        entries.append(
            LeaderboardEntry(
                rank=rank,
                gpa_mean=round(summary["predicted_gpa_mean"], 2),
                burnout_risk=summary.get("burnout_risk", "UNKNOWN"),
                strategy=config.get("study_strategy", "unknown"),
                week_count=config.get("num_weeks", 0),
            )
        )
    return entries


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


class NoteBody(BaseModel):
    note: str


class NoteResponse(BaseModel):
    note: str | None


class TagsBody(BaseModel):
    tags: list[str]


class TagsResponse(BaseModel):
    tags: list[str]


@router.post("/{sim_id}/note", response_model=NoteResponse)
def save_note(sim_id: int, body: NoteBody, db: Session = Depends(get_db)):
    """Save a text note to a simulation run."""
    run = crud.get_simulation_run(db, sim_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulation not found.")
    crud.save_simulation_note(db, sim_id, body.note)
    return NoteResponse(note=body.note)


@router.get("/{sim_id}/note", response_model=NoteResponse)
def get_note(sim_id: int, db: Session = Depends(get_db)):
    """Retrieve a stored note for a simulation run."""
    run = crud.get_simulation_run(db, sim_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulation not found.")
    note = crud.get_simulation_note(db, sim_id)
    return NoteResponse(note=note)


@router.post("/{sim_id}/tags", response_model=TagsResponse)
def save_tags(sim_id: int, body: TagsBody, db: Session = Depends(get_db)):
    """Save tags to a simulation run."""
    run = crud.get_simulation_run(db, sim_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulation not found.")
    crud.save_simulation_tags(db, sim_id, body.tags)
    return TagsResponse(tags=body.tags)


@router.get("/{sim_id}/tags", response_model=TagsResponse)
def get_tags(sim_id: int, db: Session = Depends(get_db)):
    """Retrieve tags for a simulation run."""
    run = crud.get_simulation_run(db, sim_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulation not found.")
    tags = crud.get_simulation_tags(db, sim_id)
    return TagsResponse(tags=tags)


@router.delete("/{sim_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_simulation(sim_id: int, db: Session = Depends(get_db)):
    """Delete a simulation run by ID."""
    deleted = crud.delete_simulation_run(db, sim_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulation not found.")


@router.post("/{sim_id}/actual-grades", response_model=ActualGradesResponse)
def save_actual_grades(
    sim_id: int,
    body: ActualGradesUpdate,
    db: Session = Depends(get_db),
):
    """Save (replace) actual weekly grades for a simulation run."""
    run = crud.get_simulation_run(db, sim_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulation not found.")
    saved = crud.save_actual_grades(db, sim_id, body.grades)
    return ActualGradesResponse(saved=saved, grades=body.grades)


@router.get("/{sim_id}/actual-grades", response_model=ActualGradesResponse)
def get_actual_grades(sim_id: int, db: Session = Depends(get_db)):
    """Retrieve all stored actual grades for a simulation run."""
    run = crud.get_simulation_run(db, sim_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulation not found.")
    grades = crud.get_actual_grades(db, sim_id)
    entries = [
        ActualGradeEntry(
            course_name=g.course_name,
            week=g.week,
            actual_grade=g.actual_grade,
        )
        for g in grades
    ]
    return ActualGradesResponse(saved=len(entries), grades=entries)
