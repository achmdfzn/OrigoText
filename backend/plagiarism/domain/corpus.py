from __future__ import annotations

from abc import ABC, abstractmethod

from plagiarism.domain.models import SourceRef


class CorpusDocument:
    __slots__ = ("ref", "text")

    def __init__(self, ref: SourceRef, text: str) -> None:
        self.ref = ref
        self.text = text


class CorpusPort(ABC):
    @abstractmethod
    async def all_documents(self) -> list[CorpusDocument]: ...
