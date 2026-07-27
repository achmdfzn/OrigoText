from __future__ import annotations

import asyncio
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from main import app
from shared.dependencies import get_rate_limiter
from shared.settings import Settings, get_settings

VALID_KEY = "k" * 40
OTHER_KEY = "j" * 40

SAMPLE_TEXT = (
    "Retrieval-augmented generation grounds a generative model in an external corpus "
    "so that every response can cite the evidence it relied upon during generation."
)


@pytest.fixture(autouse=True)
def clean_rate_limiter() -> Iterator[None]:
    asyncio.run(get_rate_limiter().reset())
    yield
    asyncio.run(get_rate_limiter().reset())


@pytest.fixture
def client() -> Iterator[TestClient]:
    app.dependency_overrides.clear()
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def secured_client() -> Iterator[TestClient]:
    """A client whose app requires API keys and enforces tight rate limits."""
    settings = Settings(
        environment="production",
        api_keys=f"{VALID_KEY},{OTHER_KEY}",
        rate_limit_per_minute=3,
        upload_rate_limit_per_minute=2,
    )
    app.dependency_overrides[get_settings] = lambda: settings
    yield TestClient(app, raise_server_exceptions=False)
    app.dependency_overrides.clear()
