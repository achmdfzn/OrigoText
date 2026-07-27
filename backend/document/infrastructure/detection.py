from __future__ import annotations

import zipfile
from io import BytesIO

from document.domain.models import DocumentFormat
from document.domain.ports import FormatDetectorPort

_EXTENSION_FORMATS: dict[str, DocumentFormat] = {
    "pdf": DocumentFormat.PDF,
    "docx": DocumentFormat.DOCX,
    "txt": DocumentFormat.TXT,
    "text": DocumentFormat.TXT,
    "rtf": DocumentFormat.RTF,
    "odt": DocumentFormat.ODT,
    "html": DocumentFormat.HTML,
    "htm": DocumentFormat.HTML,
    "md": DocumentFormat.MARKDOWN,
    "markdown": DocumentFormat.MARKDOWN,
    "tex": DocumentFormat.LATEX,
    "latex": DocumentFormat.LATEX,
    "epub": DocumentFormat.EPUB,
}

_CONTAINER_FORMATS = frozenset(
    {
        DocumentFormat.PDF,
        DocumentFormat.DOCX,
        DocumentFormat.ODT,
        DocumentFormat.EPUB,
    }
)

_ZIP_ENTRY_FORMATS: list[tuple[str, DocumentFormat]] = [
    ("word/document.xml", DocumentFormat.DOCX),
    ("content.xml", DocumentFormat.ODT),
    ("META-INF/container.xml", DocumentFormat.EPUB),
]


def _extension_of(filename: str) -> str:
    _, _, extension = filename.rpartition(".")
    return extension.lower()


def _zip_format(payload: bytes) -> DocumentFormat | None:
    try:
        with zipfile.ZipFile(BytesIO(payload)) as archive:
            names = set(archive.namelist())
    except (zipfile.BadZipFile, OSError):
        return None
    for entry, document_format in _ZIP_ENTRY_FORMATS:
        if entry in names:
            return document_format
    return None


def _looks_like_text(payload: bytes) -> bool:
    sample = payload[:4096]
    if b"\x00" in sample:
        return False
    try:
        sample.decode("utf-8")
    except UnicodeDecodeError:
        return sum(byte < 0x09 or 0x0E <= byte < 0x20 for byte in sample) <= len(sample) // 20
    return True


class ContentSniffingDetector(FormatDetectorPort):
    """Resolves format from magic bytes first, filename extension second.

    Client-supplied content types are ignored: they are attacker-controlled and
    a mismatch between declared and actual type is a known upload attack vector.
    """

    def detect(self, payload: bytes, filename: str) -> DocumentFormat | None:
        if payload.startswith(b"%PDF-"):
            return DocumentFormat.PDF
        if payload.startswith(b"{\\rtf"):
            return DocumentFormat.RTF

        if payload.startswith(b"PK\x03\x04"):
            zip_format = _zip_format(payload)
            if zip_format is not None:
                return zip_format
            return None

        extension = _extension_of(filename)
        declared = _EXTENSION_FORMATS.get(extension)

        if declared in _CONTAINER_FORMATS:
            return None

        if declared is not None:
            return declared if _looks_like_text(payload) else None

        if _looks_like_text(payload):
            head = payload[:1024].lstrip().lower()
            if head.startswith((b"<!doctype html", b"<html")):
                return DocumentFormat.HTML
            return DocumentFormat.TXT

        return None
