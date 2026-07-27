from __future__ import annotations

import hashlib

from fastapi import APIRouter, status
from pydantic import BaseModel, Field

from ai_detection.application.service import LexicalAiDetectionService
from ai_detection.domain.models import DetectionResult
from shared.dependencies import RateLimitedPrincipal
from shared.logging import log_event
from shared.problem import problem_responses

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
    description=(
        "Returns a calibrated probability with confidence. Results are "
        "probabilistic and must never be treated as proof of authorship."
    ),
    responses=problem_responses(),
)
async def analyze(
    body: DetectRequest,
    principal: RateLimitedPrincipal,
) -> DetectionResult:
    document_id = hashlib.sha1(
        body.text[:200].encode(), usedforsecurity=False
    ).hexdigest()[:16]
    result = await _service.detect(
        document_id=document_id,
        text=body.text,
        document_title=body.document_title,
    )
    log_event(
        "ai_detection.analysis.completed",
        key_id=principal.key_id,
        result_id=result.id,
        word_count=result.word_count,
        verdict=result.verdict.value,
        sentence_count=len(result.sentences),
    )
    return result
