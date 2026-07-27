from __future__ import annotations

from abc import ABC, abstractmethod

from ai_detection.domain.models import DetectionResult


class AiDetectionPort(ABC):
    @abstractmethod
    async def detect(
        self,
        document_id: str,
        text: str,
        document_title: str,
    ) -> DetectionResult: ...
