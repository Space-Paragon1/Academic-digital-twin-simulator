"""Tests for the cognitive load subsystem."""

import pytest
from unittest.mock import MagicMock

from app.simulation.cognitive_load import (
    compute_weekly_load,
    accumulate_load,
    distribute_study_hours,
    MAX_LOAD,
    LOAD_OVERLOAD_THRESHOLD,
)


def _make_course(id: int, difficulty: float = 5.0, workload: float = 3.0):
    c = MagicMock()
    c.id = id
    c.difficulty_score = difficulty
    c.weekly_workload_hours = workload
    return c


def test_load_is_zero_with_no_courses():
    assert compute_weekly_load([], {}, 0.0, 49.0) == 0.0


def test_load_bounded_between_0_and_100():
    courses = [_make_course(1, difficulty=10.0)]
    load = compute_weekly_load(courses, {1: 20.0}, prior_fatigue=1.0, sleep_hours=28.0)
    assert 0.0 <= load <= MAX_LOAD


def test_sleep_deprivation_increases_load():
    courses = [_make_course(1)]
    load_rested = compute_weekly_load(courses, {1: 5.0}, prior_fatigue=0.0, sleep_hours=49.0)
    load_deprived = compute_weekly_load(courses, {1: 5.0}, prior_fatigue=0.0, sleep_hours=28.0)
    assert load_deprived > load_rested


def test_high_fatigue_amplifies_load():
    courses = [_make_course(1)]
    load_fresh = compute_weekly_load(courses, {1: 5.0}, prior_fatigue=0.0, sleep_hours=49.0)
    load_tired = compute_weekly_load(courses, {1: 5.0}, prior_fatigue=0.9, sleep_hours=49.0)
    assert load_tired > load_fresh


def test_accumulate_load_is_monotonically_nondecreasing_at_high_load():
    """With no decay (or very low), accumulated load should grow."""
    weekly = [60.0] * 8
    accumulated = accumulate_load(weekly, decay_rate=0.0)
    for i in range(1, len(accumulated)):
        assert accumulated[i] >= accumulated[i - 1]


def test_accumulate_load_returns_same_length():
    loads = [30.0, 50.0, 70.0, 40.0]
    result = accumulate_load(loads)
    assert len(result) == 4


def test_distribute_proportional_sums_to_total():
    courses = [_make_course(1, difficulty=8.0), _make_course(2, difficulty=4.0)]
    total = 20.0
    dist = distribute_study_hours(courses, total, strategy="proportional")
    assert sum(dist.values()) == pytest.approx(total, rel=1e-6)


def test_distribute_equal_gives_same_hours():
    courses = [_make_course(1), _make_course(2), _make_course(3)]
    dist = distribute_study_hours(courses, 15.0, strategy="equal")
    values = list(dist.values())
    assert all(abs(v - values[0]) < 1e-9 for v in values)
