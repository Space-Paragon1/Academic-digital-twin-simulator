"""API endpoint integration tests."""

import pytest


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_create_student(client, sample_student_data):
    r = client.post("/api/v1/students/", json=sample_student_data)
    assert r.status_code == 201
    body = r.json()
    assert body["email"] == sample_student_data["email"]
    assert "id" in body


def test_duplicate_student_email_rejected(client, sample_student_data):
    client.post("/api/v1/students/", json=sample_student_data)
    r = client.post("/api/v1/students/", json=sample_student_data)
    assert r.status_code == 409


def test_get_student_not_found(client):
    r = client.get("/api/v1/students/99999")
    assert r.status_code == 404


def test_add_and_list_courses(client, sample_student_data, sample_course_data):
    student_id = client.post("/api/v1/students/", json=sample_student_data).json()["id"]
    for course in sample_course_data:
        r = client.post(f"/api/v1/students/{student_id}/courses", json=course)
        assert r.status_code == 201

    r = client.get(f"/api/v1/students/{student_id}/courses")
    assert r.status_code == 200
    assert len(r.json()) == len(sample_course_data)


def test_run_simulation(client, sample_student_data, sample_course_data):
    student_id = client.post("/api/v1/students/", json=sample_student_data).json()["id"]
    for course in sample_course_data:
        client.post(f"/api/v1/students/{student_id}/courses", json=course)

    config = {
        "student_id": student_id,
        "num_weeks": 8,
        "work_hours_per_week": 10.0,
        "sleep_target_hours": 7.0,
        "study_strategy": "spaced",
        "include_course_ids": [],
    }
    r = client.post("/api/v1/simulations/run", json=config)
    assert r.status_code == 201
    body = r.json()
    assert "weekly_snapshots" in body
    assert len(body["weekly_snapshots"]) == 8
    assert body["summary"]["burnout_risk"] in ("LOW", "MEDIUM", "HIGH")
