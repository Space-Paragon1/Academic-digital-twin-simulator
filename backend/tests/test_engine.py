"""Integration tests for the simulation engine."""

import pytest
from unittest.mock import MagicMock

from app.simulation.engine import SimulationEngine
from app.schemas.simulation import ScenarioConfig


def _make_course(id: int, name: str, credits: int, difficulty: float, workload: float):
    c = MagicMock()
    c.id = id
    c.name = name
    c.credits = credits
    c.difficulty_score = difficulty
    c.weekly_workload_hours = workload
    return c


def _make_student(id: int = 1, target_gpa: float = 3.5):
    s = MagicMock()
    s.id = id
    s.target_gpa = target_gpa
    return s


@pytest.fixture
def engine():
    return SimulationEngine()


@pytest.fixture
def sample_courses():
    return [
        _make_course(1, "Data Structures", 3, 7.5, 6.0),
        _make_course(2, "Calculus II", 4, 8.0, 8.0),
        _make_course(3, "Technical Writing", 3, 3.5, 3.0),
    ]


@pytest.fixture
def sample_student():
    return _make_student()


def test_engine_produces_correct_number_of_weekly_snapshots(engine, sample_courses, sample_student):
    config = ScenarioConfig(
        student_id=1, num_weeks=16,
        work_hours_per_week=10.0, sleep_target_hours=7.0,
        study_strategy="spaced", include_course_ids=[1, 2, 3],
    )
    result = engine.run(config=config, courses=sample_courses, student=sample_student)
    assert len(result.weekly_snapshots) == 16


def test_engine_gpa_within_valid_range(engine, sample_courses, sample_student):
    config = ScenarioConfig(
        student_id=1, num_weeks=16,
        work_hours_per_week=10.0, sleep_target_hours=7.0,
        study_strategy="spaced", include_course_ids=[1, 2, 3],
    )
    result = engine.run(config=config, courses=sample_courses, student=sample_student)
    assert 0.0 <= result.summary.predicted_gpa_mean <= 4.0


def test_overloaded_schedule_yields_higher_burnout_than_light_schedule(engine, sample_courses, sample_student):
    light_config = ScenarioConfig(
        student_id=1, num_weeks=16,
        work_hours_per_week=0.0, sleep_target_hours=8.0,
        study_strategy="spaced", include_course_ids=[1, 2, 3],
    )
    heavy_config = ScenarioConfig(
        student_id=1, num_weeks=16,
        work_hours_per_week=40.0, sleep_target_hours=5.0,
        study_strategy="cramming", include_course_ids=[1, 2, 3],
    )
    light_result = engine.run(config=light_config, courses=sample_courses, student=sample_student)
    heavy_result = engine.run(config=heavy_config, courses=sample_courses, student=sample_student)

    burnout_rank = {"LOW": 0, "MEDIUM": 1, "HIGH": 2}
    assert burnout_rank[heavy_result.summary.burnout_risk] >= burnout_rank[light_result.summary.burnout_risk]


def test_engine_raises_on_empty_course_list(engine, sample_student):
    config = ScenarioConfig(
        student_id=1, num_weeks=16,
        work_hours_per_week=10.0, sleep_target_hours=7.0,
        study_strategy="spaced", include_course_ids=[99],  # non-existent
    )
    with pytest.raises(ValueError, match="No courses selected"):
        engine.run(config=config, courses=[], student=sample_student)


def test_engine_burnout_risk_label_is_valid(engine, sample_courses, sample_student):
    config = ScenarioConfig(
        student_id=1, num_weeks=16,
        work_hours_per_week=10.0, sleep_target_hours=7.0,
        study_strategy="mixed", include_course_ids=[1, 2, 3],
    )
    result = engine.run(config=config, courses=sample_courses, student=sample_student)
    assert result.summary.burnout_risk in {"LOW", "MEDIUM", "HIGH"}


def test_api_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_api_create_and_get_student(client, sample_student_data):
    post = client.post("/api/v1/students/", json=sample_student_data)
    assert post.status_code == 201
    student_id = post.json()["id"]

    get = client.get(f"/api/v1/students/{student_id}")
    assert get.status_code == 200
    assert get.json()["email"] == sample_student_data["email"]
