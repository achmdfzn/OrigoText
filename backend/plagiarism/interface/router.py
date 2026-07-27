from __future__ import annotations

import hashlib

from fastapi import APIRouter, status
from pydantic import BaseModel, Field

from plagiarism.application.service import LexicalPlagiarismService
from plagiarism.domain.models import PlagiarismReport
from plagiarism.infrastructure.corpus import InMemoryCorpus
from shared.dependencies import RateLimitedPrincipal
from shared.logging import log_event
from shared.problem import problem_responses

router = APIRouter(prefix="/v1/plagiarism", tags=["plagiarism"])

_service = LexicalPlagiarismService(corpus=InMemoryCorpus())


class CheckRequest(BaseModel):
    text: str = Field(min_length=50, max_length=200_000)
    document_title: str = Field(default="Untitled", max_length=255)


@router.post(
    "/checks",
    response_model=PlagiarismReport,
    status_code=status.HTTP_200_OK,
    summary="Run a plagiarism check against the licensed corpus",
    responses=problem_responses(),
)
async def create_check(
    body: CheckRequest,
    principal: RateLimitedPrincipal,
) -> PlagiarismReport:
    document_id = hashlib.sha1(
        body.text[:200].encode(), usedforsecurity=False
    ).hexdigest()[:16]
    report = await _service.check(
        document_id=document_id,
        text=body.text,
        document_title=body.document_title,
    )
    log_event(
        "plagiarism.check.completed",
        key_id=principal.key_id,
        report_id=report.id,
        word_count=report.word_count,
        risk_level=report.risk_level.value,
        source_count=len(report.sources),
    )
    return report
