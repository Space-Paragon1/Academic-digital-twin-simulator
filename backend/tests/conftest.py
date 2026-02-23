"""
Pytest configuration and shared fixtures for the Academic Digital Twin test suite.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base, get_db
from app.main import app

# In-memory SQLite for tests — isolated per test session
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    """Create all tables once per test session."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db():
    """Yield a clean database session, rolling back after each test."""
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db):
    """FastAPI TestClient with the test DB session injected."""
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def sample_student_data():
    return {
        "name": "Alex Umeasalugo",
        "email": "alex@university.edu",
        "target_gpa": 3.7,
        "weekly_work_hours": 10.0,
        "sleep_target_hours": 7.5,
    }


@pytest.fixture
def sample_course_data():
    return [
        {
            "name": "Data Structures",
            "credits": 3,
            "difficulty_score": 7.5,
            "weekly_workload_hours": 6.0,
            "assessment_structure": {"assignments": 0.30, "midterm": 0.30, "final": 0.40},
        },
        {
            "name": "Calculus II",
            "credits": 4,
            "difficulty_score": 8.0,
            "weekly_workload_hours": 8.0,
            "assessment_structure": {"assignments": 0.20, "midterm": 0.35, "final": 0.45},
        },
        {
            "name": "Technical Writing",
            "credits": 3,
            "difficulty_score": 3.5,
            "weekly_workload_hours": 3.0,
            "assessment_structure": {"assignments": 0.50, "midterm": 0.20, "final": 0.30},
        },
    ]


@pytest.fixture
def sample_scenario_config():
    """Base scenario config — student_id is set in individual tests."""
    return {
        "student_id": 1,
        "num_weeks": 16,
        "work_hours_per_week": 10.0,
        "sleep_target_hours": 7.0,
        "study_strategy": "spaced",
        "include_course_ids": [],
    }
