from __future__ import annotations

from abc import ABC, abstractmethod
from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, Field

from document.domain.models import ParseResult


class JobStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

    @property
    def is_terminal(self) -> bool:
        return self in {JobStatus.COMPLETED, JobStatus.FAILED}


class JobStage(StrEnum):
    QUEUED = "queued"
    DETECTING = "detecting_format"
    EXTRACTING = "extracting_text"
    SANITIZING = "sanitizing"
    STRUCTURING = "structuring"
    DONE = "done"


class JobFailure(BaseModel):
    model_config = {"frozen": True}

    slug: str
    title: str
    detail: str
    status: Annotated[int, Field(ge=400, le=599)]


class ParseJob(BaseModel):
    """Lifecycle record for one asynchronous parse request."""

    model_config = {"frozen": True}

    id: str
    filename: str
    byte_size: Annotated[int, Field(ge=0)]
    status: JobStatus
    stage: JobStage
    progress: Annotated[float, Field(ge=0.0, le=1.0)]
    submitted_at: str
    updated_at: str
    result: ParseResult | None
    failure: JobFailure | None


_STAGE_PROGRESS: dict[JobStage, float] = {
    JobStage.QUEUED: 0.0,
    JobStage.DETECTING: 0.2,
    JobStage.EXTRACTING: 0.5,
    JobStage.SANITIZING: 0.7,
    JobStage.STRUCTURING: 0.9,
    JobStage.DONE: 1.0,
}


def progress_for(stage: JobStage) -> float:
    return _STAGE_PROGRESS[stage]


class JobStorePort(ABC):
    """Persistence for job lifecycle records.

    The in-process adapter keeps jobs in memory; a Redis adapter satisfies the
    same contract without touching the application layer.
    """

    @abstractmethod
    async def create(self, job: ParseJob) -> None: ...

    @abstractmethod
    async def get(self, job_id: str) -> ParseJob | None: ...

    @abstractmethod
    async def save(self, job: ParseJob) -> None: ...

    @abstractmethod
    async def await_change(self, job_id: str, timeout_seconds: float) -> ParseJob | None:
        """Blocks until the job changes or the timeout elapses.

        Lets the transport stream progress without polling in a tight loop.
        """

    @abstractmethod
    async def purge_expired(self) -> int:
        """Drops terminal jobs past their retention window; returns how many."""


class JobQueuePort(ABC):
    """Dispatch for parse work.

    The in-process adapter runs work on the running event loop; a Celery adapter
    would enqueue a task instead.
    """

    @abstractmethod
    async def enqueue(self, job_id: str, payload: bytes, filename: str) -> None: ...
