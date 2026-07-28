from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Request

from document.application.jobs import DocumentJobService
from document.domain.jobs import JobStorePort
from document.infrastructure.jobs import AsyncioJobQueue

JOB_SERVICE_STATE = "document_job_service"
JOB_STORE_STATE = "document_job_store"
JOB_QUEUE_STATE = "document_job_queue"


def get_job_service(request: Request) -> DocumentJobService:
    """Reads the job service from application state.

    The service and its queue are created by the application lifespan so worker
    tasks are bound to the serving event loop rather than to whichever request
    happened to construct them.
    """
    service = getattr(request.app.state, JOB_SERVICE_STATE, None)
    if not isinstance(service, DocumentJobService):
        raise RuntimeError("Document job service is not initialized on application state.")
    return service


def job_store_of(app_state: object) -> JobStorePort:
    store = getattr(app_state, JOB_STORE_STATE, None)
    if not isinstance(store, JobStorePort):
        raise RuntimeError("Document job store is not initialized on application state.")
    return store


def job_queue_of(app_state: object) -> AsyncioJobQueue:
    queue = getattr(app_state, JOB_QUEUE_STATE, None)
    if not isinstance(queue, AsyncioJobQueue):
        raise RuntimeError("Document job queue is not initialized on application state.")
    return queue


JobService = Annotated[DocumentJobService, Depends(get_job_service)]
