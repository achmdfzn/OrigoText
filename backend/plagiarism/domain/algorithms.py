from __future__ import annotations

import re

from plagiarism.domain.models import RiskLevel

SHINGLE_SIZE = 5
SIMILARITY_THRESHOLD = 0.15
MIN_SENTENCE_LENGTH = 20

_WORD = re.compile(r"\b\w+\b")
_SENTENCE = re.compile(r"[^.!?]+[.!?]?")

_RISK_BANDS: tuple[tuple[float, RiskLevel], ...] = (
    (0.75, RiskLevel.CRITICAL),
    (0.5, RiskLevel.HIGH),
    (0.25, RiskLevel.MEDIUM),
    (0.1, RiskLevel.LOW),
)


def tokenize(text: str) -> list[str]:
    return _WORD.findall(text.lower())


def shingles(tokens: list[str], k: int) -> set[str]:
    """Overlapping k-word shingles.

    Shingles stay as strings rather than `hash()` values so fingerprints are
    reproducible across processes; Python randomizes string hashing per run.
    """
    return {" ".join(tokens[i : i + k]) for i in range(max(0, len(tokens) - k + 1))}


def jaccard(a: set[str], b: set[str]) -> float:
    union = len(a | b)
    return len(a & b) / union if union else 0.0


def risk_level(similarity: float) -> RiskLevel:
    for lower_bound, level in _RISK_BANDS:
        if similarity >= lower_bound:
            return level
    return RiskLevel.NONE


def sentences_with_offsets(text: str) -> list[tuple[int, int, str]]:
    return [
        (match.start(), match.end(), stripped)
        for match in _SENTENCE.finditer(text)
        if len(stripped := match.group().strip()) > MIN_SENTENCE_LENGTH
    ]
