from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ai_detection.interface.router import router as ai_detection_router
from plagiarism.interface.router import router as plagiarism_router

app = FastAPI(
    title="OrigoText API",
    version="0.1.0",
    description="Academic Intelligence Platform — plagiarism and AI-detection services",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(plagiarism_router)
app.include_router(ai_detection_router)


@app.get("/healthz", tags=["ops"])
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/readyz", tags=["ops"])
async def readyz() -> dict[str, str]:
    return {"status": "ready"}
