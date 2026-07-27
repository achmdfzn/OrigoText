from __future__ import annotations

from abc import ABC, abstractmethod

from document.domain.models import DocumentFormat, ParseResult


class ExtractedText:
    """Raw extraction output before sanitization, sectioning, and chunking."""

    __slots__ = ("text", "title", "authors", "page_count", "warnings")

    def __init__(
        self,
        text: str,
        title: str | None = None,
        authors: list[str] | None = None,
        page_count: int | None = None,
        warnings: list[str] | None = None,
    ) -> None:
        self.text = text
        self.title = title
        self.authors = authors if authors is not None else []
        self.page_count = page_count
        self.warnings = warnings if warnings is not None else []


class TextExtractorPort(ABC):
    """Adapter contract for turning bytes of one format into raw text."""

    @property
    @abstractmethod
    def document_format(self) -> DocumentFormat: ...

    @abstractmethod
    def extract(self, payload: bytes) -> ExtractedText: ...


class FormatDetectorPort(ABC):
    """Resolves a format from magic bytes and filename, never from client MIME."""

    @abstractmethod
    def detect(self, payload: bytes, filename: str) -> DocumentFormat | None: ...


class DocumentParsingPort(ABC):
    @abstractmethod
    async def parse(self, payload: bytes, filename: str) -> ParseResult: ...
