"""Exercise real bearer authentication; no authentication dependency overrides."""
from datetime import datetime, timedelta, timezone

import pytest
from jose import jwt

from app.core.config import get_settings
from app.core.security import create_access_token, create_email_verify_token, create_reset_token, hash_password
from app.models.student import Student
from app.models.course import Course
from app.models.simulation import SimulationRun


@pytest.fixture(scope="module")
def password_hash():
    return hash_password("test-password")


@pytest.fixture
def accounts(db, password_hash):
    owner = Student(name="Owner", email="owner@example.com", password_hash=password_hash)
    other = Student(name="Other", email="other@example.com", password_hash=password_hash)
    db.add_all([owner, other])
    db.flush()
    course = Course(student_id=owner.id, name="Math", credits=3, difficulty_score=5,
                    weekly_workload_hours=5, assessment_structure={})
    run = SimulationRun(student_id=owner.id, scenario_config={}, results={"note": "private"})
    db.add_all([course, run])
    db.commit()
    return owner, other, course, run


def headers(student):
    return {"Authorization": "Bearer " + create_access_token(student.id, student.email, student.password_hash)}


CASES = [
    ("GET", "/students/{sid}", None),
    ("PUT", "/students/{sid}", {"name": "Attacker"}),
    ("DELETE", "/students/{sid}", None),
    ("POST", "/students/{sid}/send-summary", None),
    ("GET", "/students/{sid}/courses", None),
    ("POST", "/students/{sid}/courses", {"name": "Extra", "credits": 3, "difficulty_score": 5, "weekly_workload_hours": 5, "assessment_structure": {}}),
    ("DELETE", "/courses/{cid}", None),
    ("GET", "/simulations/student/{sid}", None),
    ("GET", "/simulations/{rid}", None),
    ("DELETE", "/simulations/{rid}", None),
    ("GET", "/simulations/{rid}/note", None),
    ("POST", "/simulations/{rid}/note", {"note": "Attacker"}),
    ("GET", "/simulations/{rid}/tags", None),
    ("POST", "/simulations/{rid}/tags", {"tags": ["Attacker"]}),
    ("GET", "/simulations/{rid}/actual-grades", None),
    ("POST", "/simulations/{rid}/actual-grades", {"grades": []}),
    ("POST", "/simulations/run", "scenario"),
    ("POST", "/simulations/monte-carlo", "monte"),
    ("POST", "/scenarios/optimize", {}),
    ("POST", "/advisor/goal-target", {"target_gpa": 3}),
    ("POST", "/advisor/chat", {"messages": []}),
    ("POST", "/canvas/preview", {"canvas_url": "https://example.com", "canvas_token": "unused"}),
    ("POST", "/auth/send-verification", {}),
    ("POST", "/auth/change-password", {"current_password": "test-password", "new_password": "attacker-password"}),
    ("POST", "/students/feedback", {"message": "test", "page": "/"}),
]


@pytest.mark.parametrize("authenticated", [False, True], ids=["anonymous", "other-account"])
@pytest.mark.parametrize("method,path,body", CASES)
def test_private_routes_reject_nonowners(client, db, accounts, authenticated, method, path, body):
    owner, other, course, run = accounts
    scenario = {"student_id": owner.id, "num_weeks": 4, "work_hours_per_week": 10,
                "sleep_target_hours": 7, "study_strategy": "spaced"}
    if body == "scenario":
        body = scenario
    elif body == "monte":
        body = {"scenario_config": scenario, "monte_carlo": {"runs": 10}}
    elif isinstance(body, dict):
        body = {**body, "student_id": owner.id}
    response = client.request(method, "/api/v1" + path.format(sid=owner.id, cid=course.id, rid=run.id),
                              json=body, headers=headers(other) if authenticated else {})
    assert response.status_code == (404 if authenticated else 401), response.text
    if not authenticated:
        assert response.headers["www-authenticate"] == "Bearer"
    db.expire_all()
    assert db.get(Student, owner.id).name == "Owner"
    assert db.get(Course, course.id) is not None
    assert db.get(SimulationRun, run.id).results == {"note": "private"}


