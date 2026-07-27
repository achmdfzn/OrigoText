from __future__ import annotations

import asyncio
import hashlib
from datetime import UTC, datetime

from document.domain.errors import (
    EmptyFileError,
    FileTooLargeError,
    NoExtractableTextError,
    UnsupportedFormatError,
)
from document.domain.models import (
    MAX_UPLOAD_BYTES,
    DocumentFormat,
    DocumentMetadata,
    ParseResult,
)
from document.domain.ports import (
    DocumentParsingPort,
    FormatDetectorPort,
    TextExtractorPort,
)
from document.domain.sanitization import sanitize
from document.domain.structuring import build_chunks, build_sections, count_words

MAX_TEXT_CHARACTERS = 200_000

_LATIN_STOPWORDS = frozenset({"the", "and", "of", "to", "in", "that", "is", "for", "with"})
_INDONESIAN_STOPWORDS = frozenset({"dan", "yang", "dengan", "untuk", "pada", "adalah", "ini"})


def detect_language(text: str) -> str | None:
    sample = {word.lower() for word in text.split()[:400]}
    latin_hits = len(sample & _LATIN_STOPWORDS)
    indonesian_hits = len(sample & _INDONESIAN_STOPWORDS)
    if latin_hits == 0 and indonesian_hits == 0:
        return None
    return "id" if indonesian_hits > latin_hits else "en"


def _fallback_title(filename: str) -> str:
    stem = filename.rpartition(".")[0] or filename
    return stem.replace("_", " ").replace("-", " ").strip() or filename


class DocumentParsingService(DocumentParsingPort):
    """Orchestrates detection, extraction, sanitization, and chunking.

    Extraction runs in a worker thread because every underlying library is
    blocking; this keeps the event loop responsive under concurrent uploads.
    """

    def __init__(
        self,
        detector: FormatDetectorPort,
        extractors: list[TextExtractorPort],
        max_upload_bytes: int = MAX_UPLOAD_BYTES,
        max_text_characters: int = MAX_TEXT_CHARACTERS,
    ) -> None:
        self._detector = detector
        self._extractors: dict[DocumentFormat, TextExtractorPort] = {
            extractor.document_format: extractor for extractor in extractors
        }
        self._max_upload_bytes = max_upload_bytes
        self._max_text_characters = max_text_characters

    async def parse(self, payload: bytes, filename: str) -> ParseResult:
        self._validate_payload(payload, filename)

        document_format = self._detector.detect(payload, filename)
        if document_format is None or document_format not in self._extractors:
            raise UnsupportedFormatError(filename)

        extractor = self._extractors[document_format]
        extracted = await asyncio.to_thread(extractor.extract, payload)

        sanitized, sanitize_warnings = sanitize(extracted.text)
        if not sanitized:
            raise NoExtractableTextError(document_format)

        truncated = len(sanitized) > self._max_text_characters
        text = sanitized[: self._max_text_characters] if truncated else sanitized

        warnings = [*extracted.warnings, *sanitize_warnings]
        if truncated:
            warnings.append(
                f"Text was truncated to the first {self._max_text_characters} characters."
            )

        sections = build_sections(text)
        chunks = build_chunks(text, sections)

        return ParseResult(
            id=f"doc_{hashlib.sha256(payload).hexdigest()[:16]}",
            filename=filename,
            document_format=document_format,
            byte_size=len(payload),
            parsed_at=datetime.now(UTC).isoformat(),
            metadata=DocumentMetadata(
                title=extracted.title or _fallback_title(filename),
                authors=extracted.authors,
                page_count=extracted.page_count,
                language=detect_language(text),
            ),
            text=text,
            word_count=count_words(text),
            character_count=len(text),
            sections=sections,
            chunks=chunks,
            truncated=truncated,
            warnings=warnings,
        )

    def _validate_payload(self, payload: bytes, filename: str) -> None:
        if not payload:
            raise EmptyFileError(filename)
        if len(payload) > self._max_upload_bytes:
            raise FileTooLargeError(len(payload), self._max_upload_bytes)
