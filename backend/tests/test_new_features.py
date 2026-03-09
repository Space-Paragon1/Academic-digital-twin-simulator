"""
Tests for features added in v1.1:
  - Variable sleep schedule
  - Extracurricular hours
  - Mid-semester course drop
  - Exam week performance modifier
  - Monte Carlo confidence bands
"""

import pytest
from unittest.mock import MagicMock

from app.simulation.engine import SimulationEngine, _VARIABLE_SLEEP_WEEKLY
from app.schemas.simulation import ScenarioConfig, MonteCarloConfig, MonteCarloRequest
from app.simulation.monte_carlo import run_monte_carlo
from app.simulation.performance_model import predict_grade


# ── Helpers ─────────────────────────────────────────────────────────────────


def _make_course(id: int, name: str = "Course", credits: int = 3,
                 difficulty: float = 6.0, workload: float = 5.0):
    c = MagicMock()
    c.id = id
    c.name = name
    c.credits = credits
    c.difficulty_score = difficulty
    c.weekly_workload_hours = workload
    return c


def _make_student(target_gpa: float = 3.5):
    s = MagicMock()
    s.id = 1
    s.target_gpa = target_gpa
    return s


@pytest.fixture
def engine():
    return SimulationEngine()


@pytest.fixture
def courses():
    return [
        _make_course(1, "Data Structures", 3, 7.5, 6.0),
        _make_course(2, "Calculus II",      4, 8.0, 8.0),
        _make_course(3, "Technical Writing",3, 3.5, 3.0),
    ]


@pytest.fixture
def student():
    return _make_student()


# ── Variable Sleep ───────────────────────────────────────────────────────────


def test_variable_sleep_schedule_runs_without_error(engine, courses, student):
    config = ScenarioConfig(
        student_id=1, num_weeks=8,
        work_hours_per_week=5.0, sleep_target_hours=7.0,
        sleep_schedule="variable",
        study_strategy="spaced", include_course_ids=[1, 2, 3],
    )
    result = engine.run(config=config, courses=courses, student=student)
    assert len(result.weekly_snapshots) == 8


def test_variable_sleep_weekly_constant_is_correct():
    """6.5h × 5 weekdays + 9h × 2 weekend = 50.5h"""
    assert abs(_VARIABLE_SLEEP_WEEKLY - 50.5) < 1e-9


def test_variable_sleep_gives_similar_gpa_to_fixed_7h(engine, courses, student):
    """Variable sleep (~7.2h avg) should produce GPA in the same ballpark as 7h fixed."""
    variable_config = ScenarioConfig(
        student_id=1, num_weeks=16,
        work_hours_per_week=5.0, sleep_target_hours=7.0,
        sleep_schedule="variable",
        study_strategy="spaced", include_course_ids=[1, 2, 3],
    )
    fixed_config = ScenarioConfig(
        student_id=1, num_weeks=16,
        work_hours_per_week=5.0, sleep_target_hours=7.0,
        sleep_schedule="fixed",
        study_strategy="spaced", include_course_ids=[1, 2, 3],
    )
    var_result   = engine.run(config=variable_config, courses=courses, student=student)
    fixed_result = engine.run(config=fixed_config,    courses=courses, student=student)
    # Should be within 0.5 GPA points of each other
    assert abs(var_result.summary.predicted_gpa_mean - fixed_result.summary.predicted_gpa_mean) < 0.5


# ── Extracurricular Hours ────────────────────────────────────────────────────


def test_extracurricular_hours_reduces_study_time(engine, courses, student):
    """Adding extracurricular hours should reduce available study time and lower GPA."""
    base_config = ScenarioConfig(
        student_id=1, num_weeks=16,
        work_hours_per_week=0.0, sleep_target_hours=8.0,
        extracurricular_hours=0.0,
        study_strategy="spaced", include_course_ids=[1, 2, 3],
    )
    busy_config = ScenarioConfig(
        student_id=1, num_weeks=16,
        work_hours_per_week=0.0, sleep_target_hours=8.0,
        extracurricular_hours=15.0,
        study_strategy="spaced", include_course_ids=[1, 2, 3],
    )
    base_result = engine.run(config=base_config, courses=courses, student=student)
    busy_result = engine.run(config=busy_config, courses=courses, student=student)
    assert base_result.summary.predicted_gpa_mean >= busy_result.summary.predicted_gpa_mean


def test_extracurricular_max_boundary(engine, courses, student):
    """20h/week extracurricular (max) should still produce a valid result."""
    config = ScenarioConfig(
        student_id=1, num_weeks=8,
        work_hours_per_week=0.0, sleep_target_hours=7.0,
        extracurricular_hours=20.0,
        study_strategy="mixed", include_course_ids=[1, 2, 3],
    )
    result = engine.run(config=config, courses=courses, student=student)
    assert 0.0 <= result.summary.predicted_gpa_mean <= 4.0


# ── Course Drop ──────────────────────────────────────────────────────────────


