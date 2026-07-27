import type { SearchResponse } from "./types";

export function buildSampleResponse(query: string): SearchResponse {
  return {
    query,
    totalCount: 4,
    page: 1,
    pageSize: 10,
    durationMs: 312,
    results: [
      {
        id: "10.1145/3442188.3445922",
        title: "On the Dangers of Stochastic Parrots: Can Language Models Be Too Big?",
        authors: [
          { name: "Emily M. Bender", affiliation: "University of Washington", orcid: null },
          { name: "Timnit Gebru", affiliation: "Black in AI", orcid: null },
          { name: "Angelina McMillan-Major", affiliation: "University of Washington", orcid: null },
          { name: "Shmargaret Shmitchell", affiliation: "Hugging Face", orcid: null },
        ],
        abstract:
          "The past three years of work in NLP have been characterized by the development and deployment of ever larger language models, especially for English. BERT, GPT-2, XLNet, and others have pushed the boundaries of the possible both through architectural innovations and through sheer size. Using these pretrained models and the methodology of fine-tuning them for specific tasks, researchers have extended the state of the art on a wide array of benchmarks. In this paper, we take a step back and ask: How big is too big?",
        journal: "FAccT '21: Proceedings of the 2021 ACM Conference on Fairness, Accountability, and Transparency",
        publisher: "ACM",
        year: 2021,
        doi: "10.1145/3442188.3445922",
        url: "https://doi.org/10.1145/3442188.3445922",
        citationCount: 4821,
        documentType: "conference",
        openAccess: "green",
        keywords: ["language models", "NLP", "ethics", "AI safety"],
        source: "Crossref",
      },
      {
        id: "10.48550/arXiv.2005.14165",
        title: "Language Models are Few-Shot Learners",
        authors: [
          { name: "Tom B. Brown", affiliation: "OpenAI", orcid: null },
          { name: "Benjamin Mann", affiliation: "OpenAI", orcid: null },
          { name: "Nick Ryder", affiliation: "OpenAI", orcid: null },
        ],
        abstract:
          "We demonstrate that scaling up language models greatly improves task-agnostic, few-shot performance, sometimes even reaching competitiveness with prior state-of-the-art fine-tuning approaches. Specifically, we train GPT-3, an autoregressive language model with 175 billion parameters, 10x more than any previous non-sparse language model, and test its performance in the few-shot setting.",
        journal: "Advances in Neural Information Processing Systems",
        publisher: "NeurIPS",
        year: 2020,
        doi: "10.48550/arXiv.2005.14165",
        url: "https://arxiv.org/abs/2005.14165",
        citationCount: 31204,
        documentType: "article",
        openAccess: "gold",
        keywords: ["GPT-3", "few-shot learning", "language models", "scaling"],
        source: "arXiv",
      },
      {
        id: "10.18653/v1/2020.acl-main.463",
        title: "Beyond Accuracy: Behavioral Testing of NLP Models with CheckList",
        authors: [
          { name: "Marco Tulio Ribeiro", affiliation: "Microsoft Research", orcid: null },
          { name: "Tongshuang Wu", affiliation: "University of Washington", orcid: null },
          { name: "Carlos Guestrin", affiliation: "University of Washington", orcid: null },
          { name: "Sameer Singh", affiliation: "UC Irvine", orcid: null },
        ],
        abstract:
          "Although measuring held-out accuracy has been the primary approach to evaluate generalization, it often overestimates the performance of NLP models. We propose CheckList, a task-agnostic methodology for testing NLP models.",
        journal: "Proceedings of the 58th Annual Meeting of the Association for Computational Linguistics",
        publisher: "ACL",
        year: 2020,
        doi: "10.18653/v1/2020.acl-main.463",
        url: "https://doi.org/10.18653/v1/2020.acl-main.463",
        citationCount: 1893,
        documentType: "conference",
        openAccess: "green",
        keywords: ["NLP evaluation", "behavioral testing", "model robustness"],
        source: "Semantic Scholar",
      },
      {
        id: "10.48550/arXiv.1706.03762",
        title: "Attention Is All You Need",
        authors: [
          { name: "Ashish Vaswani", affiliation: "Google Brain", orcid: null },
          { name: "Noam Shazeer", affiliation: "Google Brain", orcid: null },
          { name: "Niki Parmar", affiliation: "Google Research", orcid: null },
        ],
        abstract:
          "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.",
        journal: "Advances in Neural Information Processing Systems",
        publisher: "NeurIPS",
        year: 2017,
        doi: "10.48550/arXiv.1706.03762",
        url: "https://arxiv.org/abs/1706.03762",
        citationCount: 98432,
        documentType: "article",
        openAccess: "gold",
        keywords: ["transformer", "attention mechanism", "sequence modeling", "deep learning"],
        source: "arXiv",
      },
    ],
  };
}
