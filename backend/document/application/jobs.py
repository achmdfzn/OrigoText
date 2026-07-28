from __future__ import annotations

import hashlib
from collections.abc import AsyncIterator
from datetime import UTC, datetime

from document.domain.errors import (
    CorruptDocumentError,
    DocumentError,
    EmptyFileError,
    FileTooLargeError,
    NoExtractableTextError,
    UnsupportedFormatError,
)
from document.domain.jobs import (
    JobFailure,
    JobQueuePort,
    JobStage,
    JobStatus,
    JobStorePort,
    ParseJob,
    progress_for,
)
from document.domain.models import ParseResult
from document.domain.ports import DocumentParsingPort
from shared.logging import log_event

STREAM_POLL_SECONDS = 15.0

_FAILURE_MAPPING: dict[type[DocumentError], tuple[str, str, int]] = {
    FileTooLargeError: ("file-too-large", "File too large", 413),
    UnsupportedFormatError: ("unsupported-format", "Unsupported document format", 415),
    NoExtractableTextError: ("no-extractable-text", "No extractable text", 422),
    EmptyFileError: ("unreadable-document", "Unreadable document", 400),
    CorruptDocumentError: ("unreadable-document", "Unreadable document", 400),
}


def _now() -> str:
    return datetime.now(UTC).isoformat()


def failure_for(error: DocumentError) -> JobFailure:
    slug, title, status = _FAILURE_MAPPING.get(
        type(error), ("parse-failed", "Document could not be parsed", 400)
    )
    return JobFailure(slug=slug, title=title, detail=str(error), status=status)


class DocumentJobService:
    """Accepts uploads, dispatches parse work, and exposes job progress.

    Requests return as soon as the job is queued, so a slow document never
    occupies a request handler for the length of the parse.
    """

    def __init__(
        self,
        parser: DocumentParsingPort,
        store: JobStorePort,
        queue: JobQueuePort,
    ) -> None:
        self._parser = parser
        self._store = store
        self._queue = queue

    async def submit(self, payload: bytes, filename: str) -> ParseJob:
        timestamp = _now()
        job = ParseJob(
            id=f"job_{hashlib.sha256(f'{filename}:{timestamp}'.encode()).hexdigest()[:16]}",
            filename=filename,
            byte_size=len(payload),
            status=JobStatus.QUEUED,
            stage=JobStage.QUEUED,
            progress=progress_for(JobStage.QUEUED),
            submitted_at=timestamp,
            updated_at=timestamp,
            result=None,
            failure=None,
        )
        await self._store.create(job)
        await self._queue.enqueue(job.id, payload, filename)
        return job

    async def get(self, job_id: str) -> ParseJob | None:
        return await self._store.get(job_id)

    async def run(self, job_id: str, payload: bytes, filename: str) -> None:
        """Executes a queued job, recording each stage as it advances."""
        job = await self._store.get(job_id)
        if job is None:
            return

        for stage in (JobStage.DETECTING, JobStage.EXTRACTING, JobStage.SANITIZING):
            job = job.model_copy(
                update={
                    "status": JobStatus.RUNNING,
                    "stage": stage,
                    "progress": progress_for(stage),
                    "updated_at": _now(),
                }
            )
            await self._store.save(job)

        try:
            result: ParseResult = await self._parser.parse(payload=payload, filename=filename)
        except DocumentError as error:
            await self._store.save(
                job.model_copy(
                    update={
                        "status": JobStatus.FAILED,
                        "stage": JobStage.DONE,
                        "progress": progress_for(JobStage.DONE),
                        "updated_at": _now(),
                        "failure": failure_for(error),
                    }
                )
            )
            return

        await self._store.save(
            job.model_copy(
                update={
                    "status": JobStatus.COMPLETED,
                    "stage": JobStage.DONE,
                    "progress": progress_for(JobStage.DONE),
                    "updated_at": _now(),
                    "result": result,
                }
            )
        )

    async def stream(self, job_id: str) -> AsyncIterator[ParseJob]:
        """Yields the job on every change until it reaches a terminal state."""
        job = await self._store.get(job_id)
        if job is None:
            return

        yield job
        while not job.status.is_terminal:
            changed = await self._store.await_change(job_id, STREAM_POLL_SECONDS)
            if changed is None:
                return
            job = changed
            yield job

    async def mark_crashed(self, job_id: str, error: BaseException) -> None:
        """Records an unexpected worker failure so a job never hangs as running.

        The message is deliberately generic: internal exception text may expose
        implementation detail and must not reach an API consumer.
        """
        job = await self._store.get(job_id)
        if job is None or job.status.is_terminal:
            return

        await self._store.save(
            job.model_copy(
                update={
                    "status": JobStatus.FAILED,
                    "stage": JobStage.DONE,
                    "progress": progress_for(JobStage.DONE),
                    "updated_at": _now(),
                    "failure": JobFailure(
                        slug="parse-crashed",
                        title="Document could not be parsed",
                        detail="An unexpected error occurred while parsing this document.",
                        status=500,
                    ),
                }
            )
        )
        log_event(
            "document.job.crashed",
            job_id=job_id,
            error_type=type(error).__name__,
        )
