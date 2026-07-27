from __future__ import annotations

import zipfile
from io import BytesIO

PARAGRAPHS = [
    "Retrieval-augmented generation grounds a generative model in an external corpus. "
    "The retriever selects candidate passages before the generator conditions on them. "
    "This reduces hallucination and lets the system cite the evidence it relied upon.",
    "Detecting paraphrase requires semantic comparison rather than surface matching. "
    "Lexical overlap between two passages can be low even when meaning is identical. "
    "Evaluation therefore reports precision, recall, and calibration on held-out data.",
]


def docx_bytes(title: str = "Parsing Probe", paragraphs: list[str] | None = None) -> bytes:
    from docx import Document

    document = Document()
    document.core_properties.title = title
    document.core_properties.author = "Nguyen, T."
    for paragraph in paragraphs if paragraphs is not None else PARAGRAPHS:
        document.add_paragraph(paragraph)
    buffer = BytesIO()
    document.save(buffer)
    return buffer.getvalue()


def pdf_bytes(paragraphs: list[str] | None = None) -> bytes:
    from pypdf import PdfWriter

    writer = PdfWriter()
    page = writer.add_blank_page(width=612, height=792)
    del page
    buffer = BytesIO()
    writer.write(buffer)
    del paragraphs
    return buffer.getvalue()


def odt_bytes(title: str = "ODT Probe") -> bytes:
    content = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<office:document-content '
        'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
        'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">'
        "<office:body><office:text>"
        + "".join(f"<text:p>{paragraph}</text:p>" for paragraph in PARAGRAPHS)
        + "</office:text></office:body></office:document-content>"
    )
    meta = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<office:document-meta '
        'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
        'xmlns:dc="http://purl.org/dc/elements/1.1/">'
        f"<office:meta><dc:title>{title}</dc:title>"
        "<dc:creator>Devlin, J.</dc:creator></office:meta>"
        "</office:document-meta>"
    )
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("mimetype", "application/vnd.oasis.opendocument.text")
        archive.writestr("content.xml", content)
        archive.writestr("meta.xml", meta)
    return buffer.getvalue()
