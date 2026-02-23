"""
Simulation Engine — Main Orchestrator.

Runs the time-step simulation, advancing student state week by week through
all five subsystems. This is the core of the Academic Digital Twin.

Simulation tick order (each week):
  1. TimeSystem    → allocate the 168-hour budget
  2. CognitiveLoad → compute load from study + fatigue + sleep
  3. RetentionModel → update knowledge retention per course
  4. PerformanceModel → predict grades from state
  5. RecoveryModel → update fatigue and accumulate burnout history

All subsystems are pure functions — the engine owns mutable state.
"""

from datetime import datetime, timezone

from app.schemas.simulation import (
    ScenarioConfig,
    SimulationResult,
    SimulationSummary,
    TimeAllocation,
    WeeklySnapshot,
)
from app.simulation import (
    cognitive_load as cl,
    performance_model as pm,
    recovery_model as rm,
    retention_model as ret,
    time_system as ts,
)


class SimulationEngine:
    """
    Stateless simulation engine.

    Call `run()` with a ScenarioConfig and the resolved student/courses
    objects. The engine creates a fresh simulation state each call,
    making it safe for concurrent use.
    """

    def run(
        self,
        config: ScenarioConfig,
        courses: list,
        student,
    ) -> SimulationResult:
        """
        Execute the full semester simulation.

        Args:
            config: ScenarioConfig controlling all simulation parameters.
            courses: List of Course ORM objects enrolled in this scenario.
            student: Student ORM object.

        Returns:
            SimulationResult with per-week snapshots and summary statistics.
        """
        # Filter courses to those included in the scenario
        if config.include_course_ids:
            courses = [c for c in courses if c.id in config.include_course_ids]

        if not courses:
            raise ValueError("No courses selected for simulation.")

        course_credits = {c.name: c.credits for c in courses}

        # ── Mutable state ──────────────────────────────────────────────────
        fatigue: float = 0.0
        retention_per_course: dict[int, float] = {c.id: 0.0 for c in courses}

        # History accumulators for summary stats
        load_history: list[float] = []
        sleep_history: list[float] = []
        recovery_hours_history: list[float] = []
        gpa_history: list[float] = []
        weekly_grades_history: list[dict[str, float]] = []
        weekly_snapshots: list[WeeklySnapshot] = []

        # ── Week-by-week simulation ────────────────────────────────────────
        for week in range(1, config.num_weeks + 1):

            # 1. Time system
            alloc: ts.TimeAllocation = ts.allocate_time(
                courses=courses,
                work_hours=config.work_hours_per_week,
                sleep_target_hours=config.sleep_target_hours,
                study_strategy=config.study_strategy,
            )

            # 2. Distribute study hours across courses
            total_study = alloc.deep_study_hours + alloc.shallow_study_hours
            study_per_course = cl.distribute_study_hours(
                courses=courses,
                total_study_hours=total_study,
            )

            # 3. Cognitive load
            weekly_load = cl.compute_weekly_load(
                courses=courses,
                study_hours_per_course=study_per_course,
                prior_fatigue=fatigue,
                sleep_hours=alloc.sleep_hours,
            )

            # 4. Retention update per course
            for course in courses:
                retention_per_course[course.id] = ret.update_retention(
                    prior_retention=retention_per_course[course.id],
                    study_hours=study_per_course.get(course.id, 0.0),
                    study_strategy=config.study_strategy,
                )

            # 5. Performance prediction per course
            course_grades: dict[str, float] = {}
            for course in courses:
                grade = pm.predict_grade(
                    course=course,
                    weekly_study_hours=study_per_course.get(course.id, 0.0),
                    avg_cognitive_load=weekly_load,
                    cumulative_retention=retention_per_course[course.id],
                )
                course_grades[course.name] = grade

            weekly_gpa = pm.compute_gpa(course_grades, course_credits)

            # 6. Burnout probability (uses history up to this week)
            burnout_prob = rm.compute_burnout_probability(
                load_history=load_history + [weekly_load],
                sleep_history=sleep_history + [alloc.sleep_hours],
                recovery_history=recovery_hours_history + [alloc.recovery_hours],
            )

            # 7. Fatigue update
            fatigue = rm.compute_recovery(
                current_fatigue=fatigue,
                sleep_hours=alloc.sleep_hours,
                recovery_hours=alloc.recovery_hours,
            )

            # ── Accumulate history ─────────────────────────────────────────
            load_history.append(weekly_load)
            sleep_history.append(alloc.sleep_hours)
            recovery_hours_history.append(alloc.recovery_hours)
            gpa_history.append(weekly_gpa)
            weekly_grades_history.append(course_grades)

            # ── Build snapshot ─────────────────────────────────────────────
            avg_retention = (
                sum(retention_per_course.values()) / len(retention_per_course)
                if retention_per_course else 0.0
            )

            snapshot = WeeklySnapshot(
                week=week,
                cognitive_load=round(weekly_load, 2),
                predicted_gpa=round(weekly_gpa, 2),
                burnout_probability=round(burnout_prob, 3),
                fatigue_level=round(fatigue, 3),
                retention_score=round(avg_retention, 3),
                time_allocation=TimeAllocation(
                    class_hours=alloc.class_hours,
                    work_hours=alloc.work_hours,
                    sleep_hours=alloc.sleep_hours,
                    deep_study_hours=alloc.deep_study_hours,
                    shallow_study_hours=alloc.shallow_study_hours,
                    recovery_hours=alloc.recovery_hours,
                    social_hours=alloc.social_hours,
                    total_hours=alloc.total_hours,
                ),
                course_grades={k: round(v, 1) for k, v in course_grades.items()},
            )
            weekly_snapshots.append(snapshot)

        # ── Build summary ──────────────────────────────────────────────────
        final_gpa = pm.compute_semester_gpa(weekly_grades_history, course_credits)
        gpa_std = float(__import__("statistics").stdev(gpa_history)) if len(gpa_history) > 1 else 0.0
        gpa_min = max(0.0, final_gpa - gpa_std)
        gpa_max = min(4.0, final_gpa + gpa_std)

        final_burnout_prob = rm.compute_burnout_probability(
            load_history, sleep_history, recovery_hours_history
        )
        burnout_risk = rm.burnout_risk_label(final_burnout_prob)

        peak_weeks = [
            snap.week
            for snap in weekly_snapshots
            if snap.cognitive_load > cl.LOAD_OVERLOAD_THRESHOLD
        ]

        avg_sleep_per_week = sum(sleep_history) / len(sleep_history)
        sleep_deficit = max(0.0, 49.0 - avg_sleep_per_week)

        required_study = sum(
            c.weekly_workload_hours * (c.difficulty_score / 5.0) for c in courses
        )

        recommendation = _generate_recommendation(
            burnout_risk=burnout_risk,
            peak_overload_weeks=peak_weeks,
            avg_cognitive_load=sum(load_history) / len(load_history),
            sleep_deficit=sleep_deficit,
        )

        summary = SimulationSummary(
            predicted_gpa_min=round(gpa_min, 2),
            predicted_gpa_max=round(gpa_max, 2),
            predicted_gpa_mean=round(final_gpa, 2),
            burnout_risk=burnout_risk,
            peak_overload_weeks=peak_weeks,
            required_study_hours_per_week=round(required_study, 1),
            sleep_deficit_hours=round(sleep_deficit, 1),
            recommendation=recommendation,
        )

        return SimulationResult(
            scenario_config=config,
            summary=summary,
            weekly_snapshots=weekly_snapshots,
            created_at=datetime.now(timezone.utc),
        )


def _generate_recommendation(
    burnout_risk: str,
    peak_overload_weeks: list[int],
    avg_cognitive_load: float,
    sleep_deficit: float,
) -> str:
    """Generate a plain-English recommendation based on simulation outcome."""
    parts = []

    if burnout_risk == "HIGH":
        parts.append("Burnout risk is high — consider dropping one course or reducing work hours.")
    elif burnout_risk == "MEDIUM":
        parts.append("Moderate burnout risk detected — watch weeks " + ", ".join(map(str, peak_overload_weeks[:3])) + ".")

    if sleep_deficit > 7:
        parts.append(f"Sleep deficit of {sleep_deficit:.1f}h/week — prioritize sleep to protect cognitive performance.")

    if avg_cognitive_load > 75:
        parts.append("Cognitive load is consistently high — switch to spaced study and increase recovery time.")
    elif avg_cognitive_load < 40:
        parts.append("Schedule appears sustainable — consider adding a course or research commitment.")

    if not parts:
        parts.append("Schedule is well-balanced. Maintain current workload and study strategy.")

    return " ".join(parts)
