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
from shared.dependencies import UploadLimitedPrincipal
from shared.logging import log_event
from shared.problem import problem_response, problem_responses

router = APIRouter(prefix="/v1/documents", tags=["documents"])

_service: DocumentParsingService = build_parsing_service()

_MAX_FILENAME_LENGTH = 255
UploadDocument = Annotated[
    UploadFile,
    File(description=f"Document to parse, at most {MAX_UPLOAD_BYTES} bytes"),
]

_PROBLEM_RESPONSES = problem_responses(
    _400="Empty or unreadable document",
    _413="File exceeds the upload size limit",
    _415="Unsupported document format",
    _422="No extractable text (may require OCR)",
)


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
            status=status.HTTP_413_CONTENT_TOO_LARGE,
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
            status=status.HTTP_422_UNPROCESSABLE_CONTENT,
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
    principal: UploadLimitedPrincipal,
) -> ParseResult | JSONResponse:
    payload = await file.read()
    filename = _safe_filename(file)
    try:
        result = await _service.parse(payload=payload, filename=filename)
    except DocumentError as error:
        log_event(
            "document.parse.rejected",
            key_id=principal.key_id,
            reason=type(error).__name__,
            byte_size=len(payload),
        )
        return _problem_for(request, error)
    finally:
        await file.close()

    log_event(
        "document.parse.completed",
        key_id=principal.key_id,
        document_id=result.id,
        document_format=result.document_format.value,
        word_count=result.word_count,
        truncated=result.truncated,
    )
    return result