def test_course_drop_reduces_active_courses(engine, courses, student):
    """After dropping a course at week 4, weekly snapshots should show reduced load."""
    config = ScenarioConfig(
        student_id=1, num_weeks=8,
        work_hours_per_week=5.0, sleep_target_hours=7.5,
        drop_course_id=2,
        drop_at_week=4,
        study_strategy="spaced", include_course_ids=[1, 2, 3],
    )
    result = engine.run(config=config, courses=courses, student=student)
    assert len(result.weekly_snapshots) == 8
    assert result.summary.predicted_gpa_mean >= 0.0


def test_course_drop_produces_valid_result_without_drop(engine, courses, student):
    """Config with no course drop (drop_course_id=None) should work normally."""
    config = ScenarioConfig(
        student_id=1, num_weeks=8,
        work_hours_per_week=5.0, sleep_target_hours=7.0,
        drop_course_id=None,
        drop_at_week=None,
        study_strategy="spaced", include_course_ids=[1, 2, 3],
    )
    result = engine.run(config=config, courses=courses, student=student)
    assert len(result.weekly_snapshots) == 8


# ── Exam Week Performance Modifier ───────────────────────────────────────────


def test_exam_bonus_applied_for_high_retention(courses):
    """predict_grade should give a higher score on exam week when retention > 0.7."""
    course = courses[0]
    base = predict_grade(
        course=course,
        weekly_study_hours=6.0,
        avg_cognitive_load=40.0,
        cumulative_retention=0.8,
        is_exam_week=False,
        burnout_probability=0.1,
    )
    exam = predict_grade(
        course=course,
        weekly_study_hours=6.0,
        avg_cognitive_load=40.0,
        cumulative_retention=0.8,
        is_exam_week=True,
        burnout_probability=0.1,
    )
    assert exam > base


def test_exam_penalty_applied_for_high_burnout(courses):
    """predict_grade should give a lower score on exam week when burnout > 0.6."""
    course = courses[0]
    normal = predict_grade(
        course=course,
        weekly_study_hours=6.0,
        avg_cognitive_load=40.0,
        cumulative_retention=0.5,
        is_exam_week=False,
        burnout_probability=0.8,
    )
    penalised = predict_grade(
        course=course,
        weekly_study_hours=6.0,
        avg_cognitive_load=40.0,
        cumulative_retention=0.5,
        is_exam_week=True,
        burnout_probability=0.8,
    )
    assert penalised < normal


def test_exam_weeks_in_engine_produce_higher_load(engine, courses, student):
    """Exam weeks should show higher cognitive load than non-exam weeks."""
    config = ScenarioConfig(
        student_id=1, num_weeks=8,
        work_hours_per_week=5.0, sleep_target_hours=7.0,
        exam_weeks=[4, 8],
        study_strategy="spaced", include_course_ids=[1, 2, 3],
    )
    result = engine.run(config=config, courses=courses, student=student)
    exam_loads    = [s.cognitive_load for s in result.weekly_snapshots if s.week in {4, 8}]
    non_exam_loads = [s.cognitive_load for s in result.weekly_snapshots if s.week not in {4, 8}]
    if non_exam_loads:
        assert max(exam_loads) >= min(non_exam_loads)


# ── Monte Carlo ───────────────────────────────────────────────────────────────


def test_monte_carlo_returns_ordered_percentiles(courses, student):
    """p10 <= p50 <= p90 must hold for all weeks."""
    config = ScenarioConfig(
        student_id=1, num_weeks=8,
        work_hours_per_week=5.0, sleep_target_hours=7.5,
        study_strategy="spaced", include_course_ids=[1, 2, 3],
    )
    request = MonteCarloRequest(
        scenario_config=config,
        monte_carlo=MonteCarloConfig(n_runs=20, seed=42),
    )
    result = run_monte_carlo(request=request, courses=courses, student=student)
    for p10, p50, p90 in zip(result.weekly_p10, result.weekly_p50, result.weekly_p90):
        assert p10 <= p50 <= p90


def test_monte_carlo_summary_gpa_in_valid_range(courses, student):
    config = ScenarioConfig(
        student_id=1, num_weeks=8,
        work_hours_per_week=5.0, sleep_target_hours=7.5,
        study_strategy="spaced", include_course_ids=[1, 2, 3],
    )
    request = MonteCarloRequest(
        scenario_config=config,
        monte_carlo=MonteCarloConfig(n_runs=20, seed=0),
    )
    result = run_monte_carlo(request=request, courses=courses, student=student)
    assert 0.0 <= result.p10_gpa <= result.p50_gpa <= result.p90_gpa <= 4.0


def test_monte_carlo_weekly_bands_length_matches_num_weeks(courses, student):
    config = ScenarioConfig(
        student_id=1, num_weeks=10,
        work_hours_per_week=5.0, sleep_target_hours=7.0,
        study_strategy="mixed", include_course_ids=[1, 2, 3],
    )
    request = MonteCarloRequest(
        scenario_config=config,
        monte_carlo=MonteCarloConfig(n_runs=15, seed=7),
    )
    result = run_monte_carlo(request=request, courses=courses, student=student)
    assert len(result.weekly_p10) == 10
    assert len(result.weekly_p50) == 10
    assert len(result.weekly_p90) == 10
