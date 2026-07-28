from __future__ import annotations

import asyncio
import contextlib
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ai_detection.interface.router import router as ai_detection_router
from document.domain.jobs import JobStorePort
from document.infrastructure.factory import build_job_service
from document.infrastructure.postgres_jobs import PostgresJobStore, PostgresPayloadStore
from document.interface.dependencies import (
    JOB_QUEUE_STATE,
    JOB_SERVICE_STATE,
    JOB_STORE_STATE,
)
from document.interface.router import router as document_router
from plagiarism.interface.router import router as plagiarism_router
from shared.database import build_engine, install_selector_loop_policy
from shared.dependencies import get_rate_limiter
from shared.errors import TransportError
from shared.logging import log_event
from shared.problem import transport_error_handler
from shared.settings import get_settings

JOB_REAP_INTERVAL_SECONDS = 300

_startup_settings = get_settings()
_startup_settings.require_valid_configuration()

if _startup_settings.has_database:
    install_selector_loop_policy()


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    """Owns the job pipeline so workers live on the serving event loop.

    Settings are resolved here rather than at import time so tests and
    deployments can select storage without reloading the module.
    """
    settings = get_settings()
    engine = build_engine(settings.database_url) if settings.has_database else None
    store: JobStorePort | None = PostgresJobStore(engine) if engine is not None else None
    service, store, queue = build_job_service(store)
    log_event("document.jobs.storage", durable=engine is not None)
    setattr(application.state, JOB_SERVICE_STATE, service)
    setattr(application.state, JOB_STORE_STATE, store)
    setattr(application.state, JOB_QUEUE_STATE, queue)

    reaper = asyncio.create_task(_reap_expired_jobs(store))
    try:
        yield
    finally:
        reaper.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await reaper
        await queue.shutdown()
        await get_rate_limiter().reset()
        if engine is not None:
            await engine.dispose()


async def _reap_expired_jobs(store: JobStorePort) -> None:
    """Periodically drops terminal jobs so retention stays bounded."""
    while True:
        await asyncio.sleep(JOB_REAP_INTERVAL_SECONDS)
        purged = await store.purge_expired()
        if purged > 0:
            log_event("document.jobs.purged", count=purged)


app = FastAPI(
    title="OrigoText API",
    version="0.1.0",
    description="Academic Intelligence Platform — document, plagiarism, and AI-detection services",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_startup_settings.parsed_allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Accept", "X-API-Key"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "Retry-After"],
)

app.add_exception_handler(TransportError, transport_error_handler)

app.include_router(document_router)
app.include_router(plagiarism_router)
app.include_router(ai_detection_router)


@app.get("/healthz", tags=["ops"])
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/readyz", tags=["ops"])
async def readyz() -> dict[str, str]:
    return {"status": "ready"}
