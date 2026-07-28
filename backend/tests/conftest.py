from __future__ import annotations

import asyncio
import os
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from shared.dependencies import get_rate_limiter
from shared.settings import Settings, get_settings

os.environ["ORIGOTEXT_DATABASE_URL"] = ""
os.environ["ORIGOTEXT_MIGRATION_DATABASE_URL"] = ""

VALID_KEY = "k" * 40
OTHER_KEY = "j" * 40

SAMPLE_TEXT = (
    "Retrieval-augmented generation grounds a generative model in an external corpus "
    "so that every response can cite the evidence it relied upon during generation."
)


@pytest.fixture(autouse=True)
def isolate_database(monkeypatch: pytest.MonkeyPatch) -> None:
    """Keeps the suite off any real database.

    Settings read `backend/.env`, which points at the live project. Tests must
    never write there, so the URLs are cleared and the settings cache dropped.
    """
    monkeypatch.setenv("ORIGOTEXT_DATABASE_URL", "")
    monkeypatch.setenv("ORIGOTEXT_MIGRATION_DATABASE_URL", "")
    get_settings.cache_clear()


@pytest.fixture(autouse=True)
def clean_rate_limiter() -> Iterator[None]:
    asyncio.run(get_rate_limiter().reset())
    yield
    asyncio.run(get_rate_limiter().reset())


@pytest.fixture
def client() -> Iterator[TestClient]:
    """An open client, pinned to development settings."""
    from main import app

    settings = Settings(environment="development", api_keys="", database_url="")
    app.dependency_overrides[get_settings] = lambda: settings
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
def secured_client() -> Iterator[TestClient]:
    """A client whose app requires API keys and enforces tight rate limits."""
    from main import app

    settings = Settings(
        environment="production",
        api_keys=f"{VALID_KEY},{OTHER_KEY}",
        database_url="",
        rate_limit_per_minute=3,
        upload_rate_limit_per_minute=2,
    )
    app.dependency_overrides[get_settings] = lambda: settings
    with TestClient(app, raise_server_exceptions=False) as client:
        yield client
    app.dependency_overrides.clear()
