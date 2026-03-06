"""API endpoint integration tests."""

import pytest


# ── Helpers ───────────────────────────────────────────────────────────────────

def _create_student(client, data):
    return client.post("/api/v1/students/", json=data).json()


def _add_courses(client, student_id, courses):
    ids = []
    for c in courses:
        r = client.post(f"/api/v1/students/{student_id}/courses", json=c)
        ids.append(r.json()["id"])
    return ids


def _run_sim(client, student_id, num_weeks=8):
    return client.post("/api/v1/simulations/run", json={
        "student_id": student_id,
        "num_weeks": num_weeks,
        "work_hours_per_week": 10.0,
        "sleep_target_hours": 7.0,
        "study_strategy": "spaced",
        "include_course_ids": [],
    })


# ── Health ─────────────────────────────────────────────────────────────────────

def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# ── Students ──────────────────────────────────────────────────────────────────

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


def test_update_student(client, sample_student_data):
    student_id = _create_student(client, sample_student_data)["id"]
    r = client.put(f"/api/v1/students/{student_id}", json={
        "name": "Updated Name",
        "target_gpa": 3.9,
    })
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "Updated Name"
    assert body["target_gpa"] == pytest.approx(3.9)
    # Email unchanged
    assert body["email"] == sample_student_data["email"]


def test_update_student_not_found(client):
    r = client.put("/api/v1/students/99999", json={"name": "Ghost"})
    assert r.status_code == 404


# ── Courses ───────────────────────────────────────────────────────────────────

def test_add_and_list_courses(client, sample_student_data, sample_course_data):
    student_id = _create_student(client, sample_student_data)["id"]
    for course in sample_course_data:
        r = client.post(f"/api/v1/students/{student_id}/courses", json=course)
        assert r.status_code == 201

    r = client.get(f"/api/v1/students/{student_id}/courses")
    assert r.status_code == 200
    assert len(r.json()) == len(sample_course_data)


def test_add_course_to_missing_student(client, sample_course_data):
    r = client.post("/api/v1/students/99999/courses", json=sample_course_data[0])
    assert r.status_code == 404


def test_remove_course(client, sample_student_data, sample_course_data):
    student_id = _create_student(client, sample_student_data)["id"]
    course_ids = _add_courses(client, student_id, sample_course_data)

    # Remove the first course
    r = client.delete(f"/api/v1/courses/{course_ids[0]}")
    assert r.status_code == 204

    # Only remaining courses should be listed
    remaining = client.get(f"/api/v1/students/{student_id}/courses").json()
    assert len(remaining) == len(sample_course_data) - 1
    remaining_ids = {c["id"] for c in remaining}
    assert course_ids[0] not in remaining_ids


def test_remove_course_not_found(client):
    r = client.delete("/api/v1/courses/99999")
    assert r.status_code == 404


# ── Simulations ───────────────────────────────────────────────────────────────

def test_run_simulation(client, sample_student_data, sample_course_data):
    student_id = _create_student(client, sample_student_data)["id"]
    _add_courses(client, student_id, sample_course_data)

    r = _run_sim(client, student_id, num_weeks=8)
    assert r.status_code == 201
    body = r.json()
    assert "weekly_snapshots" in body
    assert len(body["weekly_snapshots"]) == 8
    assert body["summary"]["burnout_risk"] in ("LOW", "MEDIUM", "HIGH")
    assert "id" in body


def test_run_simulation_no_courses_fails(client, sample_student_data):
    student_id = _create_student(client, sample_student_data)["id"]
    r = _run_sim(client, student_id)
    assert r.status_code == 400


def test_run_simulation_missing_student_fails(client):
    r = _run_sim(client, student_id=99999)
    assert r.status_code == 404


def test_get_simulation_by_id(client, sample_student_data, sample_course_data):
    student_id = _create_student(client, sample_student_data)["id"]
    _add_courses(client, student_id, sample_course_data)
    sim_id = _run_sim(client, student_id).json()["id"]

    r = client.get(f"/api/v1/simulations/{sim_id}")
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == sim_id
    assert "weekly_snapshots" in body
    assert "summary" in body


def test_get_simulation_not_found(client):
    r = client.get("/api/v1/simulations/99999")
    assert r.status_code == 404


def test_list_simulations_for_student(client, sample_student_data, sample_course_data):
    student_id = _create_student(client, sample_student_data)["id"]
    _add_courses(client, student_id, sample_course_data)

    # Run two simulations
    _run_sim(client, student_id, num_weeks=4)
    _run_sim(client, student_id, num_weeks=8)

    r = client.get(f"/api/v1/simulations/student/{student_id}")
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 2
    assert all("id" in sim for sim in body)


