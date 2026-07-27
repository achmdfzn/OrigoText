from __future__ import annotations

import hashlib
import re
from collections import defaultdict
from datetime import UTC, datetime

from plagiarism.domain.corpus import CorpusDocument, CorpusPort
from plagiarism.domain.models import (
    MatchKind,
    MatchedSpan,
    PlagiarismReport,
    RiskLevel,
    SourceMatch,
)
from plagiarism.domain.ports import PlagiarismCheckPort

_SHINGLE_SIZE = 5
_SIMILARITY_THRESHOLD = 0.15


def _tokenize(text: str) -> list[str]:
    return re.findall(r"\b\w+\b", text.lower())


def _shingles(tokens: list[str], k: int) -> set[int]:
    return {
        hash(" ".join(tokens[i : i + k]))
        for i in range(max(0, len(tokens) - k + 1))
    }


def _jaccard(a: set[int], b: set[int]) -> float:
    union = len(a | b)
    return len(a & b) / union if union else 0.0


def _risk_level(similarity: float) -> RiskLevel:
    if similarity >= 0.75:
        return RiskLevel.CRITICAL
    if similarity >= 0.5:
        return RiskLevel.HIGH
    if similarity >= 0.25:
        return RiskLevel.MEDIUM
    if similarity >= 0.1:
        return RiskLevel.LOW
    return RiskLevel.NONE


def _sentences(text: str) -> list[tuple[int, int, str]]:
    result: list[tuple[int, int, str]] = []
    for m in re.finditer(r"[^.!?]+[.!?]?", text):
        s = m.group().strip()
        if len(s) > 20:
            result.append((m.start(), m.end(), s))
    return result


class LexicalPlagiarismService(PlagiarismCheckPort):
    def __init__(self, corpus: CorpusPort) -> None:
        self._corpus = corpus

    async def check(
        self,
        document_id: str,
        text: str,
        document_title: str,
    ) -> PlagiarismReport:
        docs = await self._corpus.all_documents()
        sub_tokens = _tokenize(text)
        sub_shingles = _shingles(sub_tokens, _SHINGLE_SIZE)
        word_count = len(sub_tokens)

        source_matches: list[SourceMatch] = []
        span_counter: dict[str, int] = defaultdict(int)

        for doc in docs:
            doc_tokens = _tokenize(doc.text)
            doc_shingles = _shingles(doc_tokens, _SHINGLE_SIZE)
            similarity = _jaccard(sub_shingles, doc_shingles)
            if similarity < _SIMILARITY_THRESHOLD:
                continue

            spans: list[MatchedSpan] = []
            for start, end, sentence in _sentences(text):
                sent_tokens = _tokenize(sentence)
                sent_shingles = _shingles(sent_tokens, _SHINGLE_SIZE)
                sent_sim = _jaccard(sent_shingles, doc_shingles)
                if sent_sim < _SIMILARITY_THRESHOLD:
                    continue
                span_id = hashlib.sha1(
                    f"{document_id}:{doc.ref.id}:{start}".encode()
                ).hexdigest()[:12]
                span_counter[span_id] += 1
                spans.append(
                    MatchedSpan(
                        id=span_id,
                        source_id=doc.ref.id,
                        submission_text=sentence,
                        source_text=sentence,
                        submission_start=start,
                        submission_end=end,
                        kind=MatchKind.NEAR_DUPLICATE
                        if sent_sim > 0.8
                        else MatchKind.PARAPHRASE,
                        similarity=round(sent_sim, 4),
                        confidence=round(min(sent_sim * 1.2, 1.0), 4),
                    )
                )

            if spans:
                matched_words = sum(
                    len(_tokenize(sp.submission_text)) for sp in spans
                )
                source_matches.append(
                    SourceMatch(
                        source=doc.ref,
                        similarity=round(similarity, 4),
                        confidence=round(min(similarity * 1.1, 1.0), 4),
                        matched_words=matched_words,
                        spans=spans,
                    )
                )

        source_matches.sort(key=lambda m: m.similarity, reverse=True)
        overall = source_matches[0].similarity if source_matches else 0.0

        return PlagiarismReport(
            id=f"plg_{hashlib.sha1(document_id.encode()).hexdigest()[:8]}",
            document_title=document_title,
            word_count=word_count,
            checked_at=datetime.now(UTC).isoformat(),
            overall_similarity=round(overall, 4),
            risk_level=_risk_level(overall),
            sources=source_matches,
            submission_text=text,
        )
