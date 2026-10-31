from fastapi.testclient import TestClient

from main import app, create_app


client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_api_info_and_openapi():
    response = client.get("/api/v1")
    assert response.status_code == 200
    assert response.json()["api_version"] == "1.0.0"

    schema = client.get("/openapi.json")
    assert schema.status_code == 200
    assert "/api/v1/example" in schema.json()["paths"]


def test_example_search_rejects_long_query():
    assert client.get("/api/v1/example", params={"q": "x" * 101}).status_code == 422


def test_cors_uses_explicit_origin_allowlist(monkeypatch):
    monkeypatch.setenv("API_CORS_ORIGINS", "https://mobile.example")
    cors_client = TestClient(create_app())
    allowed = cors_client.options(
        "/api/v1/example",
        headers={
            "Origin": "https://mobile.example",
            "Access-Control-Request-Method": "GET",
        },
    )
    denied = cors_client.options(
        "/api/v1/example",
        headers={
            "Origin": "https://unlisted.example",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert allowed.headers.get("access-control-allow-origin") == "https://mobile.example"
    assert denied.headers.get("access-control-allow-origin") is None
