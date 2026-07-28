from __future__ import annotations

import asyncio
import contextlib
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime

from document.domain.jobs import JobQueuePort, JobStorePort, ParseJob

DEFAULT_JOB_TTL_SECONDS = 900.0
DEFAULT_WORKER_COUNT = 2


class InMemoryJobStore(JobStorePort):
    """Single-instance job store.

    Records live in process memory, so a horizontally scaled deployment must
    substitute a Redis-backed adapter; the port keeps that swap mechanical.
    """

    def __init__(self, ttl_seconds: float = DEFAULT_JOB_TTL_SECONDS) -> None:
        self._ttl_seconds = ttl_seconds
        self._jobs: dict[str, ParseJob] = {}
        self._events: dict[str, asyncio.Event] = {}
        self._lock = asyncio.Lock()

    async def create(self, job: ParseJob) -> None:
        async with self._lock:
            self._jobs[job.id] = job
            self._events[job.id] = asyncio.Event()

    async def get(self, job_id: str) -> ParseJob | None:
        async with self._lock:
            return self._jobs.get(job_id)

    async def save(self, job: ParseJob) -> None:
        async with self._lock:
            self._jobs[job.id] = job
            event = self._events.get(job.id)
        if event is not None:
            event.set()
            event.clear()

    async def await_change(self, job_id: str, timeout_seconds: float) -> ParseJob | None:
        async with self._lock:
            event = self._events.get(job_id)
        if event is None:
            return None

        try:
            await asyncio.wait_for(event.wait(), timeout=timeout_seconds)
        except TimeoutError:
            return None
        return await self.get(job_id)

    async def purge_expired(self) -> int:
        """Drops terminal jobs past their TTL so memory does not grow forever."""
        async with self._lock:
            expired = [
                job_id
                for job_id, job in self._jobs.items()
                if job.status.is_terminal and self._age_seconds(job) > self._ttl_seconds
            ]
            for job_id in expired:
                del self._jobs[job_id]
                self._events.pop(job_id, None)
        return len(expired)

    def _age_seconds(self, job: ParseJob) -> float:
        updated = datetime.fromisoformat(job.updated_at)
        return (datetime.now(UTC) - updated).total_seconds()


JobRunner = Callable[[str, bytes, str], Awaitable[None]]


class AsyncioJobQueue(JobQueuePort):
    """Bounded worker pool fed by an in-process queue.

    Workers are owned by the application lifespan rather than by whichever
    request happened to enqueue the work, so a parse outlives the upload that
    triggered it. Substituting a Celery-backed queue satisfies the same port.
    """

    def __init__(
        self,
        worker_count: int = DEFAULT_WORKER_COUNT,
        on_unexpected_error: Callable[[str, BaseException], Awaitable[None]] | None = None,
    ) -> None:
        self._worker_count = worker_count
        self._on_unexpected_error = on_unexpected_error
        self._runner: JobRunner | None = None
        self._queue: asyncio.Queue[tuple[str, bytes, str]] = asyncio.Queue()
        self._workers: list[asyncio.Task[None]] = []

    def set_runner(self, runner: JobRunner) -> None:
        self._runner = runner

    async def enqueue(self, job_id: str, payload: bytes, filename: str) -> None:
        self._ensure_workers()
        await self._queue.put((job_id, payload, filename))

    def _ensure_workers(self) -> None:
        self._workers = [worker for worker in self._workers if not worker.done()]
        while len(self._workers) < self._worker_count:
            self._workers.append(asyncio.create_task(self._work()))

    async def _work(self) -> None:
        while True:
            job_id, payload, filename = await self._queue.get()
            try:
                runner = self._runner
                if runner is not None:
                    await runner(job_id, payload, filename)
            except Exception as error:
                if self._on_unexpected_error is not None:
                    await self._on_unexpected_error(job_id, error)
            finally:
                self._queue.task_done()

    async def join(self, timeout_seconds: float = 30.0) -> None:
        """Waits for every queued and in-flight job to finish."""
        with contextlib.suppress(TimeoutError):
            await asyncio.wait_for(self._queue.join(), timeout=timeout_seconds)

    async def shutdown(self, timeout_seconds: float = 10.0) -> None:
        await self.join(timeout_seconds)
        for worker in self._workers:
            worker.cancel()
        if self._workers:
            await asyncio.gather(*self._workers, return_exceptions=True)
        self._workers.clear()
