from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, File, Request, UploadFile, status
from fastapi.responses import JSONResponse

from document.application.service import DocumentParsingService
from document.domain.errors import (
    CorruptDocumentError,
    DocumentError,
    EmptyFileError,
    FileTooLargeError,
    NoExtractableTextError,
    UnsupportedFormatError,
)
from document.domain.models import MAX_UPLOAD_BYTES, DocumentFormat, ParseResult
from document.infrastructure.factory import build_parsing_service
from shared.problem import PROBLEM_CONTENT_TYPE, problem_response

router = APIRouter(prefix="/v1/documents", tags=["documents"])

_service: DocumentParsingService = build_parsing_service()

_MAX_FILENAME_LENGTH = 255
UploadDocument = Annotated[
    UploadFile,
    File(description=f"Document to parse, at most {MAX_UPLOAD_BYTES} bytes"),
]

_PROBLEM_CONTENT: dict[str, dict[str, object]] = {PROBLEM_CONTENT_TYPE: {}}
_PROBLEM_RESPONSES: dict[int | str, dict[str, object]] = {
    400: {"description": "Empty or unreadable document", "content": _PROBLEM_CONTENT},
    413: {"description": "File exceeds the upload size limit", "content": _PROBLEM_CONTENT},
    415: {"description": "Unsupported document format", "content": _PROBLEM_CONTENT},
    422: {"description": "No extractable text (may require OCR)", "content": _PROBLEM_CONTENT},
}


def _safe_filename(upload: UploadFile) -> str:
    raw = upload.filename or "upload"
    basename = raw.replace("\\", "/").rpartition("/")[2]
    cleaned = "".join(char for char in basename if char.isprintable()).strip()
    return (cleaned or "upload")[:_MAX_FILENAME_LENGTH]


def _problem_for(request: Request, error: DocumentError) -> JSONResponse:
    if isinstance(error, FileTooLargeError):
        return problem_response(
            request,
            slug="file-too-large",
            title="File too large",
            status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=str(error),
            extra={"limit_bytes": error.limit},
        )
    if isinstance(error, UnsupportedFormatError):
        return problem_response(
            request,
            slug="unsupported-format",
            title="Unsupported document format",
            status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=str(error),
            extra={"supported_formats": [fmt.value for fmt in DocumentFormat]},
        )
    if isinstance(error, NoExtractableTextError):
        return problem_response(
            request,
            slug="no-extractable-text",
            title="No extractable text",
            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        )
    if isinstance(error, EmptyFileError | CorruptDocumentError):
        return problem_response(
            request,
            slug="unreadable-document",
            title="Unreadable document",
            status=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )
    return problem_response(
        request,
        slug="parse-failed",
        title="Document could not be parsed",
        status=status.HTTP_400_BAD_REQUEST,
        detail=str(error),
    )


@router.post(
    "",
    response_model=ParseResult,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and parse a document into structured, sanitized text",
    responses=_PROBLEM_RESPONSES,
)
async def create_document(
    request: Request,
    file: UploadDocument,
) -> ParseResult | JSONResponse:
    payload = await file.read()
    try:
        return await _service.parse(payload=payload, filename=_safe_filename(file))
    except DocumentError as error:
        return _problem_for(request, error)
    finally:
        await file.close()
