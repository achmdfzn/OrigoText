from __future__ import annotations

from document.domain.models import DocumentFormat
from document.infrastructure.detection import ContentSniffingDetector
from tests.fixtures import docx_bytes, odt_bytes, pdf_bytes

detector = ContentSniffingDetector()


def test_detects_pdf_from_magic_bytes_despite_wrong_extension() -> None:
    assert detector.detect(pdf_bytes(), "actually-a-pdf.txt") == DocumentFormat.PDF


def test_detects_docx_from_zip_entry() -> None:
    assert detector.detect(docx_bytes(), "paper.docx") == DocumentFormat.DOCX


def test_detects_odt_from_zip_entry() -> None:
    assert detector.detect(odt_bytes(), "paper.odt") == DocumentFormat.ODT


def test_rejects_binary_masquerading_as_pdf_extension() -> None:
    assert detector.detect(b"\x00\x01\x02\x03not a document", "malware.pdf") is None


def test_rejects_zip_that_is_not_an_office_container() -> None:
    import zipfile
    from io import BytesIO

    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("payload.exe", "MZ")
    assert detector.detect(buffer.getvalue(), "archive.docx") is None


def test_detects_html_from_doctype_without_extension() -> None:
    assert detector.detect(b"<!DOCTYPE html><html><body>hi</body></html>", "page") == (
        DocumentFormat.HTML
    )


def test_detects_markdown_and_latex_from_extension() -> None:
    assert detector.detect(b"# Heading\n\nBody text.", "notes.md") == DocumentFormat.MARKDOWN
    assert detector.detect(b"\\documentclass{article}", "paper.tex") == DocumentFormat.LATEX


def test_detects_rtf_from_magic_bytes() -> None:
    assert detector.detect(rb"{\rtf1\ansi Hello}", "doc.rtf") == DocumentFormat.RTF


def test_falls_back_to_plain_text_for_unknown_extension() -> None:
    assert detector.detect(b"just some prose here", "README") == DocumentFormat.TXT
