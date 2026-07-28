from __future__ import annotations

import asyncio

import pytest

from document.application.jobs import DocumentJobService
from document.domain.jobs import JobStage, JobStatus, progress_for
from document.infrastructure.factory import build_job_service
from document.infrastructure.jobs import AsyncioJobQueue, InMemoryJobStore
from tests.fixtures import docx_bytes


@pytest.fixture
def wiring() -> tuple[DocumentJobService, InMemoryJobStore, AsyncioJobQueue]:
    return build_job_service()


async def _drain(service: DocumentJobService, job_id: str) -> None:
    for _ in range(200):
        job = await service.get(job_id)
        if job is not None and job.status.is_terminal:
            return
        await asyncio.sleep(0.01)
    raise AssertionError(f"job {job_id} never reached a terminal state")


async def test_submit_returns_queued_job_immediately(
    wiring: tuple[DocumentJobService, InMemoryJobStore, AsyncioJobQueue],
) -> None:
    service, _, _ = wiring

    job = await service.submit(docx_bytes(), "paper.docx")

    assert job.status is JobStatus.QUEUED
    assert job.stage is JobStage.QUEUED
    assert job.progress == 0.0
    assert job.result is None
    assert job.failure is None
    assert job.id.startswith("job_")


async def test_job_completes_with_parse_result(
    wiring: tuple[DocumentJobService, InMemoryJobStore, AsyncioJobQueue],
) -> None:
    service, _, _ = wiring

    submitted = await service.submit(docx_bytes(), "paper.docx")
    await _drain(service, submitted.id)
    job = await service.get(submitted.id)

    assert job is not None
    assert job.status is JobStatus.COMPLETED
    assert job.progress == 1.0
    assert job.result is not None
    assert job.result.metadata.title == "Parsing Probe"
    assert job.failure is None


async def test_failed_parse_records_typed_failure(
    wiring: tuple[DocumentJobService, InMemoryJobStore, AsyncioJobQueue],
) -> None:
    service, _, _ = wiring

    submitted = await service.submit(b"\x7fELF\x02\x01\x01\x00", "payload.bin")
    await _drain(service, submitted.id)
    job = await service.get(submitted.id)

    assert job is not None
    assert job.status is JobStatus.FAILED
    assert job.result is None
    assert job.failure is not None
    assert job.failure.slug == "unsupported-format"
    assert job.failure.status == 415


async def test_unknown_job_is_absent(
    wiring: tuple[DocumentJobService, InMemoryJobStore, AsyncioJobQueue],
) -> None:
    service, _, _ = wiring
    assert await service.get("job_missing") is None


async def test_stream_yields_progress_and_ends_terminal(
    wiring: tuple[DocumentJobService, InMemoryJobStore, AsyncioJobQueue],
) -> None:
    service, _, _ = wiring
    submitted = await service.submit(docx_bytes(), "paper.docx")

    observed = [job async for job in service.stream(submitted.id)]

    assert observed[0].status is JobStatus.QUEUED
    assert observed[-1].status.is_terminal
    assert observed[-1].progress == 1.0
    assert [job.progress for job in observed] == sorted(job.progress for job in observed)


async def test_stream_of_unknown_job_is_empty(
    wiring: tuple[DocumentJobService, InMemoryJobStore, AsyncioJobQueue],
) -> None:
    service, _, _ = wiring
    assert [job async for job in service.stream("job_missing")] == []


async def test_store_await_change_times_out_without_updates() -> None:
    store = InMemoryJobStore()
    service, _, _ = build_job_service()
    job = await service.submit(b"a" * 100, "paper.txt")
    await store.create(job)

    assert await store.await_change(job.id, timeout_seconds=0.05) is None


async def test_purge_expired_drops_only_terminal_jobs() -> None:
    store = InMemoryJobStore(ttl_seconds=-1.0)
    service, own_store, _ = build_job_service()
    submitted = await service.submit(docx_bytes(), "paper.docx")
    await _drain(service, submitted.id)

    terminal = await service.get(submitted.id)
    assert terminal is not None
    await store.create(terminal)
    await store.save(terminal)

    assert await store.purge_expired() == 1
    assert await store.get(terminal.id) is None
    assert await own_store.get(terminal.id) is not None


async def test_queue_bounds_concurrency() -> None:
    active = 0
    peak = 0

    async def runner(job_id: str, payload: bytes, filename: str) -> None:
        nonlocal active, peak
        del job_id, payload, filename
        active += 1
        peak = max(peak, active)
        await asyncio.sleep(0.02)
        active -= 1

    queue = AsyncioJobQueue(worker_count=2)
    queue.set_runner(runner)

    for index in range(6):
        await queue.enqueue(f"job_{index}", b"payload", "paper.txt")
    await queue.shutdown()

    assert peak <= 2


async def test_worker_crash_marks_job_failed_without_leaking_detail() -> None:
    service, store, queue = build_job_service()

    async def explode(job_id: str, payload: bytes, filename: str) -> None:
        del job_id, payload, filename
        raise ZeroDivisionError("internal detail that must not surface")

    queue.set_runner(explode)
    submitted = await service.submit(b"a" * 200, "paper.txt")
    await queue.join()

    job = await store.get(submitted.id)
    assert job is not None
    assert job.status is JobStatus.FAILED
    assert job.failure is not None
    assert job.failure.slug == "parse-crashed"
    assert "internal detail" not in job.failure.detail


async def test_progress_is_monotonic_across_stages() -> None:
    stages = [
        JobStage.QUEUED,
        JobStage.DETECTING,
        JobStage.EXTRACTING,
        JobStage.SANITIZING,
        JobStage.STRUCTURING,
        JobStage.DONE,
    ]
    values = [progress_for(stage) for stage in stages]

    assert values == sorted(values)
    assert values[0] == 0.0
    assert values[-1] == 1.0