def test_admin_access_is_server_controlled(client, accounts, monkeypatch):
    owner, other, _, _ = accounts
    assert client.get("/api/v1/students/").status_code == 401
    assert client.get("/api/v1/students/", headers=headers(other)).status_code == 403
    payload = {"name": "Legacy", "email": "legacy@example.com"}
    assert client.post("/api/v1/students/", json=payload, headers=headers(other)).status_code == 403
    monkeypatch.setattr(get_settings(), "ADMIN_STUDENT_IDS", str(other.id))
    assert len(client.get("/api/v1/students/", headers=headers(other)).json()) == 2
    assert client.get(f"/api/v1/students/{owner.id}", headers=headers(other)).status_code == 200
    assert client.post("/api/v1/students/", json=payload, headers=headers(other)).status_code == 201


def test_advisor_rejects_foreign_simulation_even_for_own_profile(client, accounts):
    _, other, _, run = accounts
    response = client.post("/api/v1/advisor/chat", headers=headers(other), json={
        "student_id": other.id, "simulation_id": run.id, "messages": []})
    assert response.status_code == 404


def test_owner_can_read_and_write_private_metadata(client, accounts):
    owner, _, _, run = accounts
    for resource, payload in [("note", {"note": "Updated"}), ("tags", {"tags": ["study"]}), ("actual-grades", {"grades": []})]:
        url = f"/api/v1/simulations/{run.id}/{resource}"
        assert client.post(url, json=payload, headers=headers(owner)).status_code == 200
        result = client.get(url, headers=headers(owner))
        assert result.status_code == 200
        for key, value in payload.items():
            assert result.json()[key] == value


@pytest.mark.parametrize("kind", ["verification", "reset", "invalid", "expired", "bad-sub", "legacy"])
def test_only_access_tokens_authenticate(client, accounts, kind):
    owner, _, _, _ = accounts
    if kind == "verification":
        token = create_email_verify_token(owner.id)
    elif kind == "reset":
        token = create_reset_token(owner.email, owner.password_hash)
    elif kind == "invalid":
        token = "not-a-token"
    else:
        payload = {"sub": str(owner.id), "type": "access", "exp": datetime.now(timezone.utc) + timedelta(hours=1)}
        if kind == "expired":
            payload["exp"] = datetime.now(timezone.utc) - timedelta(hours=1)
        elif kind == "bad-sub":
            payload["sub"] = "invalid-id"
        elif kind == "legacy":
            del payload["type"]
        token = jwt.encode(payload, get_settings().SECRET_KEY, algorithm="HS256")
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_reset_token_is_single_use_and_revokes_access(client, accounts):
    owner, _, _, _ = accounts
    old_headers = headers(owner)
    token = create_reset_token(owner.email, owner.password_hash)
    payload = {"token": token, "new_password": "new-password"}
    assert client.post("/api/v1/auth/reset-password", json=payload).status_code == 200
    assert client.post("/api/v1/auth/reset-password", json=payload).status_code == 400
    assert client.get("/api/v1/auth/me", headers=old_headers).status_code == 401
    login = client.post("/api/v1/auth/login", json={"email": owner.email, "password": "new-password"})
    assert login.status_code == 200
    assert client.get("/api/v1/auth/me", headers={"Authorization": "Bearer " + login.json()["access_token"]}).status_code == 200


def test_password_change_revokes_tokens(client, accounts):
    owner, _, _, _ = accounts
    old_headers = headers(owner)
    reset = create_reset_token(owner.email, owner.password_hash)
    assert client.post("/api/v1/auth/change-password", headers=old_headers, json={
        "student_id": owner.id, "current_password": "test-password", "new_password": "new-password"}).status_code == 200
    assert client.get("/api/v1/auth/me", headers=old_headers).status_code == 401
    assert client.post("/api/v1/auth/reset-password", json={"token": reset, "new_password": "different-password"}).status_code == 400


def test_deleted_account_and_query_tokens_cannot_authenticate(client, accounts):
    owner, _, _, _ = accounts
    auth_headers = headers(owner)
    assert client.get("/api/v1/auth/me", params={"token": auth_headers["Authorization"][7:]}).status_code == 401
    assert client.delete(f"/api/v1/students/{owner.id}", headers=auth_headers).status_code == 204
    assert client.get("/api/v1/auth/me", headers=auth_headers).status_code == 401
