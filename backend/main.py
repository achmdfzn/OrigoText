from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ai_detection.interface.router import router as ai_detection_router
from document.interface.router import router as document_router
from plagiarism.interface.router import router as plagiarism_router
from shared.errors import TransportError
from shared.problem import transport_error_handler
from shared.settings import get_settings

settings = get_settings()
settings.require_valid_configuration()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    yield
    from shared.dependencies import get_rate_limiter

    await get_rate_limiter().reset()


app = FastAPI(
    title="OrigoText API",
    version="0.1.0",
    description="Academic Intelligence Platform — document, plagiarism, and AI-detection services",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.parsed_allowed_origins,
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
