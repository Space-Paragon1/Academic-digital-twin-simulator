"""
Schedule Optimizer.

Wraps the simulation engine as a black-box objective function and uses
scipy's differential evolution algorithm to search for the optimal
weekly schedule configuration.

Optimization variables:
  - work_hours_per_week (continuous)
  - sleep_hours_per_night (continuous)
  - study_strategy (categorical, encoded)

Objective functions:
  - 'maximize_gpa': minimize negative predicted GPA
  - 'minimize_burnout': minimize burnout probability
  - 'balanced': weighted combination of both

Uses differential evolution because:
  - The schedule space is non-convex and non-differentiable
  - Categorical + continuous mixed variable space
  - No gradient information available
"""

import numpy as np
from scipy.optimize import differential_evolution

from app.schemas.simulation import (
    OptimizationConstraints,
    OptimizationRequest,
    OptimizationResult,
    ScenarioConfig,
)


STRATEGY_ENCODING = {0: "spaced", 1: "mixed", 2: "cramming"}


def optimize_schedule(
    engine,
    student,
    courses: list,
    request: OptimizationRequest,
) -> OptimizationResult:
    """
    Search for the optimal weekly schedule using differential evolution.

    Decision vector x = [work_hours, sleep_hours_per_night, strategy_idx]

    Args:
        engine: SimulationEngine instance (already instantiated).
        student: Student ORM object.
        courses: List of Course ORM objects to include in optimization.
        request: OptimizationRequest with constraints and objective.

    Returns:
        OptimizationResult with optimal parameters and predicted outcomes.
    """
    constraints = request.constraints
    course_ids = [c.id for c in courses]

    bounds = [
        (0.0, constraints.max_work_hours_per_week),       # work_hours
        (constraints.min_sleep_hours, 10.0),               # sleep_hours/night
        (0.0, 2.99),                                       # strategy_idx (floor → 0,1,2)
    ]

    def objective(x: np.ndarray) -> float:
        work_h, sleep_h, strat_idx = x
        strategy = STRATEGY_ENCODING[int(strat_idx)]

        config = ScenarioConfig(
            student_id=student.id,
            num_weeks=request.num_weeks,
            work_hours_per_week=float(work_h),
            sleep_target_hours=float(sleep_h),
            study_strategy=strategy,
            include_course_ids=course_ids,
        )

        try:
            result = engine.run(config=config, courses=courses, student=student)
        except Exception:
            return 1e6  # penalize invalid configs

        gpa = result.summary.predicted_gpa_mean
        burnout = result.summary.burnout_risk

        burnout_score = {"LOW": 0.1, "MEDIUM": 0.5, "HIGH": 0.9}[burnout]

        if request.objective == "maximize_gpa":
            return -gpa
        elif request.objective == "minimize_burnout":
            return burnout_score
        else:  # balanced
            return -gpa * 0.6 + burnout_score * 0.4

    result = differential_evolution(
        objective,
        bounds=bounds,
        maxiter=50,
        popsize=10,
        seed=42,
        tol=0.01,
    )

    optimal_work = float(result.x[0])
    optimal_sleep = float(result.x[1])
    optimal_strategy = STRATEGY_ENCODING[int(result.x[2])]

    # Run final simulation with optimal params to get full result
    optimal_config = ScenarioConfig(
        student_id=student.id,
        num_weeks=request.num_weeks,
        work_hours_per_week=optimal_work,
        sleep_target_hours=optimal_sleep,
        study_strategy=optimal_strategy,
        include_course_ids=course_ids,
    )
    final_sim = engine.run(config=optimal_config, courses=courses, student=student)

    return OptimizationResult(
        objective=request.objective,
        optimal_work_hours=optimal_work,
        optimal_sleep_hours=optimal_sleep,
        optimal_study_hours_per_course={
            c.name: final_sim.weekly_snapshots[-1].time_allocation.deep_study_hours / max(len(courses), 1)
            for c in courses
        },
        optimal_study_strategy=optimal_strategy,
        predicted_gpa=final_sim.summary.predicted_gpa_mean,
        predicted_burnout_probability=final_sim.summary.burnout_probability,
        simulation_result=final_sim,
    )
