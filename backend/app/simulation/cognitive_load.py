"""
Cognitive Load System.

Models how mental effort accumulates across courses, study sessions, and weeks.
High cognitive load degrades learning efficiency, increases error rates, and
feeds the burnout model. Load is bounded 0–100.

References:
  - Sweller's Cognitive Load Theory (1988)
  - Baddeley's working memory model for capacity constraints
"""

import numpy as np

MAX_LOAD = 100.0
LOAD_OVERLOAD_THRESHOLD = 70.0


def compute_weekly_load(
    courses: list,
    study_hours_per_course: dict[int, float],
    prior_fatigue: float,
    sleep_hours: float,
) -> float:
    """
    Compute a student's cognitive load score for a single week.

    Formula:
        raw_load = Σ (course.difficulty_score * study_hours[course.id]) / normalizer
        sequencing_penalty = max(0, n_hard_courses - 1) * 5
        fatigue_multiplier = 1 + (prior_fatigue * 0.4)
        sleep_penalty = max(0, (7 * 7 - sleep_hours)) * 2
        load = clamp(raw_load * fatigue_multiplier + sequencing_penalty + sleep_penalty, 0, 100)

    Args:
        courses: List of Course ORM objects for enrolled courses.
        study_hours_per_course: Mapping of course_id → hours studied this week.
        prior_fatigue: Fatigue carry-over from previous week (0–1).
        sleep_hours: Total sleep hours this week (7 * nightly target).

    Returns:
        Cognitive load score in range [0, 100].
    """
    if not courses:
        return 0.0

    raw_load = sum(
        course.difficulty_score * study_hours_per_course.get(course.id, 0.0)
        for course in courses
    )
    # Normalizer: 10 difficulty × 3h study per course = 30 per course
    normalizer = len(courses) * 30.0
    raw_load = (raw_load / normalizer) * MAX_LOAD if normalizer > 0 else 0.0

    # Sequencing penalty: taking ≥ 2 courses with difficulty > 7 simultaneously
    hard_courses = [c for c in courses if c.difficulty_score > 7.0]
    sequencing_penalty = max(0, len(hard_courses) - 1) * 5.0

    # Fatigue multiplier: tired students process harder
    fatigue_multiplier = 1.0 + (prior_fatigue * 0.4)

    # Sleep deprivation penalty: below 49h/week (7h/night) stacks load
    sleep_deficit_hours = max(0.0, 49.0 - sleep_hours)
    sleep_penalty = sleep_deficit_hours * 2.0

    load = raw_load * fatigue_multiplier + sequencing_penalty + sleep_penalty
    return float(np.clip(load, 0.0, MAX_LOAD))


def accumulate_load(
    weekly_loads: list[float],
    decay_rate: float = 0.15,
) -> list[float]:
    """
    Apply exponential decay so cognitive load from prior weeks bleeds into
    subsequent weeks (residual stress and mental fatigue).

    accumulated[t] = load[t] + (1 - decay_rate) * accumulated[t-1]

    Args:
        weekly_loads: Raw per-week load scores (length = num_weeks).
        decay_rate: Fraction of prior load that dissipates each week.
            Default 0.15 means 85% carries over — realistic for sustained semesters.

    Returns:
        List of accumulated load scores, same length as weekly_loads.
    """
    accumulated: list[float] = []
    carry = 0.0
    for load in weekly_loads:
        carry = load + (1.0 - decay_rate) * carry
        accumulated.append(float(np.clip(carry, 0.0, MAX_LOAD)))
    return accumulated


def distribute_study_hours(
    courses: list,
    total_study_hours: float,
    strategy: str = "proportional",
) -> dict[int, float]:
    """
    Distribute total available study hours across enrolled courses.

    Strategies:
      'proportional' — allocate by each course's relative difficulty score
      'equal' — split evenly
      'workload' — allocate by each course's stated weekly workload hours

    Args:
        courses: List of Course ORM objects.
        total_study_hours: Total study budget this week (deep + shallow).
        strategy: Allocation strategy name.

    Returns:
        dict mapping course.id → allocated study hours.
    """
    if not courses:
        return {}

    if strategy == "equal":
        per_course = total_study_hours / len(courses)
        return {c.id: per_course for c in courses}

    if strategy == "workload":
        total_workload = sum(c.weekly_workload_hours for c in courses) or 1.0
        return {
            c.id: (c.weekly_workload_hours / total_workload) * total_study_hours
            for c in courses
        }

    # Default: proportional to difficulty
    total_difficulty = sum(c.difficulty_score for c in courses) or 1.0
    return {
        c.id: (c.difficulty_score / total_difficulty) * total_study_hours
        for c in courses
    }
