"""
Time System — Weekly Time Budget Allocator.

Models the fundamental constraint of a student's week: 168 hours,
distributed across competing demands. This is the first subsystem called
each simulation tick, and its output constrains every downstream model.
"""

from dataclasses import dataclass

HOURS_PER_WEEK = 168.0
MIN_COMMUTE_AND_PERSONAL_HOURS = 14.0  # meals, hygiene, transit


@dataclass
class TimeAllocation:
    class_hours: float
    work_hours: float
    sleep_hours: float
    deep_study_hours: float
    shallow_study_hours: float
    recovery_hours: float
    social_hours: float
    personal_hours: float = MIN_COMMUTE_AND_PERSONAL_HOURS

    @property
    def total_hours(self) -> float:
        return (
            self.class_hours
            + self.work_hours
            + self.sleep_hours
            + self.deep_study_hours
            + self.shallow_study_hours
            + self.recovery_hours
            + self.social_hours
            + self.personal_hours
        )

    @property
    def is_overloaded(self) -> bool:
        return self.total_hours > HOURS_PER_WEEK


def compute_class_hours(courses: list) -> float:
    """
    Compute total weekly in-class hours from a list of Course ORM objects.
    Assumes 1 credit ≈ 1 hour in class per week (lecture) plus lab/recitation
    for credits ≥ 4.
    """
    total = 0.0
    for course in courses:
        total += course.credits * 1.0
        if course.credits >= 4:
            total += 1.0  # lab/recitation hour
    return total


def allocate_time(
    courses: list,
    work_hours: float,
    sleep_target_hours: float,
    study_strategy: str = "spaced",
    recovery_hours: float = 4.0,
    social_hours: float = 5.0,
) -> TimeAllocation:
    """
    Distribute the 168-hour weekly budget across all student activities.

    Priority order (hard constraints first):
      1. Sleep (non-negotiable minimum)
      2. Classes (fixed by enrollment)
      3. Work (contracted)
      4. Personal/commute buffer
      5. Recovery and social (soft minimums)
      6. Remainder → study time (split deep/shallow by strategy)

    Args:
        courses: List of Course ORM objects currently enrolled.
        work_hours: Hours per week committed to employment.
        sleep_target_hours: Student's nightly sleep target × 7.
        study_strategy: 'spaced' | 'cramming' | 'mixed' — affects
            the deep-to-shallow study ratio.
        recovery_hours: Hours reserved for rest beyond sleep.
        social_hours: Hours reserved for social and leisure activities.

    Returns:
        TimeAllocation dataclass with all hour buckets populated.
        The `is_overloaded` property is True when total > 168.
    """
    sleep_hours = sleep_target_hours * 7.0
    class_hours = compute_class_hours(courses)

    committed = (
        sleep_hours
        + class_hours
        + work_hours
        + MIN_COMMUTE_AND_PERSONAL_HOURS
    )

    # Soft reserves (reduce proportionally if over budget)
    soft_reserves = recovery_hours + social_hours
    available_for_study = HOURS_PER_WEEK - committed - soft_reserves

    if available_for_study < 0:
        # Squeeze soft reserves first, then we'll flag overload
        available_for_study = max(0.0, HOURS_PER_WEEK - committed)
        recovery_hours = available_for_study * 0.4
        social_hours = available_for_study * 0.6
        available_for_study = 0.0

    # Split study time by strategy
    if study_strategy == "spaced":
        deep_ratio = 0.70
    elif study_strategy == "cramming":
        deep_ratio = 0.30
    else:  # mixed
        deep_ratio = 0.50

    deep_study = available_for_study * deep_ratio
    shallow_study = available_for_study * (1 - deep_ratio)

    return TimeAllocation(
        class_hours=class_hours,
        work_hours=work_hours,
        sleep_hours=sleep_hours,
        deep_study_hours=deep_study,
        shallow_study_hours=shallow_study,
        recovery_hours=recovery_hours,
        social_hours=social_hours,
    )
