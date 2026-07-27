from __future__ import annotations

import asyncio
import time
from collections import defaultdict, deque

WINDOW_SECONDS = 60


class SlidingWindowRateLimiter:
    """Per-identity sliding-window limiter held in process memory.

    Single-instance only: counters are not shared between workers, so a
    horizontally scaled deployment must swap this adapter for Redis. The
    interface is intentionally narrow to make that substitution mechanical.
    """

    def __init__(self, window_seconds: int = WINDOW_SECONDS) -> None:
        self._window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def check(self, identity: str, limit: int) -> tuple[bool, int, int]:
        """Records a hit and reports whether it is allowed.

        Returns `(allowed, remaining, retry_after_seconds)`.
        """
        now = time.monotonic()
        cutoff = now - self._window_seconds

        async with self._lock:
            hits = self._hits[identity]
            while hits and hits[0] <= cutoff:
                hits.popleft()

            if len(hits) >= limit:
                retry_after = max(1, int(hits[0] + self._window_seconds - now) + 1)
                return False, 0, retry_after

            hits.append(now)
            return True, limit - len(hits), 0

    async def prune(self) -> None:
        """Drops identities with no recent hits so memory does not grow forever."""
        cutoff = time.monotonic() - self._window_seconds
        async with self._lock:
            stale = [
                identity
                for identity, hits in self._hits.items()
                if not hits or hits[-1] <= cutoff
            ]
            for identity in stale:
                del self._hits[identity]

    async def reset(self) -> None:
        async with self._lock:
            self._hits.clear()
