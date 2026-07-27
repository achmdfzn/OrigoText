from __future__ import annotations

import re

from document.domain.models import DocumentChunk, DocumentSection, SectionKind

_PARAGRAPH_BREAK = re.compile(r"\n\s*\n")
_SENTENCE_BOUNDARY = re.compile(r"(?<=[.!?])\s+")
_WORD = re.compile(r"\b\w+\b")

_ABSTRACT_HEADINGS = frozenset({"abstract", "summary", "ringkasan", "abstrak"})
_REFERENCE_HEADINGS = frozenset(
    {"references", "bibliography", "works cited", "daftar pustaka", "literature cited"}
)

_MAX_HEADING_WORDS = 12
_TARGET_CHUNK_WORDS = 180
_MIN_CHUNK_WORDS = 40


def count_words(text: str) -> int:
    return len(_WORD.findall(text))


def _looks_like_heading(block: str) -> bool:
    if "\n" in block.strip():
        return False
    words = count_words(block)
    if words == 0 or words > _MAX_HEADING_WORDS:
        return False
    stripped = block.strip()
    if stripped.endswith((".", ",", ";", ":")):
        return stripped.endswith(":")
    return stripped[0].isupper() or stripped[0].isdigit()


def _classify(heading: str | None, index: int, is_first_block: bool) -> SectionKind:
    if heading is not None:
        normalized = heading.strip().rstrip(":").lower()
        if normalized in _ABSTRACT_HEADINGS:
            return SectionKind.ABSTRACT
        if normalized in _REFERENCE_HEADINGS:
            return SectionKind.REFERENCES
        return SectionKind.HEADING
    if is_first_block and index == 0:
        return SectionKind.TITLE
    return SectionKind.BODY


def _blocks_with_offsets(text: str) -> list[tuple[int, int, str]]:
    blocks: list[tuple[int, int, str]] = []
    cursor = 0
    for separator in _PARAGRAPH_BREAK.finditer(text):
        block = text[cursor : separator.start()]
        if block.strip():
            blocks.append((cursor, separator.start(), block.strip()))
        cursor = separator.end()
    tail = text[cursor:]
    if tail.strip():
        blocks.append((cursor, len(text), tail.strip()))
    return blocks


def build_sections(text: str) -> list[DocumentSection]:
    """Group paragraphs into sections, attaching each to its preceding heading."""
    blocks = _blocks_with_offsets(text)
    sections: list[DocumentSection] = []
    pending_heading: str | None = None

    for index, (start, end, block) in enumerate(blocks):
        if _looks_like_heading(block) and index + 1 < len(blocks):
            pending_heading = block
            continue

        kind = _classify(pending_heading, index, is_first_block=len(sections) == 0)
        sections.append(
            DocumentSection(
                id=f"sec_{len(sections) + 1}",
                kind=kind,
                heading=pending_heading,
                text=block,
                start_offset=start,
                end_offset=end,
            )
        )
        pending_heading = None

    if not sections and text.strip():
        sections.append(
            DocumentSection(
                id="sec_1",
                kind=SectionKind.BODY,
                heading=None,
                text=text.strip(),
                start_offset=0,
                end_offset=len(text),
            )
        )
    return sections


def _sentence_spans(text: str) -> list[tuple[int, int]]:
    spans: list[tuple[int, int]] = []
    cursor = 0
    for boundary in _SENTENCE_BOUNDARY.finditer(text):
        spans.append((cursor, boundary.start()))
        cursor = boundary.end()
    if cursor < len(text):
        spans.append((cursor, len(text)))
    return spans


def build_chunks(
    text: str, sections: list[DocumentSection]
) -> list[DocumentChunk]:
    """Split sections on sentence boundaries into retrieval-sized chunks."""
    chunks: list[DocumentChunk] = []

    for section in sections:
        body = text[section.start_offset : section.end_offset]
        spans = _sentence_spans(body)
        current_start: int | None = None
        current_end = 0
        current_words = 0

        for span_start, span_end in spans:
            sentence = body[span_start:span_end]
            if not sentence.strip():
                continue
            if current_start is None:
                current_start = span_start
            current_end = span_end
            current_words += count_words(sentence)

            if current_words >= _TARGET_CHUNK_WORDS:
                chunks.append(
                    _make_chunk(body, section, current_start, current_end, len(chunks))
                )
                current_start = None
                current_words = 0

        if current_start is not None and current_words > 0:
            if chunks and current_words < _MIN_CHUNK_WORDS and chunks[-1].section_id == section.id:
                merged = chunks.pop()
                chunks.append(
                    _make_chunk(
                        body,
                        section,
                        merged.start_offset - section.start_offset,
                        current_end,
                        len(chunks),
                    )
                )
            else:
                chunks.append(
                    _make_chunk(body, section, current_start, current_end, len(chunks))
                )

    return chunks


def _make_chunk(
    body: str,
    section: DocumentSection,
    start: int,
    end: int,
    ordinal: int,
) -> DocumentChunk:
    fragment = body[start:end].strip()
    return DocumentChunk(
        id=f"chk_{ordinal + 1}",
        section_id=section.id,
        text=fragment,
        start_offset=section.start_offset + start,
        end_offset=section.start_offset + end,
        word_count=count_words(fragment),
    )
