from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import UTC, datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from document.application.jobs import DocumentJobService
from document.domain.jobs import JobStage, JobStatus, ParseJob
from document.infrastructure.factory import build_job_service
from document.infrastructure.postgres_jobs import (
    PostgresJobStore,
    PostgresPayloadStore,
    content_digest,
)
from shared.schema import metadata
from tests.fixtures import docx_bytes


@pytest.fixture
async def engine() -> AsyncIterator[AsyncEngine]:
    """SQLite stands in for PostgreSQL so the suite needs no live database.

    The schema uses `JSON().with_variant(JSONB)`, so the same tables build on
    both backends and the repository logic under test is identical.
    """
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(metadata.create_all)
    try:
        yield engine
    finally:
        await engine.dispose()


async def _run_to_completion(service: DocumentJobService, job_id: str) -> None:
    job = await service.get(job_id)
    assert job is not None
    await service.run(job_id, docx_bytes(), job.filename)


async def test_job_survives_a_new_store_instance(engine: AsyncEngine) -> None:
    service, _, _ = build_job_service(PostgresJobStore(engine))
    submitted = await service.submit(docx_bytes(), "paper.docx")
    await _run_to_completion(service, submitted.id)

    reopened = PostgresJobStore(engine)
    job = await reopened.get(submitted.id)

    assert job is not None
    assert job.status is JobStatus.COMPLETED
    assert job.result is not None
    assert job.result.metadata.title == "Parsing Probe"
    assert job.result.chunks


async def test_unknown_job_is_absent(engine: AsyncEngine) -> None:
    assert await PostgresJobStore(engine).get("job_missing") is None


async def test_save_is_idempotent_for_repeated_stages(engine: AsyncEngine) -> None:
    store = PostgresJobStore(engine)
    service, _, _ = build_job_service(store)
    submitted = await service.submit(docx_bytes(), "paper.docx")

    await store.save(submitted)
    await store.save(submitted)

    assert await store.get(submitted.id) is not None


async def test_failed_job_persists_typed_failure(engine: AsyncEngine) -> None:
    store = PostgresJobStore(engine)
    service, _, _ = build_job_service(store)
    submitted = await service.submit(b"\x7fELF\x02\x01\x01\x00", "payload.bin")

    await service.run(submitted.id, b"\x7fELF\x02\x01\x01\x00", "payload.bin")
    job = await store.get(submitted.id)

    assert job is not None
    assert job.status is JobStatus.FAILED
    assert job.failure is not None
    assert job.failure.slug == "unsupported-format"
    assert job.failure.status == 415
    assert job.result is None


async def test_purge_expired_removes_only_terminal_jobs(engine: AsyncEngine) -> None:
    store = PostgresJobStore(engine, ttl_seconds=-1.0)
    service, _, _ = build_job_service(store)

    queued = ParseJob(
        id="job_still_queued",
        filename="queued.docx",
        byte_size=10,
        status=JobStatus.QUEUED,
        stage=JobStage.QUEUED,
        progress=0.0,
        submitted_at=datetime.now(UTC).isoformat(),
        updated_at=datetime.now(UTC).isoformat(),
        result=None,
        failure=None,
    )
    await store.create(queued)

    finished = await service.submit(docx_bytes(), "finished.docx")
    await _run_to_completion(service, finished.id)

    purged = await store.purge_expired()

    assert purged == 1
    assert await store.get(finished.id) is None
    assert await store.get(queued.id) is not None


async def test_payload_store_round_trips_bytes(engine: AsyncEngine) -> None:
    store = PostgresPayloadStore(engine)
    payload = docx_bytes()

    document_id = await store.put("paper.docx", payload)

    assert document_id == f"doc_{content_digest(payload)[:16]}"
    assert await store.get(document_id) == payload


async def test_payload_store_deduplicates_identical_uploads(engine: AsyncEngine) -> None:
    store = PostgresPayloadStore(engine)
    payload = docx_bytes()

    first = await store.put("a.docx", payload)
    second = await store.put("b.docx", payload)

    assert first == second


async def test_payload_store_returns_none_for_unknown_document(engine: AsyncEngine) -> None:
    assert await PostgresPayloadStore(engine).get("doc_missing") is None


async def test_identical_documents_in_separate_jobs_both_persist(engine: AsyncEngine) -> None:
    """Result ids derive from content, so two jobs on the same bytes must coexist."""
    store = PostgresJobStore(engine)
    service, _, _ = build_job_service(store)

    first = await service.submit(docx_bytes(), "first.docx")
    second = await service.submit(docx_bytes(), "second.docx")
    await _run_to_completion(service, first.id)
    await _run_to_completion(service, second.id)

    first_job = await store.get(first.id)
    second_job = await store.get(second.id)

    assert first_job is not None and first_job.result is not None
    assert second_job is not None and second_job.result is not None
    assert first_job.result.id == second_job.result.id
    assert first_job.id != second_job.id
