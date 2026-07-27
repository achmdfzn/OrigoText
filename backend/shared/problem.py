from __future__ import annotations

from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from shared.errors import AuthenticationError, RateLimitExceededError, TransportError

API_KEY_HEADER_NAME = "X-API-Key"
PROBLEM_CONTENT_TYPE = "application/problem+json"
_PROBLEM_BASE_URI = "https://origotext.dev/problems"


class Problem(BaseModel):
    """RFC 7807 problem detail."""

    type: str
    title: str
    status: int
    detail: str
    instance: str | None = None


def problem_response(
    request: Request,
    *,
    slug: str,
    title: str,
    status: int,
    detail: str,
    extra: dict[str, Any] | None = None,
) -> JSONResponse:
    body: dict[str, Any] = {
        "type": f"{_PROBLEM_BASE_URI}/{slug}",
        "title": title,
        "status": status,
        "detail": detail,
        "instance": str(request.url.path),
    }
    if extra is not None:
        body.update(extra)
    return JSONResponse(status_code=status, content=body, media_type=PROBLEM_CONTENT_TYPE)


def transport_error_handler(request: Request, error: Exception) -> JSONResponse:
    """Translates domain-agnostic transport errors into RFC 7807 responses."""
    if not isinstance(error, TransportError):
        raise error

    extra: dict[str, Any] = {}
    headers: dict[str, str] = {}

    if isinstance(error, AuthenticationError):
        headers["WWW-Authenticate"] = f'ApiKey header="{API_KEY_HEADER_NAME}"'
    if isinstance(error, RateLimitExceededError):
        extra["limit_per_minute"] = error.limit
        extra["retry_after_seconds"] = error.retry_after_seconds
        headers["Retry-After"] = str(error.retry_after_seconds)

    response = problem_response(
        request,
        slug=error.slug,
        title=error.title,
        status=error.status,
        detail=str(error),
        extra=extra or None,
    )
    response.headers.update(headers)
    return response


_PROBLEM_CONTENT: dict[str, dict[str, Any]] = {PROBLEM_CONTENT_TYPE: {}}

AUTH_PROBLEM_RESPONSES: dict[int | str, dict[str, Any]] = {
    401: {"description": "Missing or invalid API key", "content": _PROBLEM_CONTENT},
    429: {"description": "Rate limit exceeded", "content": _PROBLEM_CONTENT},
}


def problem_responses(**descriptions: str) -> dict[int | str, dict[str, Any]]:
    """Builds OpenAPI response entries that all render as problem+json."""
    return {
        **AUTH_PROBLEM_RESPONSES,
        **{
            int(status_code.lstrip("_")): {
                "description": description,
                "content": _PROBLEM_CONTENT,
            }
            for status_code, description in descriptions.items()
        },
    }
