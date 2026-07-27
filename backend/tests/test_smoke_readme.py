from __future__ import annotations

from fastapi.testclient import TestClient

from tests.conftest import SAMPLE_TEXT


def test_health_and_readiness_respond(client: TestClient) -> None:
    assert client.get("/healthz").json() == {"status": "ok"}
    assert client.get("/readyz").json() == {"status": "ready"}


def test_openapi_schema_is_served(client: TestClient) -> None:
    schema = client.get("/openapi.json").json()

    assert schema["info"]["title"] == "OrigoText API"
    assert set(schema["paths"]) >= {
        "/v1/documents",
        "/v1/plagiarism/checks",
        "/v1/ai-detection/analyze",
    }
    assert "APIKeyHeader" in schema["components"]["securitySchemes"]


def test_full_pipeline_upload_check_detect(client: TestClient) -> None:
    parsed = client.post(
        "/v1/documents",
        files={"file": ("submission.txt", SAMPLE_TEXT.encode(), "text/plain")},
    )
    assert parsed.status_code == 201
    text = parsed.json()["text"]

    report = client.post("/v1/plagiarism/checks", json={"text": text})
    assert report.status_code == 200
    assert "risk_level" in report.json()

    detection = client.post("/v1/ai-detection/analyze", json={"text": text})
    assert detection.status_code == 200
    assert "verdict" in detection.json()
