from __future__ import annotations

import hashlib
import math
import re
from datetime import UTC, datetime

from ai_detection.domain.models import (
    DetectionResult,
    FeatureSignal,
    SentenceLabel,
    SentencePrediction,
    SuspectedModel,
    Verdict,
)
from ai_detection.domain.ports import AiDetectionPort


def _tokenize(text: str) -> list[str]:
    return re.findall(r"\b\w+\b", text.lower())


def _sentences(text: str) -> list[str]:
    return [
        s.strip()
        for s in re.split(r"(?<=[.!?])\s+", text)
        if len(s.strip()) > 20
    ]


def _entropy(tokens: list[str]) -> float:
    if not tokens:
        return 0.0
    freq: dict[str, int] = {}
    for t in tokens:
        freq[t] = freq.get(t, 0) + 1
    n = len(tokens)
    return -sum((c / n) * math.log2(c / n) for c in freq.values())


def _type_token_ratio(tokens: list[str]) -> float:
    return len(set(tokens)) / len(tokens) if tokens else 0.0


def _sentence_length_variance(sentences: list[str]) -> float:
    lengths = [len(_tokenize(s)) for s in sentences]
    if len(lengths) < 2:
        return 0.0
    mean = sum(lengths) / len(lengths)
    variance = sum((length - mean) ** 2 for length in lengths) / len(lengths)
    return math.sqrt(variance)


def _burstiness(sentences: list[str]) -> float:
    variance = _sentence_length_variance(sentences)
    return round(max(0.0, min(1.0, 1.0 - variance / 20.0)), 4)


def _perplexity_proxy(tokens: list[str]) -> float:
    entropy = _entropy(tokens)
    return round(2 ** entropy, 2)


def _ai_probability_for_sentence(sentence: str, doc_tokens: list[str]) -> float:
    tokens = _tokenize(sentence)
    if not tokens:
        return 0.5
    ttr = _type_token_ratio(tokens)
    shared = len(set(tokens) & set(doc_tokens)) / len(set(tokens)) if tokens else 0
    raw = (1 - ttr) * 0.5 + shared * 0.3 + 0.2
    return round(min(max(raw, 0.0), 1.0), 4)


def _verdict(probability: float) -> Verdict:
    if probability >= 0.8:
        return Verdict.AI
    if probability >= 0.6:
        return Verdict.LIKELY_AI
    if probability >= 0.4:
        return Verdict.MIXED
    if probability >= 0.2:
        return Verdict.UNCERTAIN
    return Verdict.HUMAN


class LexicalAiDetectionService(AiDetectionPort):
    async def detect(
        self,
        document_id: str,
        text: str,
        document_title: str,
    ) -> DetectionResult:
        tokens = _tokenize(text)
        sentences = _sentences(text)
        word_count = len(tokens)
        ttr = _type_token_ratio(tokens)
        burstiness = _burstiness(sentences)
        perplexity = _perplexity_proxy(tokens)

        sentence_predictions = [
            SentencePrediction(
                id=f"sent_{i + 1}",
                text=s,
                ai_probability=_ai_probability_for_sentence(s, tokens),
            )
            for i, s in enumerate(sentences)
        ]

        ai_probability = (
            sum(sp.ai_probability for sp in sentence_predictions) / len(sentence_predictions)
            if sentence_predictions
            else 0.5
        )
        ai_probability = round(ai_probability, 4)

        signals: list[FeatureSignal] = [
            FeatureSignal(
                id="perplexity",
                label="Perplexity",
                value=round(min(perplexity / 50.0, 1.0), 4),
                description="Low perplexity indicates highly predictable text.",
                leans_toward=SentenceLabel.AI if perplexity < 25 else SentenceLabel.HUMAN,
            ),
            FeatureSignal(
                id="burstiness",
                label="Burstiness",
                value=burstiness,
                description="Low burstiness indicates uniform sentence structure.",
                leans_toward=SentenceLabel.AI if burstiness > 0.6 else SentenceLabel.HUMAN,
            ),
            FeatureSignal(
                id="ttr",
                label="Lexical diversity",
                value=round(ttr, 4),
                description="Type-token ratio measures vocabulary richness.",
                leans_toward=SentenceLabel.HUMAN if ttr > 0.5 else SentenceLabel.MIXED,
            ),
        ]

        return DetectionResult(
            id=f"det_{hashlib.sha1(document_id.encode()).hexdigest()[:8]}",
            document_title=document_title,
            word_count=word_count,
            analyzed_at=datetime.now(UTC).isoformat(),
            ai_probability=ai_probability,
            confidence=round(min(0.5 + abs(ai_probability - 0.5), 1.0), 4),
            verdict=_verdict(ai_probability),
            perplexity=perplexity,
            burstiness=burstiness,
            signals=signals,
            sentences=sentence_predictions,
            suspected_models=[
                SuspectedModel(family="GPT-family", affinity=round(ai_probability * 0.8, 4)),
                SuspectedModel(family="Claude-family", affinity=round(ai_probability * 0.6, 4)),
            ],
        )
