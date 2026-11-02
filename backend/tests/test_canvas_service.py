"""Canvas connection tests use synthetic tokens and mocked responses only."""
import socket
import httpx
import pytest
from app.services import canvas_service as canvas

@pytest.fixture
def canvas_http(monkeypatch):
    original_client = httpx.Client
    requests = []
    monkeypatch.setattr(canvas.socket, "getaddrinfo", lambda *a, **kw: [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 443))])
    def install(handler):
        def respond(request):
            requests.append(request)
            return handler(request)
        monkeypatch.setattr(canvas.httpx, "Client", lambda **kw: original_client(transport=httpx.MockTransport(respond), **kw))
        return requests
    return install

@pytest.mark.parametrize("value", ["https://grambling.instructure.com/", "grambling.instructure.com", "  https://grambling.instructure.com/courses/123/assignments?module_item_id=4#top  ", "http://grambling.instructure.com/profile/settings", "https://GRAMBLING.instructure.com:443/"])
def test_accepts_full_canvas_links(value):
    assert canvas.normalize_canvas_url(value) == "https://grambling.instructure.com"

@pytest.mark.parametrize("value", ["", "Grambling State University", "https://localhost", "https://127.0.0.1", "https://[::1]", "ftp://school.example.com", "https://user:secret@school.example.com", "https://school.example.com:8080", "https://school.example.com\\@evil.example.com"])
def test_rejects_invalid_canvas_destinations(value):
    with pytest.raises(canvas.CanvasConnectionError):
        canvas.normalize_canvas_url(value)

def test_full_page_link_token_format_and_pagination(canvas_http):
    def respond(request):
        assert request.url.host == "grambling.instructure.com"
        assert request.url.path == "/api/v1/courses"
        assert request.headers["authorization"] == "Bearer synthetic-token"
        if request.url.params.get("page") == "2":
            assert request.url.params.get("bookmark") == "next"
            return httpx.Response(200, json=[{"id":2,"name":"Writing","course_code":"ENG101"}])
        assert request.url.params["enrollment_type"] == "student"
        return httpx.Response(200, json=[{"id":1,"name":"Math","course_code":"MATH201","workflow_state":"available","credit_hours":4}], headers={"Link": '<https://grambling.instructure.com/api/v1/courses?page=2&bookmark=next>; rel="next"'})
    requests = canvas_http(respond)
    courses = canvas.fetch_canvas_courses("https://grambling.instructure.com/courses/42", "  Bearer synthetic-token  ")
    assert len(requests) == 2
    assert [c.name for c in courses] == ["Math", "Writing"]
    assert courses[0].credits == 4
    assert courses[0].weekly_workload_hours == 8

@pytest.mark.parametrize("status,expected", [(401,"didn't accept"), (403,"denied permission"), (404,"course API"), (422,"course API"), (429,"limiting requests"), (500,"temporarily unavailable"), (302,"redirects")])
def test_actionable_http_errors_without_token_leak(canvas_http, status, expected):
    requests = canvas_http(lambda r: httpx.Response(status, json={"error":"secret-value"}, headers={"Location":"https://other.example.com"}))
    with pytest.raises(canvas.CanvasConnectionError, match=expected) as error:
        canvas.fetch_canvas_courses("grambling.instructure.com", "synthetic-token")
    assert "synthetic-token" not in str(error.value)
    assert "secret-value" not in str(error.value)
    assert len(requests) == 1

def test_html_login_response_is_not_reported_as_invalid_token(canvas_http):
    canvas_http(lambda r: httpx.Response(200, text="<html>Login</html>"))
    with pytest.raises(canvas.CanvasConnectionError, match="web page instead"):
        canvas.fetch_canvas_courses("grambling.instructure.com", "synthetic-token")

@pytest.mark.parametrize("target", ["https://other.example.com/api/v1/courses?page=2", "http://grambling.instructure.com/api/v1/courses?page=2", "https://grambling.instructure.com/api/v1/users"])
def test_pagination_cannot_forward_token_to_another_destination(canvas_http,target):
    requests = canvas_http(lambda r: httpx.Response(200,json=[],headers={"Link":f'<{target}>; rel="next"'}))
    with pytest.raises(canvas.CanvasConnectionError, match="different website"):
        canvas.fetch_canvas_courses("grambling.instructure.com", "synthetic-token")
    assert len(requests) == 1

def test_repeated_pagination_is_bounded(canvas_http):
    requests=canvas_http(lambda r: httpx.Response(200,json=[],headers={"Link":'<https://grambling.instructure.com/api/v1/courses>; rel="next"'}))
    with pytest.raises(canvas.CanvasConnectionError, match="too long"):
        canvas.fetch_canvas_courses("grambling.instructure.com", "synthetic-token")
    assert len(requests)==1

def test_private_dns_address_is_rejected_before_sending_token(canvas_http, monkeypatch):
    requests=canvas_http(lambda r: httpx.Response(200,json=[]))
    monkeypatch.setattr(canvas.socket,"getaddrinfo",lambda *a,**kw:[(socket.AF_INET,socket.SOCK_STREAM,6,"",("10.0.0.1",443))])
    with pytest.raises(canvas.CanvasConnectionError, match="private network"):
        canvas.fetch_canvas_courses("school.example.com", "synthetic-token")
    assert not requests

@pytest.mark.parametrize("token", ["", "Bearer ", "a\nb", "some token", "token\u200b"])
def test_badly_pasted_token_is_rejected_before_network(canvas_http, token):
    requests=canvas_http(lambda r: httpx.Response(200,json=[]))
    with pytest.raises(canvas.CanvasConnectionError, match="complete Canvas access token"):
        canvas.fetch_canvas_courses("grambling.instructure.com", token)
    assert not requests

def test_filters_unpublished_and_restricted_courses_but_accepts_missing_state(canvas_http):
    canvas_http(lambda r: httpx.Response(200,json=[{"id":1,"name":"Current","course_code":"BIO101"},{"id":1,"name":"Duplicate"},{"id":2,"name":"Old","workflow_state":"completed"},{"id":3,"name":"Draft","workflow_state":"unpublished"},{"id":4}]))
    assert [c.name for c in canvas.fetch_canvas_courses("grambling.instructure.com","synthetic-token")] == ["Current"]

def test_connection_timeout_is_actionable(canvas_http):
    def respond(request):
        raise httpx.ReadTimeout("sensitive internal error",request=request)
    canvas_http(respond)
    with pytest.raises(canvas.CanvasConnectionError, match="did not respond in time"):
        canvas.fetch_canvas_courses("grambling.instructure.com","synthetic-token")