def test_list_simulations_missing_student(client):
    r = client.get("/api/v1/simulations/student/99999")
    assert r.status_code == 404


def test_delete_simulation(client, sample_student_data, sample_course_data):
    student_id = _create_student(client, sample_student_data)["id"]
    _add_courses(client, student_id, sample_course_data)
    sim_id = _run_sim(client, student_id).json()["id"]

    r = client.delete(f"/api/v1/simulations/{sim_id}")
    assert r.status_code == 204

    # Verify it's gone
    r = client.get(f"/api/v1/simulations/{sim_id}")
    assert r.status_code == 404


def test_delete_simulation_not_found(client):
    r = client.delete("/api/v1/simulations/99999")
    assert r.status_code == 404


def test_simulation_snapshots_have_course_retentions(client, sample_student_data, sample_course_data):
    student_id = _create_student(client, sample_student_data)["id"]
    _add_courses(client, student_id, sample_course_data)

    body = _run_sim(client, student_id).json()
    first_snap = body["weekly_snapshots"][0]
    assert "course_retentions" in first_snap
    assert isinstance(first_snap["course_retentions"], dict)
    assert len(first_snap["course_retentions"]) == len(sample_course_data)


def test_simulation_exam_weeks_flagged(client, sample_student_data, sample_course_data):
    student_id = _create_student(client, sample_student_data)["id"]
    _add_courses(client, student_id, sample_course_data)

    config = {
        "student_id": student_id,
        "num_weeks": 8,
        "work_hours_per_week": 10.0,
        "sleep_target_hours": 7.0,
        "study_strategy": "spaced",
        "include_course_ids": [],
        "exam_weeks": [4, 8],
    }
    body = client.post("/api/v1/simulations/run", json=config).json()
    exam_snap_weeks = [s["week"] for s in body["weekly_snapshots"] if s["is_exam_week"]]
    assert 4 in exam_snap_weeks
    assert 8 in exam_snap_weeks


# ── Optimizer ─────────────────────────────────────────────────────────────────

def test_optimize_schedule(client, sample_student_data, sample_course_data):
    """Optimizer returns valid schedule within constraint bounds."""
    student_id = _create_student(client, sample_student_data)["id"]
    _add_courses(client, student_id, sample_course_data)

    payload = {
        "student_id": student_id,
        "num_weeks": 4,  # short run to keep DE fast
        "constraints": {
            "max_work_hours_per_week": 20.0,
            "min_sleep_hours": 6.0,
            "target_min_gpa": 3.0,
        },
        "objective": "maximize_gpa",
    }
    r = client.post("/api/v1/scenarios/optimize", json=payload)
    assert r.status_code == 200
    body = r.json()

    assert body["objective"] == "maximize_gpa"
    assert 0.0 <= body["optimal_work_hours"] <= 20.0
    assert 6.0 <= body["optimal_sleep_hours"] <= 10.0
    assert body["optimal_study_strategy"] in ("spaced", "mixed", "cramming")
    assert 0.0 <= body["predicted_gpa"] <= 4.0
    assert 0.0 <= body["predicted_burnout_probability"] <= 1.0
    assert "simulation_result" in body
    assert len(body["simulation_result"]["weekly_snapshots"]) == 4

    # Per-course allocation must cover all enrolled courses and be positive
    study_alloc = body["optimal_study_hours_per_course"]
    assert len(study_alloc) == len(sample_course_data)
    assert all(h >= 0.0 for h in study_alloc.values())

    # Higher-workload courses must receive more (or equal) hours than lower ones
    # Data Structures (6h) and Calculus II (8h) should each beat Technical Writing (3h)
    assert study_alloc["Calculus II"] >= study_alloc["Technical Writing"]
    assert study_alloc["Data Structures"] >= study_alloc["Technical Writing"]


def test_optimize_no_courses_fails(client, sample_student_data):
    student_id = _create_student(client, sample_student_data)["id"]
    r = client.post("/api/v1/scenarios/optimize", json={
        "student_id": student_id,
        "num_weeks": 4,
        "constraints": {"max_work_hours_per_week": 20.0, "min_sleep_hours": 6.0, "target_min_gpa": 3.0},
        "objective": "balanced",
    })
    assert r.status_code == 400


def test_optimize_missing_student_fails(client):
    r = client.post("/api/v1/scenarios/optimize", json={
        "student_id": 99999,
        "num_weeks": 4,
        "constraints": {"max_work_hours_per_week": 20.0, "min_sleep_hours": 6.0, "target_min_gpa": 3.0},
        "objective": "minimize_burnout",
    })
    assert r.status_code == 404
