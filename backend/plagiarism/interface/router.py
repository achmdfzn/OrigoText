from __future__ import annotations

import hashlib

from fastapi import APIRouter, status
from pydantic import BaseModel, Field

from plagiarism.application.service import LexicalPlagiarismService
from plagiarism.domain.models import PlagiarismReport
from plagiarism.infrastructure.corpus import InMemoryCorpus

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
)
async def create_check(body: CheckRequest) -> PlagiarismReport:
    document_id = hashlib.sha1(body.text[:200].encode()).hexdigest()[:16]
    return await _service.check(
        document_id=document_id,
        text=body.text,
        document_title=body.document_title,
    )
