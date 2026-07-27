from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from shared.problem import PROBLEM_CONTENT_TYPE
from shared.rate_limit import SlidingWindowRateLimiter
from tests.conftest import OTHER_KEY, SAMPLE_TEXT, VALID_KEY


def _check(client: TestClient, key: str) -> int:
    return client.post(
        "/v1/plagiarism/checks",
        json={"text": SAMPLE_TEXT},
        headers={"X-API-Key": key},
    ).status_code


def test_requests_beyond_the_budget_are_throttled(secured_client: TestClient) -> None:
    assert [_check(secured_client, VALID_KEY) for _ in range(3)] == [200, 200, 200]
    assert _check(secured_client, VALID_KEY) == 429


def test_throttled_response_is_problem_json_with_retry_after(
    secured_client: TestClient,
) -> None:
    for _ in range(3):
        _check(secured_client, VALID_KEY)

    response = secured_client.post(
        "/v1/plagiarism/checks",
        json={"text": SAMPLE_TEXT},
        headers={"X-API-Key": VALID_KEY},
    )

    assert response.status_code == 429
    assert response.headers["content-type"].startswith(PROBLEM_CONTENT_TYPE)
    assert int(response.headers["retry-after"]) > 0
    body = response.json()
    assert body["title"] == "Rate limit exceeded"
    assert body["limit_per_minute"] == 3


def test_budgets_are_tracked_per_key(secured_client: TestClient) -> None:
    for _ in range(3):
        _check(secured_client, VALID_KEY)
    assert _check(secured_client, VALID_KEY) == 429

    assert _check(secured_client, OTHER_KEY) == 200


def test_upload_scope_has_its_own_tighter_budget(secured_client: TestClient) -> None:
    for _ in range(3):
        _check(secured_client, VALID_KEY)

    def upload() -> int:
        return secured_client.post(
            "/v1/documents",
            files={"file": ("paper.txt", SAMPLE_TEXT.encode(), "text/plain")},
            headers={"X-API-Key": VALID_KEY},
        ).status_code

    assert upload() == 201
    assert upload() == 201
    assert upload() == 429


async def test_limiter_allows_up_to_limit_then_blocks() -> None:
    limiter = SlidingWindowRateLimiter()

    first = await limiter.check("caller", limit=2)
    second = await limiter.check("caller", limit=2)
    third = await limiter.check("caller", limit=2)

    assert first == (True, 1, 0)
    assert second == (True, 0, 0)
    assert third[0] is False
    assert third[2] > 0


async def test_limiter_window_expiry_frees_budget() -> None:
    limiter = SlidingWindowRateLimiter(window_seconds=0)

    assert (await limiter.check("caller", limit=1))[0] is True
    assert (await limiter.check("caller", limit=1))[0] is True


async def test_limiter_isolates_identities() -> None:
    limiter = SlidingWindowRateLimiter()

    assert (await limiter.check("a", limit=1))[0] is True
    assert (await limiter.check("a", limit=1))[0] is False
    assert (await limiter.check("b", limit=1))[0] is True


async def test_prune_drops_stale_identities() -> None:
    limiter = SlidingWindowRateLimiter(window_seconds=0)
    await limiter.check("stale", limit=5)

    await limiter.prune()

    assert (await limiter.check("stale", limit=1))[0] is True


@pytest.mark.parametrize("limit", [1, 5, 20])
async def test_limiter_honours_configured_limit(limit: int) -> None:
    limiter = SlidingWindowRateLimiter()

    allowed = [(await limiter.check("caller", limit=limit))[0] for _ in range(limit + 1)]

    assert allowed.count(True) == limit
    assert allowed[-1] is False
