from __future__ import annotations

import hashlib
from datetime import UTC, datetime

from plagiarism.domain.algorithms import (
    SHINGLE_SIZE,
    SIMILARITY_THRESHOLD,
    jaccard,
    risk_level,
    sentences_with_offsets,
    shingles,
    tokenize,
)
from plagiarism.domain.corpus import CorpusDocument, CorpusPort
from plagiarism.domain.models import (
    MatchedSpan,
    MatchKind,
    PlagiarismReport,
    SourceMatch,
)
from plagiarism.domain.ports import PlagiarismCheckPort

_NEAR_DUPLICATE_THRESHOLD = 0.8
_SPAN_CONFIDENCE_FACTOR = 1.2
_SOURCE_CONFIDENCE_FACTOR = 1.1


def _span_id(document_id: str, source_id: str, start: int) -> str:
    digest = hashlib.sha1(f"{document_id}:{source_id}:{start}".encode(), usedforsecurity=False)
    return digest.hexdigest()[:12]


def _match_kind(similarity: float) -> MatchKind:
    if similarity > _NEAR_DUPLICATE_THRESHOLD:
        return MatchKind.NEAR_DUPLICATE
    return MatchKind.PARAPHRASE


class LexicalPlagiarismService(PlagiarismCheckPort):
    """Shingle-overlap detection against the licensed corpus.

    Lexical only: it finds verbatim and lightly edited reuse. Paraphrase and
    cross-language reuse need the semantic engine and are not covered here.
    """

    def __init__(self, corpus: CorpusPort) -> None:
        self._corpus = corpus

    async def check(
        self,
        document_id: str,
        text: str,
        document_title: str,
    ) -> PlagiarismReport:
        documents = await self._corpus.all_documents()
        submission_tokens = tokenize(text)
        submission_shingles = shingles(submission_tokens, SHINGLE_SIZE)

        matches = [
            match
            for document in documents
            if (
                match := self._match_document(
                    document_id, text, submission_shingles, document
                )
            )
            is not None
        ]
        matches.sort(key=lambda match: match.similarity, reverse=True)
        overall = matches[0].similarity if matches else 0.0

        return PlagiarismReport(
            id=f"plg_{hashlib.sha1(document_id.encode(), usedforsecurity=False).hexdigest()[:8]}",
            document_title=document_title,
            word_count=len(submission_tokens),
            checked_at=datetime.now(UTC).isoformat(),
            overall_similarity=round(overall, 4),
            risk_level=risk_level(overall),
            sources=matches,
            submission_text=text,
        )

    def _match_document(
        self,
        document_id: str,
        text: str,
        submission_shingles: set[str],
        document: CorpusDocument,
    ) -> SourceMatch | None:
        source_shingles = shingles(tokenize(document.text), SHINGLE_SIZE)
        similarity = jaccard(submission_shingles, source_shingles)
        if similarity < SIMILARITY_THRESHOLD:
            return None

        spans = self._align_sentences(document_id, text, source_shingles, document)
        if not spans:
            return None

        return SourceMatch(
            source=document.ref,
            similarity=round(similarity, 4),
            confidence=round(min(similarity * _SOURCE_CONFIDENCE_FACTOR, 1.0), 4),
            matched_words=sum(len(tokenize(span.submission_text)) for span in spans),
            spans=spans,
        )

    def _align_sentences(
        self,
        document_id: str,
        text: str,
        source_shingles: set[str],
        document: CorpusDocument,
    ) -> list[MatchedSpan]:
        spans: list[MatchedSpan] = []
        for start, end, sentence in sentences_with_offsets(text):
            sentence_similarity = jaccard(
                shingles(tokenize(sentence), SHINGLE_SIZE), source_shingles
            )
            if sentence_similarity < SIMILARITY_THRESHOLD:
                continue
            spans.append(
                MatchedSpan(
                    id=_span_id(document_id, document.ref.id, start),
                    source_id=document.ref.id,
                    submission_text=sentence,
                    source_text=sentence,
                    submission_start=start,
                    submission_end=end,
                    kind=_match_kind(sentence_similarity),
                    similarity=round(sentence_similarity, 4),
                    confidence=round(
                        min(sentence_similarity * _SPAN_CONFIDENCE_FACTOR, 1.0), 4
                    ),
                )
            )
        return spans
