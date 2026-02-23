"""
Knowledge Retention Model.

Implements the Ebbinghaus forgetting curve with spaced repetition bonus.
Retention is tracked per-course and accumulated across the semester.

Key insight:
  - Cramming → high immediate retention, steep exponential decay
  - Spaced study → moderate gain, low decay rate (durable long-term memory)

References:
  - Ebbinghaus (1885): Forgetting curve
  - Cepeda et al. (2006): Distributed practice in verbal recall tasks
"""

import math


def _forgetting_decay(days_since_review: int, stability: float) -> float:
    """
    Ebbinghaus exponential forgetting:
        R(t) = e^(-t / stability)

    Args:
        days_since_review: Days elapsed since last review session.
        stability: Memory stability factor — higher means slower decay.

    Returns:
        Retention fraction [0, 1].
    """
    if days_since_review <= 0:
        return 1.0
    return math.exp(-days_since_review / max(stability, 0.1))


def update_retention(
    prior_retention: float,
    study_hours: float,
    study_strategy: str,
    days_since_last_review: int = 7,
) -> float:
    """
    Update a course's retention score after one week of study.

    Process:
      1. Apply forgetting decay to prior retention
      2. Compute learning gain from this week's study hours
      3. Apply strategy modifier (spaced > mixed > cramming for durability)
      4. Combine: new_retention = decayed + gain * (1 - decayed)

    Args:
        prior_retention: Retention score from previous week [0, 1].
        study_hours: Hours of study dedicated to this course this week.
        study_strategy: 'spaced' | 'cramming' | 'mixed'
        days_since_last_review: Days since prior study session (default 7 = weekly).

    Returns:
        Updated retention score [0, 1].
    """
    # Strategy determines memory stability (resistance to forgetting)
    stability_map = {
        "spaced": 21.0,    # 21-day half-life
        "mixed": 10.0,     # 10-day half-life
        "cramming": 4.0,   # 4-day half-life
    }
    stability = stability_map.get(study_strategy, 10.0)

    # Decay prior retention
    decayed = prior_retention * _forgetting_decay(days_since_last_review, stability)

    # Learning gain: logarithmic — first hours are most effective
    # Max gain per week capped at 0.6 (realistic ceiling for one week)
    raw_gain = min(study_hours / 10.0, 1.0)  # normalize: ~10h = full effort
    gain = 0.6 * math.log1p(raw_gain * 4) / math.log1p(4)

    # Spaced repetition bonus
    if study_strategy == "spaced" and days_since_last_review >= 3:
        gain *= 1.25
    elif study_strategy == "cramming":
        gain *= 0.80  # cramming is less efficient for long-term retention

    # Combine: new knowledge fills gap between decayed retention and ceiling
    new_retention = decayed + gain * (1.0 - decayed)
    return float(min(max(new_retention, 0.0), 1.0))


def semester_retention_curve(
    num_weeks: int,
    weekly_study_hours: float,
    study_strategy: str,
) -> list[float]:
    """
    Simulate retention for a single course across an entire semester.

    Useful for visualizing the long-term effect of different study strategies.

    Args:
        num_weeks: Number of weeks in the semester.
        weekly_study_hours: Constant hours of study per week for this course.
        study_strategy: 'spaced' | 'cramming' | 'mixed'

    Returns:
        List of retention scores, one per week [0, 1].
    """
    retention = 0.0
    curve = []
    for _ in range(num_weeks):
        retention = update_retention(
            prior_retention=retention,
            study_hours=weekly_study_hours,
            study_strategy=study_strategy,
        )
        curve.append(retention)
    return curve
