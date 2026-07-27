from __future__ import annotations

from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, Field


class SentenceLabel(StrEnum):
    HUMAN = "human"
    MIXED = "mixed"
    AI = "ai"


class Verdict(StrEnum):
    HUMAN = "human"
    UNCERTAIN = "uncertain"
    MIXED = "mixed"
    LIKELY_AI = "likely_ai"
    AI = "ai"


class FeatureSignal(BaseModel):
    model_config = {"frozen": True}

    id: str
    label: str
    value: Annotated[float, Field(ge=0.0, le=1.0)]
    description: str
    leans_toward: SentenceLabel


class SentencePrediction(BaseModel):
    model_config = {"frozen": True}

    id: str
    text: str
    ai_probability: Annotated[float, Field(ge=0.0, le=1.0)]


class SuspectedModel(BaseModel):
    model_config = {"frozen": True}

    family: str
    affinity: Annotated[float, Field(ge=0.0, le=1.0)]


class DetectionResult(BaseModel):
    model_config = {"frozen": True}

    id: str
    document_title: str
    word_count: Annotated[int, Field(ge=0)]
    analyzed_at: str
    ai_probability: Annotated[float, Field(ge=0.0, le=1.0)]
    confidence: Annotated[float, Field(ge=0.0, le=1.0)]
    verdict: Verdict
    perplexity: Annotated[float, Field(ge=0.0)]
    burstiness: Annotated[float, Field(ge=0.0, le=1.0)]
    signals: list[FeatureSignal]
    sentences: list[SentencePrediction]
    suspected_models: list[SuspectedModel]
