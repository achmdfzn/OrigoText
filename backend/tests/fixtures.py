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


def _pdf_object(number: int, body: str) -> bytes:
    return f"{number} 0 obj\n{body}\nendobj\n".encode("latin-1")


def pdf_bytes(lines: list[str] | None = None, title: str = "PDF Probe") -> bytes:
    """Builds a minimal single-page PDF with a real text layer."""
    content_lines = lines if lines is not None else [
        "Retrieval-augmented generation grounds a model in an external corpus.",
        "The retriever selects candidates before the generator conditions on them.",
        "Detecting paraphrase requires semantic comparison rather than matching.",
    ]
    text_ops = "".join(
        f"({line.replace('(', '').replace(')', '')}) Tj T*\n" for line in content_lines
    )
    stream = f"BT /F1 12 Tf 14 TL 72 720 Td\n{text_ops}ET"
    stream_bytes = stream.encode("latin-1")

    objects = [
        _pdf_object(1, "<< /Type /Catalog /Pages 2 0 R >>"),
        _pdf_object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
        _pdf_object(
            3,
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            "/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        ),
        _pdf_object(
            4, f"<< /Length {len(stream_bytes)} >>\nstream\n{stream}\nendstream"
        ),
        _pdf_object(5, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),
        _pdf_object(6, f"<< /Title ({title}) /Author (Vaswani, A.) >>"),
    ]

    header = b"%PDF-1.4\n"
    body = b""
    offsets: list[int] = []
    for obj in objects:
        offsets.append(len(header) + len(body))
        body += obj

    xref_offset = len(header) + len(body)
    xref = f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode("latin-1")
    for offset in offsets:
        xref += f"{offset:010d} 00000 n \n".encode("latin-1")
    trailer = (
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R /Info 6 0 R >>\n"
        f"startxref\n{xref_offset}\n%%EOF\n"
    ).encode("latin-1")

    return header + body + xref + trailer


def scanned_pdf_bytes() -> bytes:
    """A PDF with no text layer, standing in for a scanned upload."""
    return pdf_bytes(lines=[])


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
