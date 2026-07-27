from __future__ import annotations

import zipfile
from io import BytesIO
from xml.etree import ElementTree

from bs4 import BeautifulSoup

from document.domain.errors import CorruptDocumentError
from document.domain.models import DocumentFormat
from document.domain.ports import ExtractedText, TextExtractorPort
from document.infrastructure.text_extractors import decode_bytes

_STRIPPED_TAGS = ("script", "style", "noscript", "template", "svg", "iframe", "object")
_BLOCK_TAGS = ("p", "div", "section", "article", "h1", "h2", "h3", "h4", "h5", "h6", "li", "br")


def html_to_text(markup: str) -> tuple[str, str | None]:
    """Extract visible text from markup, dropping executable and styling nodes."""
    soup = BeautifulSoup(markup, "html.parser")
    for tag in soup(_STRIPPED_TAGS):
        tag.decompose()

    title = soup.title.string.strip() if soup.title is not None and soup.title.string else None
    if title is None and soup.h1 is not None:
        heading = soup.h1.get_text(strip=True)
        title = heading if heading else None

    for tag in soup.find_all(_BLOCK_TAGS):
        tag.insert_after(soup.new_string("\n\n"))

    return soup.get_text(), title


class HtmlExtractor(TextExtractorPort):
    @property
    def document_format(self) -> DocumentFormat:
        return DocumentFormat.HTML

    def extract(self, payload: bytes) -> ExtractedText:
        raw, warnings = decode_bytes(payload)
        text, title = html_to_text(raw)
        return ExtractedText(text=text, title=title, warnings=warnings)
