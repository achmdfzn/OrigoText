from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from main import app
from shared.dependencies import get_rate_limiter
from shared.problem import PROBLEM_CONTENT_TYPE
from shared.settings import Settings, get_settings

VALID_KEY = "k" * 40
OTHER_KEY = "j" * 40

SAMPLE_TEXT = (
    "Retrieval-augmented generation grounds a generative model in an external corpus "
    "so that every response can cite the evidence it relied upon during generation."
)


@pytest.fixture(autouse=True)
def reset_limiter() -> Iterator[None]:
    yield
    import asyncio

    asyncio.run(get_rate_limiter().reset())


@pytest.fixture
def secured_client() -> Iterator[TestClient]:
    get_settings.cache_clear()
    app.dependency_overrides = {}

    def secured_settings() -> Settings:
        return Settings(
            environment="production",
            api_keys=f"{VALID_KEY},{OTHER_KEY}",
            rate_limit_per_minute=3,
            upload_rate_limit_per_minute=2,
        )

    import shared.auth as auth_module
    import shared.dependencies as dependencies_module

    original = get_settings
    auth_module.get_settings = secured_settings
    dependencies_module.get_settings = secured_settings
    try:
        yield TestClient(app)
    finally:
        auth_module.get_settings = original
        dependencies_module.get_settings = original
        get_settings.cache_clear()


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


def test_request_with_valid_api_key_succeeds(secured_client: TestClient) -> None:
    response = secured_client.post(
        "/v1/plagiarism/checks",
        json={"text": SAMPLE_TEXT},
        headers={"X-API-Key": VALID_KEY},
    )

    assert response.status_code == 200
    assert response.headers["x-ratelimit-limit"] == "3"


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
