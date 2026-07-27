from __future__ import annotations

from fastapi.testclient import TestClient

from shared.problem import PROBLEM_CONTENT_TYPE
from tests.conftest import SAMPLE_TEXT, VALID_KEY


def test_request_without_api_key_is_rejected(secured_client: TestClient) -> None:
    response = secured_client.post("/v1/plagiarism/checks", json={"text": SAMPLE_TEXT})

    assert response.status_code == 401
    assert response.headers["content-type"].startswith(PROBLEM_CONTENT_TYPE)
    assert response.headers["www-authenticate"].startswith("ApiKey")
    assert response.json()["title"] == "Authentication required"


def test_request_with_wrong_api_key_is_rejected(secured_client: TestClient) -> None:
    response = secured_client.post(
        "/v1/plagiarism/checks",
        json={"text": SAMPLE_TEXT},
        headers={"X-API-Key": "z" * 40},
    )

    assert response.status_code == 401
    assert "not valid" in response.json()["detail"]


def test_blank_api_key_is_rejected(secured_client: TestClient) -> None:
    response = secured_client.post(
        "/v1/plagiarism/checks",
        json={"text": SAMPLE_TEXT},
        headers={"X-API-Key": "   "},
    )

    assert response.status_code == 401


def test_valid_api_key_succeeds_and_reports_budget(secured_client: TestClient) -> None:
    response = secured_client.post(
        "/v1/plagiarism/checks",
        json={"text": SAMPLE_TEXT},
        headers={"X-API-Key": VALID_KEY},
    )

    assert response.status_code == 200
    assert response.headers["x-ratelimit-limit"] == "3"
    assert response.headers["x-ratelimit-remaining"] == "2"


def test_upload_endpoint_also_requires_a_key(secured_client: TestClient) -> None:
    response = secured_client.post(
        "/v1/documents",
        files={"file": ("paper.txt", b"a" * 200, "text/plain")},
    )

    assert response.status_code == 401


def test_ai_detection_endpoint_also_requires_a_key(secured_client: TestClient) -> None:
    response = secured_client.post("/v1/ai-detection/analyze", json={"text": SAMPLE_TEXT})

    assert response.status_code == 401


def test_error_response_never_echoes_the_supplied_key(secured_client: TestClient) -> None:
    leaked = "s3cret-key-value-that-must-not-appear-anywhere"
    response = secured_client.post(
        "/v1/ai-detection/analyze",
        json={"text": SAMPLE_TEXT},
        headers={"X-API-Key": leaked},
    )

    assert response.status_code == 401
    assert leaked not in response.text


def test_health_endpoints_stay_public(secured_client: TestClient) -> None:
    assert secured_client.get("/healthz").status_code == 200
    assert secured_client.get("/readyz").status_code == 200


def test_development_without_keys_stays_open(client: TestClient) -> None:
    response = client.post("/v1/plagiarism/checks", json={"text": SAMPLE_TEXT})
    assert response.status_code == 200
