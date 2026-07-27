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
