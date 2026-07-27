from __future__ import annotations

from document.domain.models import DocumentFormat


class DocumentError(Exception):
    """Base class for domain errors in the document context."""


class UnsupportedFormatError(DocumentError):
    def __init__(self, filename: str) -> None:
        self.filename = filename
        super().__init__(f"Unsupported or undetectable document format for '{filename}'.")


class FileTooLargeError(DocumentError):
    def __init__(self, byte_size: int, limit: int) -> None:
        self.byte_size = byte_size
        self.limit = limit
        super().__init__(f"File is {byte_size} bytes; the limit is {limit} bytes.")


class EmptyFileError(DocumentError):
    def __init__(self, filename: str) -> None:
        self.filename = filename
        super().__init__(f"File '{filename}' contains no bytes.")


class CorruptDocumentError(DocumentError):
    def __init__(self, document_format: DocumentFormat, reason: str) -> None:
        self.document_format = document_format
        self.reason = reason
        super().__init__(f"Could not read {document_format.value} document: {reason}")


class NoExtractableTextError(DocumentError):
    def __init__(self, document_format: DocumentFormat) -> None:
        self.document_format = document_format
        super().__init__(
            f"No extractable text found in {document_format.value} document. "
            "It may be a scanned image requiring OCR."
        )
