import type {
  MatchKind,
  MatchedSpan,
  PlagiarismReport,
  SourceMatch,
  SourceRef,
} from "./types";

interface SpanSeed {
  readonly sourceId: string;
  readonly submissionText: string;
  readonly sourceText: string;
  readonly kind: MatchKind;
  readonly similarity: number;
  readonly confidence: number;
}

const submissionText = `Large language models have reshaped how researchers approach automated text generation. The transformer architecture, introduced in 2017, replaced recurrent networks with a mechanism based entirely on attention. This design allows the model to weigh the relevance of every token against every other token in the sequence, which in turn enables highly parallel training on modern hardware.

A central concern in academic integrity is the detection of text that has been paraphrased to obscure its origin. Rather than copying sentences word for word, a writer may restate the same ideas using different vocabulary and syntax. Detecting this form of reuse requires semantic comparison rather than surface string matching, because the lexical overlap between the two passages can be low even when the underlying meaning is nearly identical.

Retrieval-augmented generation combines a dense retriever with a generative model so that responses are grounded in an external corpus. The retriever first selects candidate passages, and the generator conditions its output on those passages. This approach reduces hallucination and lets the system cite the evidence it relied upon, which is essential for scholarly applications where provenance matters.

Our evaluation follows established methodology and reports precision, recall, and calibration on a held-out benchmark. We make no absolute claims about authorship; detection is probabilistic, and every score is presented with its confidence interval.`;

const sources: ReadonlyArray<SourceRef> = [
  {
    id: "src-1",
    title: "Attention Is All You Need",
    authors: ["Vaswani, A.", "Shazeer, N.", "Parmar, N."],
    container: "Advances in Neural Information Processing Systems",
    year: 2017,
    doi: "10.48550/arXiv.1706.03762",
    url: "https://doi.org/10.48550/arXiv.1706.03762",
    openAccess: true,
  },
  {
    id: "src-2",
    title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
    authors: ["Lewis, P.", "Perez, E.", "Piktus, A."],
    container: "Advances in Neural Information Processing Systems",
    year: 2020,
    doi: "10.48550/arXiv.2005.11401",
    url: "https://doi.org/10.48550/arXiv.2005.11401",
    openAccess: true,
  },
  {
    id: "src-3",
    title: "Semantic Similarity Methods for Paraphrase Detection",
    authors: ["Nguyen, T.", "Okazaki, N."],
    container: "Transactions of the Association for Computational Linguistics",
    year: 2021,
    doi: "10.1162/tacl_a_00380",
    url: "https://doi.org/10.1162/tacl_a_00380",
    openAccess: false,
  },
];

const spanSeeds: ReadonlyArray<SpanSeed> = [
  {
    sourceId: "src-1",
    submissionText:
      "The transformer architecture, introduced in 2017, replaced recurrent networks with a mechanism based entirely on attention.",
    sourceText:
      "We propose the Transformer, a model architecture eschewing recurrence and instead relying entirely on an attention mechanism.",
    kind: "paraphrase",
    similarity: 0.71,
    confidence: 0.88,
  },
  {
    sourceId: "src-1",
    submissionText:
      "This design allows the model to weigh the relevance of every token against every other token in the sequence, which in turn enables highly parallel training on modern hardware.",
    sourceText:
      "Self-attention allows each position to attend to all positions, and permits significantly more parallelization during training.",
    kind: "near-duplicate",
    similarity: 0.63,
    confidence: 0.82,
  },
  {
    sourceId: "src-2",
    submissionText:
      "Retrieval-augmented generation combines a dense retriever with a generative model so that responses are grounded in an external corpus.",
    sourceText:
      "RAG models combine a pre-trained retriever with a pre-trained seq2seq generator so that generation is grounded in retrieved documents.",
    kind: "paraphrase",
    similarity: 0.68,
    confidence: 0.85,
  },
  {
    sourceId: "src-3",
    submissionText:
      "Detecting this form of reuse requires semantic comparison rather than surface string matching, because the lexical overlap between the two passages can be low even when the underlying meaning is nearly identical.",
    sourceText:
      "Paraphrase detection must rely on semantic representations instead of lexical overlap, since reworded passages share little surface form while preserving meaning.",
    kind: "paraphrase",
    similarity: 0.57,
    confidence: 0.79,
  },
];

function buildSpans(): ReadonlyArray<MatchedSpan> {
  return spanSeeds.map((seed, index) => {
    const start = submissionText.indexOf(seed.submissionText);
    const end = start + seed.submissionText.length;
    return {
      id: `span-${index + 1}`,
      sourceId: seed.sourceId,
      submissionText: seed.submissionText,
      sourceText: seed.sourceText,
      submissionStart: start,
      submissionEnd: end,
      kind: seed.kind,
      similarity: seed.similarity,
      confidence: seed.confidence,
    };
  });
}

function countWords(value: string): number {
  const trimmed = value.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

function buildSourceMatches(
  spans: ReadonlyArray<MatchedSpan>,
): ReadonlyArray<SourceMatch> {
  return sources
    .map((source): SourceMatch | null => {
      const sourceSpans = spans.filter((span) => span.sourceId === source.id);
      if (sourceSpans.length === 0) return null;
      const matchedWords = sourceSpans.reduce(
        (sum, span) => sum + countWords(span.submissionText),
        0,
      );
      const similarity = Math.max(...sourceSpans.map((span) => span.similarity));
      const confidence =
        sourceSpans.reduce((sum, span) => sum + span.confidence, 0) /
        sourceSpans.length;
      return {
        source,
        similarity,
        confidence,
        matchedWords,
        spans: sourceSpans,
      };
    })
    .filter((match): match is SourceMatch => match !== null);
}

export function buildSampleReport(): PlagiarismReport {
  const spans = buildSpans();
  const sourceMatches = buildSourceMatches(spans);
  const wordCount = countWords(submissionText);
  const matchedWords = sourceMatches.reduce(
    (sum, match) => sum + match.matchedWords,
    0,
  );
  return {
    id: "chk_8Q2R7ZK",
    documentTitle: "Advances in Neural Text Generation and Detection.docx",
    wordCount,
    checkedAt: "2026-07-27T09:14:00+07:00",
    overallSimilarity: matchedWords / wordCount,
    sources: sourceMatches,
    submissionText,
  };
}
