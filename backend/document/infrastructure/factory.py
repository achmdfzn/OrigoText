from __future__ import annotations

from document.application.jobs import DocumentJobService
from document.application.service import DocumentParsingService
from document.domain.jobs import JobStorePort, PayloadStorePort
from document.domain.ports import TextExtractorPort
from document.infrastructure.detection import ContentSniffingDetector
from document.infrastructure.jobs import AsyncioJobQueue, InMemoryJobStore, InMemoryPayloadStore
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


def build_job_service(
    store: JobStorePort | None = None,
    payload_store: PayloadStorePort | None = None,
) -> tuple[DocumentJobService, JobStorePort, AsyncioJobQueue]:
    """Wires parsing jobs to interchangeable lifecycle and payload stores."""
    store = store if store is not None else InMemoryJobStore()
    payload_store = payload_store if payload_store is not None else InMemoryPayloadStore()
    service_ref: list[DocumentJobService] = []

    async def mark_crashed(job_id: str, error: BaseException) -> None:
        await service_ref[0].mark_crashed(job_id, error)

    queue = AsyncioJobQueue(on_unexpected_error=mark_crashed)
    service = DocumentJobService(
        parser=build_parsing_service(),
        store=store,
        queue=queue,
    )
    service_ref.append(service)
    queue.set_runner(service.run)
    return service, store, queue
