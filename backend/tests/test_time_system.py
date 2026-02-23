"""Tests for the time allocation subsystem."""

import pytest
from unittest.mock import MagicMock

from app.simulation.time_system import allocate_time, compute_class_hours, HOURS_PER_WEEK


def _make_course(credits: int, difficulty: float = 5.0, workload: float = 3.0):
    """Helper to create a mock course object."""
    c = MagicMock()
    c.credits = credits
    c.difficulty_score = difficulty
    c.weekly_workload_hours = workload
    return c


def test_class_hours_computed_correctly():
    courses = [_make_course(3), _make_course(4), _make_course(3)]
    hours = compute_class_hours(courses)
    # 3 + 4 + 1 (lab for 4-credit) + 3 = 11
    assert hours == 11.0


def test_total_hours_does_not_exceed_budget_with_reasonable_inputs():
    courses = [_make_course(3), _make_course(3)]
    alloc = allocate_time(courses, work_hours=10.0, sleep_target_hours=7.0)
    assert alloc.total_hours <= HOURS_PER_WEEK + 1  # allow minor float tolerance


def test_overload_flagged_for_extreme_schedule():
    # committed = classes(19) + work(60) + sleep(84) + personal(14) = 177h > 168h
    courses = [_make_course(c) for c in [4, 4, 3, 3, 3]]  # 17 credits → 19 class hours
    alloc = allocate_time(courses, work_hours=60.0, sleep_target_hours=12.0)
    assert alloc.is_overloaded


def test_spaced_strategy_has_more_deep_study_than_shallow():
    courses = [_make_course(3)]
    alloc = allocate_time(courses, work_hours=0.0, sleep_target_hours=7.0, study_strategy="spaced")
    assert alloc.deep_study_hours >= alloc.shallow_study_hours


def test_cramming_strategy_has_less_deep_study():
    courses = [_make_course(3)]
    alloc = allocate_time(courses, work_hours=0.0, sleep_target_hours=7.0, study_strategy="cramming")
    assert alloc.shallow_study_hours >= alloc.deep_study_hours


def test_sleep_hours_matches_target():
    courses = [_make_course(3)]
    alloc = allocate_time(courses, work_hours=0.0, sleep_target_hours=8.0)
    assert alloc.sleep_hours == pytest.approx(56.0)  # 8 * 7
