from __future__ import annotations

import asyncio
import hashlib
from datetime import UTC, datetime

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from document.domain.jobs import JobFailure, JobStatus, JobStorePort, ParseJob
from document.domain.models import DocumentFormat, DocumentMetadata, ParseResult
from shared.schema import document_payloads, documents, parse_jobs, parse_results

DEFAULT_JOB_TTL_SECONDS = 900.0
_CHANGE_POLL_SECONDS = 0.25


def _as_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value)


def _as_iso(value: datetime) -> str:
    return value.astimezone(UTC).isoformat()


def content_digest(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def _result_to_row(job_id: str, result: ParseResult) -> dict[str, object]:
    return {
        "id": result.id,
        "job_id": job_id,
        "filename": result.filename,
        "document_format": result.document_format.value,
        "byte_size": result.byte_size,
        "parsed_at": _as_datetime(result.parsed_at),
        "metadata_json": result.metadata.model_dump(),
        "text": result.text,
        "word_count": result.word_count,
        "character_count": result.character_count,
        "sections": [section.model_dump() for section in result.sections],
        "chunks": [chunk.model_dump() for chunk in result.chunks],
        "truncated": 1 if result.truncated else 0,
        "warnings": list(result.warnings),
    }


def _row_to_result(row: object) -> ParseResult:
    mapping = dict(row._mapping)  # type: ignore[attr-defined]
    stored_id = str(mapping["id"])
    return ParseResult(
        id=stored_id.rpartition(":")[2] or stored_id,
        filename=str(mapping["filename"]),
        document_format=DocumentFormat(mapping["document_format"]),
        byte_size=int(mapping["byte_size"]),
        parsed_at=_as_iso(mapping["parsed_at"]),
        metadata=DocumentMetadata.model_validate(mapping["metadata_json"]),
        text=str(mapping["text"]),
        word_count=int(mapping["word_count"]),
        character_count=int(mapping["character_count"]),
        sections=list(mapping["sections"]),
        chunks=list(mapping["chunks"]),
        truncated=bool(mapping["truncated"]),
        warnings=list(mapping["warnings"]),
    )


class PostgresJobStore(JobStorePort):
    """Durable job store backed by PostgreSQL.

    Jobs survive process restarts, which the in-memory adapter cannot offer.
    Change notification is polled rather than pushed: `LISTEN`/`NOTIFY` needs a
    dedicated session that Supabase's transaction pooler does not provide.
    """

    def __init__(self, engine: AsyncEngine, ttl_seconds: float = DEFAULT_JOB_TTL_SECONDS) -> None:
        self._engine = engine
        self._ttl_seconds = ttl_seconds

    async def create(self, job: ParseJob) -> None:
        async with self._engine.begin() as conn:
            await conn.execute(parse_jobs.insert().values(self._job_values(job)))

    async def get(self, job_id: str) -> ParseJob | None:
        async with self._engine.connect() as conn:
            job_row = (
                await conn.execute(select(parse_jobs).where(parse_jobs.c.id == job_id))
            ).one_or_none()
            if job_row is None:
                return None
            result_row = (
                await conn.execute(select(parse_results).where(parse_results.c.job_id == job_id))
            ).one_or_none()

        mapping = dict(job_row._mapping)
        failure = mapping["failure"]
        return ParseJob(
            id=str(mapping["id"]),
            filename=str(mapping["filename"]),
            byte_size=int(mapping["byte_size"]),
            status=JobStatus(mapping["status"]),
            stage=mapping["stage"],
            progress=float(mapping["progress"]),
            submitted_at=_as_iso(mapping["submitted_at"]),
            updated_at=_as_iso(mapping["updated_at"]),
            result=_row_to_result(result_row) if result_row is not None else None,
            failure=JobFailure.model_validate(failure) if failure is not None else None,
        )


    def _job_values(self, job: ParseJob) -> dict[str, object]:
        return {
            "id": job.id,
            "filename": job.filename,
            "byte_size": job.byte_size,
            "status": job.status.value,
            "stage": job.stage.value,
            "progress": job.progress,
            "submitted_at": _as_datetime(job.submitted_at),
            "updated_at": _as_datetime(job.updated_at),
            "failure": job.failure.model_dump() if job.failure is not None else None,
        }

    async def save(self, job: ParseJob) -> None:
        values = self._job_values(job)
        async with self._engine.begin() as conn:
            statement = pg_insert(parse_jobs).values(values)
            await conn.execute(
                statement.on_conflict_do_update(
                    index_elements=[parse_jobs.c.id],
                    set_={
                        key: statement.excluded[key]
                        for key in ("status", "stage", "progress", "updated_at", "failure")
                    },
                )
            )
            if job.result is not None:
                await self._upsert_result(conn, job.id, job.result)

    async def _upsert_result(
        self, conn: AsyncConnection, job_id: str, result: ParseResult
    ) -> None:
        """Writes the parse result, keyed by job rather than by content.

        A result id is derived from the document's content hash, so two jobs
        parsing identical bytes would collide on the primary key. Each job owns
        exactly one row, so the row id is namespaced by job id instead.
        """
        values = _result_to_row(job_id, result)
        values["id"] = f"{job_id}:{values['id']}"[:64]
        statement = pg_insert(parse_results).values(values)
        await conn.execute(
            statement.on_conflict_do_update(
                index_elements=[parse_results.c.job_id],
                set_={
                    key: statement.excluded[key]
                    for key in values
                    if key not in {"id", "job_id"}
                },
            )
        )

    async def await_change(self, job_id: str, timeout_seconds: float) -> ParseJob | None:
        baseline = await self.get(job_id)
        if baseline is None:
            return None

        deadline = asyncio.get_running_loop().time() + timeout_seconds
        while asyncio.get_running_loop().time() < deadline:
            await asyncio.sleep(_CHANGE_POLL_SECONDS)
            current = await self.get(job_id)
            if current is None:
                return None
            if current.updated_at != baseline.updated_at or current.status != baseline.status:
                return current
        return None

    async def purge_expired(self) -> int:
        cutoff = datetime.now(UTC).timestamp() - self._ttl_seconds
        cutoff_at = datetime.fromtimestamp(cutoff, tz=UTC)
        async with self._engine.begin() as conn:
            result = await conn.execute(
                delete(parse_jobs).where(
                    parse_jobs.c.status.in_(("completed", "failed")),
                    parse_jobs.c.updated_at < cutoff_at,
                )
            )
        return int(result.rowcount or 0)


class PostgresPayloadStore:
    """Stores uploaded bytes so a job no longer depends on process memory.

    Payloads live in the database for now; object storage is the eventual home
    and would replace this adapter without touching the job pipeline.
    """

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    async def put(self, filename: str, payload: bytes) -> str:
        digest = content_digest(payload)
        document_id = f"doc_{digest[:16]}"
        async with self._engine.begin() as conn:
            document_statement = pg_insert(documents).values(
                id=document_id,
                filename=filename,
                byte_size=len(payload),
                content_sha256=digest,
            )
            await conn.execute(
                document_statement.on_conflict_do_nothing(index_elements=[documents.c.id])
            )
            payload_statement = pg_insert(document_payloads).values(
                document_id=document_id, payload=payload
            )
            await conn.execute(
                payload_statement.on_conflict_do_nothing(
                    index_elements=[document_payloads.c.document_id]
                )
            )
        return document_id

    async def get(self, document_id: str) -> bytes | None:
        async with self._engine.connect() as conn:
            row = (
                await conn.execute(
                    select(document_payloads.c.payload).where(
                        document_payloads.c.document_id == document_id
                    )
                )
            ).one_or_none()
        return bytes(row[0]) if row is not None else None
