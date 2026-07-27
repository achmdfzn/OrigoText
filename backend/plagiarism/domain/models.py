from __future__ import annotations

from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, Field


class RiskLevel(StrEnum):
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class MatchKind(StrEnum):
    VERBATIM = "verbatim"
    NEAR_DUPLICATE = "near_duplicate"
    PARAPHRASE = "paraphrase"
    CROSS_LANGUAGE = "cross_language"
    CITED = "cited"


class SourceRef(BaseModel):
    model_config = {"frozen": True}

    id: str
    title: str
    authors: list[str]
    container: str
    year: int
    doi: str | None
    url: str
    open_access: bool


class MatchedSpan(BaseModel):
    model_config = {"frozen": True}

    id: str
    source_id: str
    submission_text: str
    source_text: str
    submission_start: int
    submission_end: int
    kind: MatchKind
    similarity: Annotated[float, Field(ge=0.0, le=1.0)]
    confidence: Annotated[float, Field(ge=0.0, le=1.0)]


class SourceMatch(BaseModel):
    model_config = {"frozen": True}

    source: SourceRef
    similarity: Annotated[float, Field(ge=0.0, le=1.0)]
    confidence: Annotated[float, Field(ge=0.0, le=1.0)]
    matched_words: Annotated[int, Field(ge=0)]
    spans: list[MatchedSpan]


class PlagiarismReport(BaseModel):
    model_config = {"frozen": True}

    id: str
    document_title: str
    word_count: Annotated[int, Field(ge=0)]
    checked_at: str
    overall_similarity: Annotated[float, Field(ge=0.0, le=1.0)]
    risk_level: RiskLevel
    sources: list[SourceMatch]
    submission_text: str
