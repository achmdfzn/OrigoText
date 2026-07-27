from __future__ import annotations

from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

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
