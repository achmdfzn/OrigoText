from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import APIRouter, File, Request, Response, UploadFile, status
from fastapi.responses import JSONResponse, StreamingResponse

from document.domain.jobs import ParseJob
from document.domain.models import MAX_UPLOAD_BYTES
from document.interface.dependencies import JobService
from shared.dependencies import UploadLimitedPrincipal
from shared.logging import log_event
from shared.problem import problem_response, problem_responses

router = APIRouter(prefix="/v1/documents", tags=["documents"])

UploadDocument = Annotated[
    UploadFile,
    File(description=f"Document to parse, at most {MAX_UPLOAD_BYTES} bytes"),
]

_MAX_FILENAME_LENGTH = 255
_SSE_MEDIA_TYPE = "text/event-stream"


def safe_filename(upload: UploadFile) -> str:
    raw = upload.filename or "upload"
    basename = raw.replace("\\", "/").rpartition("/")[2]
    cleaned = "".join(char for char in basename if char.isprintable()).strip()
    return (cleaned or "upload")[:_MAX_FILENAME_LENGTH]


def _job_not_found(request: Request, job_id: str) -> JSONResponse:
    return problem_response(
        request,
        slug="job-not-found",
        title="Job not found",
        status=status.HTTP_404_NOT_FOUND,
        detail=f"No parse job with id '{job_id}'. It may have expired.",
    )


@router.post(
    "",
    response_model=ParseJob,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Queue a document for parsing",
    description=(
        "Returns immediately with a job id. Poll the job endpoint or subscribe "
        "to its event stream for progress and the final parse result."
    ),
    responses=problem_responses(_413="File exceeds the upload size limit"),
)
async def create_document_job(
    file: UploadDocument,
    service: JobService,
    principal: UploadLimitedPrincipal,
    response: Response,
) -> ParseJob:
    payload = await file.read()
    await file.close()

    job = await service.submit(payload=payload, filename=safe_filename(file))
    response.headers["Location"] = f"/v1/documents/{job.id}"

    log_event(
        "document.job.queued",
        key_id=principal.key_id,
        job_id=job.id,
        byte_size=job.byte_size,
    )
    return job


@router.get(
    "/{job_id}",
    response_model=ParseJob,
    summary="Document metadata and parse status",
    responses=problem_responses(_404="Unknown or expired job"),
)
async def get_document_job(
    request: Request,
    job_id: str,
    service: JobService,
    principal: UploadLimitedPrincipal,
) -> ParseJob | JSONResponse:
    del principal
    job = await service.get(job_id)
    if job is None:
        return _job_not_found(request, job_id)
    return job


def _sse_event(job: ParseJob) -> str:
    payload = job.model_dump_json()
    return f"event: {job.status.value}\ndata: {payload}\n\n"


@router.get(
    "/{job_id}/stream",
    summary="Realtime parse progress as server-sent events",
    response_class=StreamingResponse,
    response_model=None,
    responses={
        200: {"content": {_SSE_MEDIA_TYPE: {}}, "description": "Job progress stream"},
        **problem_responses(_404="Unknown or expired job"),
    },
)
async def stream_document_job(
    request: Request,
    job_id: str,
    service: JobService,
    principal: UploadLimitedPrincipal,
) -> StreamingResponse | JSONResponse:
    del principal
    if await service.get(job_id) is None:
        return _job_not_found(request, job_id)

    async def events() -> AsyncIterator[str]:
        async for job in service.stream(job_id):
            if await request.is_disconnected():
                return
            yield _sse_event(job)

    return StreamingResponse(
        events(),
        media_type=_SSE_MEDIA_TYPE,
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
    )
