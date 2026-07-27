from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Response

from shared.auth import AuthenticatedPrincipal, Principal
from shared.errors import RateLimitExceededError
from shared.rate_limit import SlidingWindowRateLimiter
from shared.settings import get_settings

_limiter = SlidingWindowRateLimiter()


def get_rate_limiter() -> SlidingWindowRateLimiter:
    return _limiter


async def _enforce(
    response: Response,
    principal: Principal,
    limit: int,
    scope: str,
) -> Principal:
    limiter = get_rate_limiter()
    allowed, remaining, retry_after = await limiter.check(
        identity=f"{scope}:{principal.key_id}", limit=limit
    )
    if not allowed:
        raise RateLimitExceededError(limit=limit, retry_after_seconds=retry_after)

    response.headers["X-RateLimit-Limit"] = str(limit)
    response.headers["X-RateLimit-Remaining"] = str(remaining)
    return principal


async def rate_limited(
    response: Response,
    principal: AuthenticatedPrincipal,
) -> Principal:
    return await _enforce(
        response, principal, get_settings().rate_limit_per_minute, scope="analysis"
    )


async def upload_rate_limited(
    response: Response,
    principal: AuthenticatedPrincipal,
) -> Principal:
    """Uploads carry a tighter budget: parsing is CPU-bound per request."""
    return await _enforce(
        response, principal, get_settings().upload_rate_limit_per_minute, scope="upload"
    )


RateLimitedPrincipal = Annotated[Principal, Depends(rate_limited)]
UploadLimitedPrincipal = Annotated[Principal, Depends(upload_rate_limited)]
