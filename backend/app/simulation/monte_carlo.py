"""
Monte Carlo Simulation Runner.

Runs the simulation engine N times with randomized sleep/study variance to
produce confidence bands (p10/p50/p90) on GPA predictions. Models real-world
unpredictability: sick days, disruptions, variable motivation.
"""

import random
import statistics

from app.schemas.simulation import MonteCarloRequest, MonteCarloResult, ScenarioConfig
from app.simulation.engine import SimulationEngine


def run_monte_carlo(
    request: MonteCarloRequest,
    courses: list,
    student,
) -> MonteCarloResult:
    """
    Run the simulation multiple times with random variation to produce
    GPA confidence bands.

    Variation is injected via small random jitter on sleep target hours,
    which serves as a proxy for real-world disruptions (sick days,
    late nights, social events) without changing the core model.

    Args:
        request: MonteCarloRequest with scenario config and MC settings.
        courses: List of Course ORM objects.
        student: Student ORM object.

    Returns:
        MonteCarloResult with p10/p50/p90 GPA and per-week bands.
    """
    engine = SimulationEngine()
    config = request.scenario_config
    mc = request.monte_carlo

    all_weekly_gpas: list[list[float]] = []
    all_final_gpas: list[float] = []
    all_burnout_probs: list[float] = []

    rng = random.Random(42)

    for _ in range(mc.runs):
        # Jitter sleep as a proxy for real-world unpredictability
        sleep_jitter = rng.gauss(0, mc.study_variance * 0.5)
        jittered_sleep = max(4.0, min(12.0, config.sleep_target_hours + sleep_jitter))

        jittered_config = ScenarioConfig(
            **{**config.model_dump(), "sleep_target_hours": jittered_sleep}
        )

        try:
            result = engine.run(config=jittered_config, courses=courses, student=student)
            weekly_gpas = [s.predicted_gpa for s in result.weekly_snapshots]
            all_weekly_gpas.append(weekly_gpas)
            all_final_gpas.append(result.summary.predicted_gpa_mean)
            all_burnout_probs.append(result.summary.burnout_probability)
        except Exception:
            continue

    if not all_final_gpas:
        raise ValueError("Monte Carlo: all runs failed — check scenario config.")

    all_final_gpas.sort()

    def percentile(sorted_list: list[float], p: float) -> float:
        idx = max(0, min(int(len(sorted_list) * p / 100), len(sorted_list) - 1))
        return sorted_list[idx]

    # Build per-week percentile bands
    num_weeks = len(all_weekly_gpas[0]) if all_weekly_gpas else 0
    weekly_p10, weekly_p50, weekly_p90 = [], [], []
    for w in range(num_weeks):
        week_vals = sorted([run[w] for run in all_weekly_gpas if len(run) > w])
        weekly_p10.append(round(percentile(week_vals, 10), 3))
        weekly_p50.append(round(percentile(week_vals, 50), 3))
        weekly_p90.append(round(percentile(week_vals, 90), 3))

    return MonteCarloResult(
        runs=len(all_final_gpas),
        p10_gpa=round(percentile(all_final_gpas, 10), 3),
        p50_gpa=round(percentile(all_final_gpas, 50), 3),
        p90_gpa=round(percentile(all_final_gpas, 90), 3),
        burnout_probability_mean=round(statistics.mean(all_burnout_probs), 3),
        weekly_p10=weekly_p10,
        weekly_p50=weekly_p50,
        weekly_p90=weekly_p90,
    )
