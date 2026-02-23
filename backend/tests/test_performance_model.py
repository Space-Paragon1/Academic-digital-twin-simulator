"""Tests for the performance prediction model."""

import pytest
from unittest.mock import MagicMock

from app.simulation.performance_model import (
    compute_gpa,
    grade_to_gpa_points,
    predict_grade,
    compute_semester_gpa,
)


def _make_course(difficulty: float = 5.0, workload: float = 3.0):
    c = MagicMock()
    c.difficulty_score = difficulty
    c.weekly_workload_hours = workload
    return c


def test_grade_bounded_0_to_100():
    course = _make_course()
    grade = predict_grade(course, 10.0, avg_cognitive_load=50.0, cumulative_retention=0.5)
    assert 0.0 <= grade <= 100.0


def test_more_study_yields_higher_grade():
    course = _make_course()
    grade_low = predict_grade(course, 1.0, avg_cognitive_load=30.0, cumulative_retention=0.2)
    grade_high = predict_grade(course, 10.0, avg_cognitive_load=30.0, cumulative_retention=0.2)
    assert grade_high > grade_low


def test_high_cognitive_load_penalizes_grade():
    course = _make_course()
    grade_normal = predict_grade(course, 5.0, avg_cognitive_load=40.0, cumulative_retention=0.5)
    grade_overloaded = predict_grade(course, 5.0, avg_cognitive_load=90.0, cumulative_retention=0.5)
    assert grade_overloaded < grade_normal


def test_high_retention_improves_grade():
    course = _make_course()
    grade_low_ret = predict_grade(course, 5.0, avg_cognitive_load=50.0, cumulative_retention=0.0)
    grade_high_ret = predict_grade(course, 5.0, avg_cognitive_load=50.0, cumulative_retention=1.0)
    assert grade_high_ret > grade_low_ret


def test_grade_to_gpa_a_grade():
    assert grade_to_gpa_points(95) == 4.0
    assert grade_to_gpa_points(90) == 3.7
    assert grade_to_gpa_points(85) == 3.0


def test_compute_gpa_weighted():
    grades = {"Math": 95.0, "English": 80.0}
    credits = {"Math": 4, "English": 3}
    gpa = compute_gpa(grades, credits)
    # Math: 4.0 * 4 = 16, English: 2.7 * 3 = 8.1, total = 24.1 / 7 ≈ 3.44
    assert 3.0 <= gpa <= 4.0


def test_compute_gpa_empty():
    assert compute_gpa({}, {}) == 0.0
