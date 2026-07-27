import type { Reference } from "./types";

function normalizeDoi(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:/i, "")
    .toLowerCase();
}

export function resolveDoi(raw: string): Reference | null {
  const target = normalizeDoi(raw);
  return SAMPLE_LIBRARY.find(
    (ref) => ref.doi !== null && ref.doi.toLowerCase() === target,
  ) ?? null;
}

export const SAMPLE_LIBRARY: ReadonlyArray<Reference> = [
  {
    id: "ref_001",
    type: "article",
    title: "Attention Is All You Need",
    authors: [
      { given: "Ashish", family: "Vaswani", orcid: null },
      { given: "Noam", family: "Shazeer", orcid: null },
      { given: "Niki", family: "Parmar", orcid: null },
      { given: "Jakob", family: "Uszkoreit", orcid: null },
    ],
    year: 2017,
    journal: "Advances in Neural Information Processing Systems",
    volume: "30",
    issue: null,
    pages: "5998–6008",
    publisher: "NeurIPS",
    place: null,
    doi: "10.48550/arXiv.1706.03762",
    url: "https://arxiv.org/abs/1706.03762",
    accessedDate: null,
    addedAt: "2026-07-01T08:00:00+07:00",
    tags: ["deep learning", "transformers", "NLP"],
    notes: null,
  },
  {
    id: "ref_002",
    type: "conference",
    title: "On the Dangers of Stochastic Parrots: Can Language Models Be Too Big?",
    authors: [
      { given: "Emily M.", family: "Bender", orcid: null },
      { given: "Timnit", family: "Gebru", orcid: null },
      { given: "Angelina", family: "McMillan-Major", orcid: null },
      { given: "Shmargaret", family: "Shmitchell", orcid: null },
    ],
    year: 2021,
    journal: "FAccT '21",
    volume: null,
    issue: null,
    pages: "610–623",
    publisher: "ACM",
    place: "New York",
    doi: "10.1145/3442188.3445922",
    url: "https://doi.org/10.1145/3442188.3445922",
    accessedDate: null,
    addedAt: "2026-07-03T10:30:00+07:00",
    tags: ["AI ethics", "language models", "NLP"],
    notes: "Key reading for ethics section.",
  },
  {
    id: "ref_003",
    type: "article",
    title: "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
    authors: [
      { given: "Jacob", family: "Devlin", orcid: null },
      { given: "Ming-Wei", family: "Chang", orcid: null },
      { given: "Kenton", family: "Lee", orcid: null },
      { given: "Kristina", family: "Toutanova", orcid: null },
    ],
    year: 2019,
    journal: "Proceedings of NAACL-HLT 2019",
    volume: "1",
    issue: null,
    pages: "4171–4186",
    publisher: "ACL",
    place: null,
    doi: "10.18653/v1/N19-1423",
    url: "https://arxiv.org/abs/1810.04805",
    accessedDate: null,
    addedAt: "2026-07-05T14:00:00+07:00",
    tags: ["BERT", "pre-training", "NLP"],
    notes: null,
  },
];
