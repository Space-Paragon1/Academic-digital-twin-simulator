"""
AI Advisor and Goal Targeting routes.

The AI advisor uses the Claude API (claude-haiku) to answer student questions
about their simulation results in natural language.

Goal targeting runs a grid search over schedule parameters to find the
minimum adjustments needed to achieve a target GPA.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.database import get_db
from app.db import crud
from app.schemas.simulation import (
    AdvisorRequest,
    AdvisorResponse,
    GoalTargetRequest,
    GoalTargetResult,
    ScenarioConfig,
)
from app.simulation.engine import SimulationEngine

router = APIRouter(prefix="/advisor", tags=["advisor"])
_engine = SimulationEngine()


@router.post("/chat", response_model=AdvisorResponse)
def advisor_chat(request: AdvisorRequest, db: Session = Depends(get_db)):
    """
    AI advisor chat powered by Claude.

    Requires ANTHROPIC_API_KEY environment variable. The advisor uses
    student profile, enrolled courses, and (optionally) simulation results
    as context for answering academic planning questions.
    """
    try:
        import anthropic
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI advisor requires the anthropic package: pip install anthropic",
        )

    api_key = get_settings().ANTHROPIC_API_KEY
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ANTHROPIC_API_KEY is not set. Add it to your .env file.",
        )

    student = crud.get_student(db, request.student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    courses = crud.get_courses_for_student(db, request.student_id)
    course_info = "\n".join(
        f"  - {c.name}: difficulty {c.difficulty_score}/10, "
        f"{c.credits} credits, {c.weekly_workload_hours}h/week"
        for c in courses
    ) or "  (no courses enrolled)"

    # Optionally enrich with simulation context
    sim_context = ""
    context_used = False
    if request.simulation_id:
        sim_run = crud.get_simulation_run(db, request.simulation_id)
        if sim_run and sim_run.results:
            r = sim_run.results
            summary = r.get("summary", {})
            cfg = r.get("scenario_config", {})
            sim_context = f"""
Latest simulation (ID {sim_run.id}):
  - Predicted GPA: {summary.get('predicted_gpa_mean', 'N/A')} \
(range {summary.get('predicted_gpa_min', 'N/A')}–{summary.get('predicted_gpa_max', 'N/A')})
  - Burnout risk: {summary.get('burnout_risk', 'N/A')} \
({summary.get('burnout_probability', 0) * 100:.0f}% probability)
  - Study strategy: {cfg.get('study_strategy', 'N/A')}
  - Work hours: {cfg.get('work_hours_per_week', 'N/A')}h/week
  - Sleep: {cfg.get('sleep_target_hours', 'N/A')}h/night
  - Peak overload weeks: {summary.get('peak_overload_weeks', [])}
  - Sleep deficit: {summary.get('sleep_deficit_hours', 'N/A')}h/week
  - Recommendation: {summary.get('recommendation', 'N/A')}"""
            context_used = True

    system_prompt = f"""You are an academic advisor AI for a digital twin simulator. \
Help students optimize their schedules, understand burnout risk, and improve GPA.

Student profile:
  Name: {student.name}
  Target GPA: {student.target_gpa}
  Enrolled courses:
{course_info}
{sim_context}

Guidelines:
- Be concise (under 200 words per response)
- Be specific and actionable — reference actual numbers from the simulation
- Use a supportive, professional tone
- Focus on schedule optimization, study strategy, and burnout prevention"""

    client = anthropic.Anthropic(api_key=api_key)
    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=500,
            system=system_prompt,
            messages=messages,
        )
    except anthropic.AuthenticationError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Invalid Anthropic API key. Check your ANTHROPIC_API_KEY in backend/.env.",
        )
    except anthropic.BadRequestError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Anthropic API error: {e}",
        )

    return AdvisorResponse(
        reply=response.content[0].text,
        simulation_context_used=context_used,
    )


@router.post("/goal-target", response_model=GoalTargetResult)
def goal_target(request: GoalTargetRequest, db: Session = Depends(get_db)):
    """
    Find the schedule parameters needed to achieve a target GPA.

    Performs a grid search over work hours, sleep, and study strategy.
    Returns the most achievable schedule (or the closest if target is not reachable).
    """
    student = crud.get_student(db, request.student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    courses = crud.get_courses_for_student(db, request.student_id)
    if not courses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No courses enrolled. Add courses before using goal targeting.",
        )

    course_ids = [c.id for c in courses]
    best_result = None
    best_config = None
    achievable = False

    # Grid search: strategy × sleep × work
    for strategy in ["spaced", "mixed", "cramming"]:
        for sleep_h in [9.0, 8.5, 8.0, 7.5, 7.0, 6.5, 6.0]:
            for work_h in [0.0, 5.0, 10.0, 15.0, 20.0, request.max_work_hours]:
                if work_h > request.max_work_hours:
                    continue
                try:
                    config = ScenarioConfig(
                        student_id=request.student_id,
                        num_weeks=request.num_weeks,
                        work_hours_per_week=work_h,
                        sleep_target_hours=sleep_h,
                        study_strategy=strategy,
                        include_course_ids=course_ids,
                        exam_weeks=request.exam_weeks,
                    )
                    result = _engine.run(config=config, courses=courses, student=student)
                    gpa = result.summary.predicted_gpa_mean

                    if gpa >= request.target_gpa:
                        achievable = True
                        if best_result is None or gpa > best_result.summary.predicted_gpa_mean:
                            best_result = result
                            best_config = config
                    elif not achievable:
                        # Track best non-achieving result as fallback
                        if best_result is None or gpa > best_result.summary.predicted_gpa_mean:
                            best_result = result
                            best_config = config
                except Exception:
                    continue

    if best_result is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Goal targeting failed — no valid simulation completed.",
        )

    last_alloc = best_result.weekly_snapshots[-1].time_allocation
    required_study = last_alloc.deep_study_hours + last_alloc.shallow_study_hours
    gap = max(0.0, round(request.target_gpa - best_result.summary.predicted_gpa_mean, 2))

    tips: list[str] = []
    if not achievable:
        tips.append(
            f"Target GPA {request.target_gpa} is not achievable with current courses. "
            f"Best predicted: {best_result.summary.predicted_gpa_mean:.2f}."
        )
    if best_config and best_config.work_hours_per_week < request.max_work_hours * 0.8:
        tips.append(
            f"Reducing work to {best_config.work_hours_per_week:.0f}h/week "
            "frees significant study time."
        )
    if best_config and best_config.sleep_target_hours >= 8.0:
        tips.append("8+ hours of sleep significantly boosts retention and reduces cognitive load.")
    if best_config and best_config.study_strategy == "spaced":
        tips.append("Spaced repetition study gives the best long-term retention and exam performance.")
    if best_result.summary.sleep_deficit_hours > 3:
        tips.append(
            f"Sleep deficit of {best_result.summary.sleep_deficit_hours}h/week "
            "is hurting cognitive performance."
        )
    if achievable and gap == 0.0:
        tips.append("This schedule achieves your target GPA with manageable burnout risk.")

    return GoalTargetResult(
        achievable=achievable,
        required_study_hours_per_week=round(required_study, 1),
        recommended_work_hours=best_config.work_hours_per_week if best_config else 0.0,
        recommended_sleep_hours=best_config.sleep_target_hours if best_config else 8.0,
        recommended_strategy=best_config.study_strategy if best_config else "spaced",
        predicted_gpa=best_result.summary.predicted_gpa_mean,
        gap_to_target=gap,
        tips=tips,
    )
