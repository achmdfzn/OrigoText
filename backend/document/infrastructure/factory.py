from __future__ import annotations

from document.application.service import DocumentParsingService
from document.domain.ports import TextExtractorPort
from document.infrastructure.detection import ContentSniffingDetector
from document.infrastructure.markup_extractors import (
    EpubExtractor,
    HtmlExtractor,
    OdtExtractor,
)
from document.infrastructure.office_extractors import DocxExtractor, PdfExtractor
from document.infrastructure.text_extractors import (
    LatexExtractor,
    MarkdownExtractor,
    PlainTextExtractor,
    RtfExtractor,
)


def build_extractors() -> list[TextExtractorPort]:
    return [
        PdfExtractor(),
        DocxExtractor(),
        OdtExtractor(),
        EpubExtractor(),
        HtmlExtractor(),
        MarkdownExtractor(),
        LatexExtractor(),
        RtfExtractor(),
        PlainTextExtractor(),
    ]


def build_parsing_service() -> DocumentParsingService:
    return DocumentParsingService(
        detector=ContentSniffingDetector(),
        extractors=build_extractors(),
    )
