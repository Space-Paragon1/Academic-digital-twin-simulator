"""
Recovery & Burnout Model.

Simulates how fatigue accumulates and dissipates across the semester,
and computes the probability of academic burnout based on sustained overload
and sleep deprivation.

Burnout indicators modeled:
  - Sustained high cognitive load (> 70) for 3+ consecutive weeks
  - Chronic sleep deficit (< 6h/night)
  - Insufficient recovery time
  - Cumulative overload weeks

References:
  - Maslach Burnout Inventory dimensions (exhaustion, cynicism, efficacy)
  - Pilcher & Huffcutt (1996): Sleep deprivation effects on performance
"""

import math
import numpy as np


BURNOUT_LOAD_THRESHOLD = 70.0
BURNOUT_SLEEP_MINIMUM = 42.0   # 6h/night × 7
OVERLOAD_STREAK_TRIGGER = 3    # weeks of consecutive overload before risk spikes


def compute_recovery(
    current_fatigue: float,
    sleep_hours: float,
    recovery_hours: float,
) -> float:
    """
    Update fatigue level after a week of sleep and recovery activities.

    Fatigue decreases from adequate sleep and recovery time.
    Fatigue increases from sleep deficit.

    Formula:
        recovery_rate = (sleep_hours / 49) * 0.5 + (recovery_hours / 10) * 0.2
        fatigue_change = sleep_deficit_penalty - recovery_rate
        new_fatigue = clamp(current_fatigue + fatigue_change, 0, 1)

    Args:
        current_fatigue: Current fatigue level [0, 1].
        sleep_hours: Total sleep hours this week (7 × nightly).
        recovery_hours: Hours of dedicated rest/relaxation this week.

    Returns:
        Updated fatigue level [0, 1].
    """
    # Sleep adequacy: 49h/week (7h/night) is baseline
    sleep_ratio = sleep_hours / 49.0
    sleep_recovery = min(sleep_ratio * 0.5, 0.5)  # max 0.5 reduction from sleep

    # Recovery activity benefit (capped at 0.2 reduction)
    recovery_benefit = min(recovery_hours / 10.0 * 0.2, 0.2)

    # Sleep deficit penalty
    sleep_deficit = max(0.0, 49.0 - sleep_hours)
    sleep_penalty = sleep_deficit * 0.015  # each missing hour adds fatigue

    fatigue_change = sleep_penalty - sleep_recovery - recovery_benefit
    new_fatigue = current_fatigue + fatigue_change
    return float(np.clip(new_fatigue, 0.0, 1.0))


def compute_burnout_probability(
    load_history: list[float],
    sleep_history: list[float],
    recovery_history: list[float],
) -> float:
    """
    Compute the probability of academic burnout based on semester history.

    Uses a logistic model where risk factors include:
      - Mean load over the semester (weight: 0.35)
      - Weeks with load > 70 (weight: 0.25)
      - Consecutive overload streak (weight: 0.20)
      - Mean sleep deficit (weight: 0.20)

    Args:
        load_history: List of per-week cognitive load scores (0–100).
        sleep_history: List of per-week total sleep hours.
        recovery_history: List of per-week recovery hours.

    Returns:
        Burnout probability [0, 1].
    """
    if not load_history:
        return 0.0

    n = len(load_history)

    # Factor 1: Mean cognitive load normalized to 0-1
    mean_load = sum(load_history) / n
    mean_load_factor = mean_load / 100.0

    # Factor 2: Proportion of weeks in overload zone
    overload_weeks = sum(1 for l in load_history if l > BURNOUT_LOAD_THRESHOLD)
    overload_proportion = overload_weeks / n

    # Factor 3: Longest consecutive overload streak
    max_streak = _max_consecutive(load_history, threshold=BURNOUT_LOAD_THRESHOLD)
    streak_factor = min(max_streak / 8.0, 1.0)  # 8+ weeks = max risk

    # Factor 4: Mean sleep deficit factor
    mean_sleep = sum(sleep_history) / n if sleep_history else 49.0
    sleep_deficit = max(0.0, 49.0 - mean_sleep)
    sleep_factor = min(sleep_deficit / 21.0, 1.0)  # 21h deficit = 3h/night short

    # Weighted logistic score
    raw_score = (
        0.35 * mean_load_factor
        + 0.25 * overload_proportion
        + 0.20 * streak_factor
        + 0.20 * sleep_factor
    )

    # Apply logistic function centered at 0.5 for smooth probability
    probability = 1.0 / (1.0 + math.exp(-10.0 * (raw_score - 0.45)))
    return float(np.clip(probability, 0.0, 1.0))


def burnout_risk_label(probability: float) -> str:
    """Map a burnout probability to a human-readable risk label."""
    if probability < 0.33:
        return "LOW"
    elif probability < 0.66:
        return "MEDIUM"
    return "HIGH"


def _max_consecutive(values: list[float], threshold: float) -> int:
    """Return the length of the longest consecutive run where value > threshold."""
    max_run = 0
    current_run = 0
    for v in values:
        if v > threshold:
            current_run += 1
            max_run = max(max_run, current_run)
        else:
            current_run = 0
    return max_run
