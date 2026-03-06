"""
Canvas LMS API Client.

Fetches a student's active course enrollments from a Canvas LMS instance
and maps them to the Academic Digital Twin course schema with estimated
difficulty and workload values.

Reference:
  Canvas REST API v1 — https://canvas.instructure.com/doc/api/courses
"""

import re

import httpx
from pydantic import BaseModel


class CanvasCourse(BaseModel):
    canvas_id: int
    name: str
    course_code: str
    credits: int = 3
    difficulty_score: float = 5.0
    weekly_workload_hours: float = 3.0


class CanvasImportPreview(BaseModel):
    courses: list[CanvasCourse]
    count: int


def _estimate_difficulty(course_code: str) -> float:
    """
    Estimate difficulty score (1–10) from the course code level number.

    Convention used at most universities:
      100-level → introductory (3–4)
      200-level → sophomore    (4–5)
      300-level → junior       (6–7)
      400-level → senior       (7–8)
      500+      → graduate     (8–9)
    """
    numbers = re.findall(r"\d+", course_code)
    if numbers:
        level = int(numbers[0])
        if level >= 500:
            return 9.0
        elif level >= 400:
            return 8.0
        elif level >= 300:
            return 7.0
        elif level >= 200:
            return 5.0
        else:
            return 4.0
    return 5.0


def _estimate_workload(credits: int) -> float:
    """
    Estimate weekly workload hours using the Carnegie Unit standard:
    2 hours of out-of-class work per credit hour per week.
    """
    return float(credits * 2)


def fetch_canvas_courses(canvas_url: str, token: str) -> list[CanvasCourse]:
    """
    Fetch active student course enrollments from a Canvas LMS instance.

    Args:
        canvas_url: Base URL of the Canvas instance
                    (e.g. https://school.instructure.com).
        token:      Canvas personal access token.

    Returns:
        List of CanvasCourse objects with estimated difficulty/workload.

    Raises:
        ValueError: On authentication failure or invalid Canvas URL.
        httpx.HTTPStatusError: On unexpected HTTP errors.
        httpx.RequestError: On network / connection errors.
    """
    canvas_url = canvas_url.rstrip("/")

    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "enrollment_state": "active",
        "enrollment_type": "student",
        "per_page": 50,
    }

    with httpx.Client(timeout=15.0) as client:
        try:
            response = client.get(
                f"{canvas_url}/api/v1/courses",
                headers=headers,
                params=params,
            )
        except httpx.RequestError as exc:
            raise httpx.RequestError(
                f"Could not reach Canvas at {canvas_url}. "
                "Check the URL and your network connection."
            ) from exc

    if response.status_code == 401:
        raise ValueError(
            "Invalid Canvas token. Generate a new one at: "
            "Canvas → Account → Settings → New Access Token."
        )
    if response.status_code in (404, 422):
        raise ValueError(
            f"Canvas URL not found ({canvas_url}). "
            "Verify your institution's Canvas base URL."
        )

    response.raise_for_status()

    courses: list[CanvasCourse] = []
    for raw in response.json():
        # Skip courses that aren't actively available
        if raw.get("workflow_state") not in ("available",):
            continue

        name = raw.get("name", "Unnamed Course")
        code = raw.get("course_code", "")

        # Canvas sometimes surfaces credit info — use it when present
        credits = raw.get("credits_by_completion") or raw.get("credit_hours") or 3
        try:
            credits = int(float(credits))
        except (TypeError, ValueError):
            credits = 3
        credits = max(1, min(credits, 6))

        difficulty = _estimate_difficulty(code)
        workload = _estimate_workload(credits)

        courses.append(
            CanvasCourse(
                canvas_id=raw["id"],
                name=name,
                course_code=code,
                credits=credits,
                difficulty_score=difficulty,
                weekly_workload_hours=workload,
            )
        )

    return courses
