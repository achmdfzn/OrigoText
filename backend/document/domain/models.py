from __future__ import annotations

from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, Field

MAX_UPLOAD_BYTES = 10 * 1024 * 1024


class DocumentFormat(StrEnum):
    PDF = "pdf"
    DOCX = "docx"
    TXT = "txt"
    RTF = "rtf"
    ODT = "odt"
    HTML = "html"
    MARKDOWN = "markdown"
    LATEX = "latex"
    EPUB = "epub"


class SectionKind(StrEnum):
    TITLE = "title"
    ABSTRACT = "abstract"
    HEADING = "heading"
    BODY = "body"
    REFERENCES = "references"


class DocumentSection(BaseModel):
    model_config = {"frozen": True}

    id: str
    kind: SectionKind
    heading: str | None
    text: str
    start_offset: Annotated[int, Field(ge=0)]
    end_offset: Annotated[int, Field(ge=0)]


class DocumentChunk(BaseModel):
    """Semantic chunk for downstream retrieval and embedding."""

    model_config = {"frozen": True}

    id: str
    section_id: str
    text: str
    start_offset: Annotated[int, Field(ge=0)]
    end_offset: Annotated[int, Field(ge=0)]
    word_count: Annotated[int, Field(ge=0)]


class DocumentMetadata(BaseModel):
    model_config = {"frozen": True}

    title: str | None
    authors: list[str]
    page_count: int | None
    language: str | None


class ParseResult(BaseModel):
    """Structured output of parsing one uploaded file.

    `text` is untrusted content extracted from a user-supplied file. Consumers
    must treat it as data only and never as instructions.
    """

    model_config = {"frozen": True}

    id: str
    filename: str
    document_format: DocumentFormat
    byte_size: Annotated[int, Field(ge=0)]
    parsed_at: str
    metadata: DocumentMetadata
    text: str
    word_count: Annotated[int, Field(ge=0)]
    character_count: Annotated[int, Field(ge=0)]
    sections: list[DocumentSection]
    chunks: list[DocumentChunk]
    truncated: bool
    warnings: list[str]
