"""
Canvas LMS API Client.

Fetches a student's active course enrollments from a Canvas LMS instance
and maps them to the Academic Digital Twin course schema with estimated
difficulty and workload values.

Reference:
  Canvas REST API v1 — https://canvas.instructure.com/doc/api/courses
"""

import re
import ipaddress
import socket
import time
from urllib.parse import urlsplit, urljoin

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


class CanvasConnectionError(ValueError):
    """Safe, actionable message for the import UI; never includes the token."""


def normalize_canvas_url(value: str) -> str:
    """Accept a Canvas page link or hostname, returning its HTTPS origin."""
    value = value.strip()
    if not value or any(c.isspace() for c in value) or "\\" in value:
        raise CanvasConnectionError("Open Canvas in your browser and paste the address of your dashboard or a course page.")
    if "://" not in value:
        value = "https://" + value
    try:
        parsed = urlsplit(value)
        host = (parsed.hostname or "").encode("idna").decode("ascii").lower().rstrip(".")
        port = parsed.port
    except (ValueError, UnicodeError):
        raise CanvasConnectionError("That link is not a valid Canvas address. Copy it from your browser after signing in to Canvas.") from None
    if (parsed.scheme not in ("http", "https") or parsed.username or parsed.password
            or port not in (None, 443) or "." not in host
            or not re.fullmatch(r"[a-z0-9.-]+", host)):
        raise CanvasConnectionError("Use the HTTPS link to your Canvas dashboard, not your school's general website or sign-in portal.")
    try:
        ipaddress.ip_address(host)
    except ValueError:
        pass
    else:
        raise CanvasConnectionError("Use your school's public Canvas website address, not an IP address.")
    return f"https://{host}"


def _check_public_host(origin: str) -> None:
    """Do not send credentials to loopback, private, or link-local services."""
    try:
        addresses = socket.getaddrinfo(urlsplit(origin).hostname, 443, type=socket.SOCK_STREAM)
    except OSError:
        raise CanvasConnectionError("We couldn't find that Canvas website. Open Canvas, wait until you see your courses, and copy that page's address.") from None
    if not addresses or any(not ipaddress.ip_address(item[4][0]).is_global for item in addresses):
        raise CanvasConnectionError("Use a public Canvas website address. Local or private network addresses are not supported.")


def fetch_canvas_courses(canvas_url: str, token: str) -> list[CanvasCourse]:
    origin = normalize_canvas_url(canvas_url)
    token = token.strip()
    if token.lower() == "bearer":
        token = ""
    elif token.lower().startswith("bearer "):
        token = token[7:].strip()
    if not token or any(c.isspace() for c in token) or not token.isascii():
        raise CanvasConnectionError("Paste the complete Canvas access token, without spaces or line breaks. This is not your Canvas password.")
    _check_public_host(origin)
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    params = {"enrollment_state": "active", "enrollment_type": "student", "per_page": 100}
    courses: list[CanvasCourse] = []
    seen_courses: set[int] = set()
    seen_pages: set[str] = set()
    url = f"{origin}/api/v1/courses"
    deadline = time.monotonic() + 45

    # Never forward a token to a different host through redirects or pagination.
    with httpx.Client(timeout=15.0, follow_redirects=False) as client:
        while url:
            parsed = urlsplit(url)
            if (parsed.scheme != "https" or parsed.netloc != urlsplit(origin).netloc
                    or parsed.username or parsed.password or parsed.path != "/api/v1/courses"):
                raise CanvasConnectionError("Canvas returned a link to a different website. Open your Canvas dashboard and retry using the address shown there.")
            if url in seen_pages or len(seen_pages) >= 20 or time.monotonic() >= deadline:
                raise CanvasConnectionError("Canvas took too long to return all courses. Please try again in a moment.")
            seen_pages.add(url)
            try:
                response = client.get(url, headers=headers, params=params,
                                      timeout=max(1, min(15, deadline - time.monotonic())))
            except httpx.TimeoutException:
                raise CanvasConnectionError("Canvas did not respond in time. Please try again in a moment.") from None
            except httpx.RequestError:
                raise CanvasConnectionError("We couldn't connect to that Canvas website. Check that the pasted link opens your Canvas dashboard, then try again.") from None

            if response.status_code == 401:
                raise CanvasConnectionError("Canvas didn't accept this token for the website you entered. Copy a link from the same Canvas account where you created the token. If those match, the token may be expired or revoked.")
            if response.status_code == 403:
                raise CanvasConnectionError("Canvas denied permission to read your courses. Your school may restrict API access or this token's course permissions. Contact your school's Canvas support.")
            if response.status_code in (404, 422):
                raise CanvasConnectionError("We couldn't find the Canvas course API at that website. Paste a link from your Canvas dashboard or a course page after signing in, not the school's general website.")
            if response.status_code == 429:
                raise CanvasConnectionError("Canvas is limiting requests. Wait a minute, then try again.")
            if response.is_redirect:
                raise CanvasConnectionError("That address redirects to another page or a sign-in screen. Open Canvas in your browser, sign in, and paste the final dashboard or course-page link.")
            if response.is_error:
                raise CanvasConnectionError("Canvas is temporarily unavailable. Try again later; your token may still be valid.")
            try:
                data = response.json()
            except ValueError:
                raise CanvasConnectionError("That website returned a web page instead of Canvas courses. Paste a link from your Canvas dashboard after signing in.") from None
            if not isinstance(data, list) or any(not isinstance(raw, dict) for raw in data):
                raise CanvasConnectionError("Canvas returned an unexpected course response. Please try again or contact your school's Canvas support.")

            for raw in data:
                # Restricted/unpublished entries may contain only an ID. Do not
                # reject readable courses just because workflow_state is omitted.
                if raw.get("workflow_state") not in (None, "available") or not raw.get("name"):
                    continue
                canvas_id = raw.get("id")
                if not isinstance(canvas_id, int) or canvas_id in seen_courses:
                    continue
                credits = raw.get("credits_by_completion") or raw.get("credit_hours") or 3
                try:
                    credits = max(1, min(int(float(credits)), 6))
                except (TypeError, ValueError, OverflowError):
                    credits = 3
                code = raw.get("course_code") or ""
                courses.append(CanvasCourse(
                    canvas_id=canvas_id, name=raw["name"], course_code=code,
                    credits=credits, difficulty_score=_estimate_difficulty(code),
                    weekly_workload_hours=_estimate_workload(credits),
                ))
                seen_courses.add(canvas_id)
            next_link = _parse_next_link(response.headers.get("Link", ""))
            url = urljoin(url, next_link) if next_link else None
            params = None  # preserve the next-page query exactly as supplied by Canvas
    return courses


def _parse_next_link(link_header: str) -> str | None:
    """
    Extract the 'next' URL from a Canvas Link response header.

    Canvas uses RFC 5988 link relations, e.g.:
      <https://school.instructure.com/api/v1/courses?page=2&per_page=50>; rel="next"
    """
    for part in link_header.split(","):
        part = part.strip()
        if 'rel="next"' in part:
            url_part = part.split(";")[0].strip()
            return url_part.strip("<>")
    return None
