from __future__ import annotations

from abc import ABC, abstractmethod

from plagiarism.domain.models import PlagiarismReport


class PlagiarismCheckPort(ABC):
    @abstractmethod
    async def check(
        self,
        document_id: str,
        text: str,
        document_title: str,
    ) -> PlagiarismReport: ...
