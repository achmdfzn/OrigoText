from __future__ import annotations


class TransportError(Exception):
    """Base class for errors translated into RFC 7807 responses at the edge."""

    status: int = 400
    slug: str = "request-failed"
    title: str = "Request failed"


class AuthenticationError(TransportError):
    status = 401
    slug = "unauthenticated"
    title = "Authentication required"


class RateLimitExceededError(TransportError):
    status = 429
    slug = "rate-limit-exceeded"
    title = "Rate limit exceeded"

    def __init__(self, limit: int, retry_after_seconds: int) -> None:
        self.limit = limit
        self.retry_after_seconds = retry_after_seconds
        super().__init__(
            f"Exceeded {limit} requests per minute. Retry in {retry_after_seconds}s."
        )
