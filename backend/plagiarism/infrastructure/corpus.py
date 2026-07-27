from __future__ import annotations

from plagiarism.domain.corpus import CorpusDocument, CorpusPort
from plagiarism.domain.models import SourceRef

_CORPUS: list[CorpusDocument] = [
    CorpusDocument(
        ref=SourceRef(
            id="src_001",
            title="Attention Is All You Need",
            authors=["Vaswani, A.", "Shazeer, N.", "Parmar, N."],
            container="NeurIPS 2017",
            year=2017,
            doi="10.48550/arXiv.1706.03762",
            url="https://arxiv.org/abs/1706.03762",
            open_access=True,
        ),
        text=(
            "The dominant sequence transduction models are based on complex recurrent or "
            "convolutional neural networks that include an encoder and a decoder. "
            "We propose a new simple network architecture, the Transformer, based solely "
            "on attention mechanisms, dispensing with recurrence and convolutions entirely. "
            "Experiments on two machine translation tasks show these models to be superior "
            "in quality while being more parallelizable and requiring significantly less "
            "time to train."
        ),
    ),
    CorpusDocument(
        ref=SourceRef(
            id="src_002",
            title="BERT: Pre-training of Deep Bidirectional Transformers",
            authors=["Devlin, J.", "Chang, M.-W.", "Lee, K.", "Toutanova, K."],
            container="NAACL-HLT 2019",
            year=2019,
            doi="10.18653/v1/N19-1423",
            url="https://arxiv.org/abs/1810.04805",
            open_access=True,
        ),
        text=(
            "We introduce a new language representation model called BERT, which stands for "
            "Bidirectional Encoder Representations from Transformers. Unlike recent language "
            "representation models, BERT is designed to pre-train deep bidirectional "
            "representations from unlabeled text by jointly conditioning on both left and "
            "right context in all layers."
        ),
    ),
]


class InMemoryCorpus(CorpusPort):
    async def all_documents(self) -> list[CorpusDocument]:
        return list(_CORPUS)
