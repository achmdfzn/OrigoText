from __future__ import annotations

import hashlib

from fastapi import APIRouter, status
from pydantic import BaseModel, Field

from ai_detection.application.service import LexicalAiDetectionService
from ai_detection.domain.models import DetectionResult

router = APIRouter(prefix="/v1/ai-detection", tags=["ai-detection"])

_service = LexicalAiDetectionService()


class DetectRequest(BaseModel):
    text: str = Field(min_length=50, max_length=50_000)
    document_title: str = Field(default="Untitled", max_length=255)


@router.post(
    "/analyze",
    response_model=DetectionResult,
    status_code=status.HTTP_200_OK,
    summary="Analyze text for AI-generated content",
)
async def analyze(body: DetectRequest) -> DetectionResult:
    document_id = hashlib.sha1(body.text[:200].encode()).hexdigest()[:16]
    return await _service.detect(
        document_id=document_id,
        text=body.text,
        document_title=body.document_title,
    )
