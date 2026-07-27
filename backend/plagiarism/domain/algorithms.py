from __future__ import annotations

import re

SHINGLE_SIZE = 5
SIMILARITY_THRESHOLD = 0.15


def tokenize(text: str) -> list[str]:
    return re.findall(r"\b\w+\b", text.lower())


def shingles(tokens: list[str], k: int) -> set[str]:
    return {
        " ".join(tokens[i : i + k])
        for i in range(max(0, len(tokens) - k + 1))
    }


def jaccard(a: set[str], b: set[str]) -> float:
    union = len(a | b)
    return len(a & b) / union if union else 0.0


def risk_level(similarity: float) -> str:
    if similarity >= 0.75:
        return "critical"
    if similarity >= 0.5:
        return "high"
    if similarity >= 0.25:
        return "medium"
    if similarity >= 0.1:
        return "low"
    return "none"


def sentences_with_offsets(text: str) -> list[tuple[int, int, str]]:
    result: list[tuple[int, int, str]] = []
    for m in re.finditer(r"[^.!?]+[.!?]?", text):
        stripped = m.group().strip()
        if len(stripped) > 20:
            result.append((m.start(), m.end(), stripped))
    return result
