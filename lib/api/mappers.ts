/**
 * Translation between wire shapes (snake_case, from FastAPI) and the domain
 * types the UI consumes. This is the only place naming conventions cross.
 */

import { ApiContractError } from "./errors";
import type {
  WireDetectionResult,
  WireMatchKind,
  WireMatchedSpan,
  WireParseResult,
  WirePlagiarismReport,
  WireSourceMatch,
  WireSourceRef,
  WireVerdict,
} from "./wire";
import type { ParseResult } from "@/lib/documents/types";
import type {
  MatchKind,
  MatchedSpan,
  PlagiarismReport,
  SourceMatch,
  SourceRef,
} from "@/lib/plagiarism/types";
import type {
  DetectionResult,
  FeatureSignal,
  SentencePrediction,
  SuspectedModel,
  Verdict,
} from "@/lib/ai-detection/types";

const MATCH_KIND_FROM_WIRE: Readonly<Record<WireMatchKind, MatchKind>> = {
  verbatim: "verbatim",
  near_duplicate: "near-duplicate",
  paraphrase: "paraphrase",
  cross_language: "cross-language",
  cited: "cited",
};

const VERDICT_FROM_WIRE: Readonly<Record<WireVerdict, Verdict>> = {
  human: "human",
  uncertain: "uncertain",
  mixed: "mixed",
  likely_ai: "likely-ai",
  ai: "ai",
};

function requireKnown<K extends string, V>(
  table: Readonly<Record<K, V>>,
  key: string,
  field: string,
): V {
  const mapped = (table as Record<string, V | undefined>)[key];
  if (mapped === undefined) {
    throw new ApiContractError(`Unknown ${field} received from API: "${key}".`);
  }
  return mapped;
}

function toSourceRef(wire: WireSourceRef): SourceRef {
  return {
    id: wire.id,
    title: wire.title,
    authors: wire.authors,
    container: wire.container,
    year: wire.year,
    doi: wire.doi,
    url: wire.url,
    openAccess: wire.open_access,
  };
}

function toMatchedSpan(wire: WireMatchedSpan): MatchedSpan {
  return {
    id: wire.id,
    sourceId: wire.source_id,
    submissionText: wire.submission_text,
    sourceText: wire.source_text,
    submissionStart: wire.submission_start,
    submissionEnd: wire.submission_end,
    kind: requireKnown(MATCH_KIND_FROM_WIRE, wire.kind, "match kind"),
    similarity: wire.similarity,
    confidence: wire.confidence,
  };
}

function toSourceMatch(wire: WireSourceMatch): SourceMatch {
  return {
    source: toSourceRef(wire.source),
    similarity: wire.similarity,
    confidence: wire.confidence,
    matchedWords: wire.matched_words,
    spans: wire.spans.map(toMatchedSpan),
  };
}

export function toPlagiarismReport(wire: WirePlagiarismReport): PlagiarismReport {
  return {
    id: wire.id,
    documentTitle: wire.document_title,
    wordCount: wire.word_count,
    checkedAt: wire.checked_at,
    overallSimilarity: wire.overall_similarity,
    riskLevel: wire.risk_level,
    sources: wire.sources.map(toSourceMatch),
    submissionText: wire.submission_text,
  };
}

export function toDetectionResult(wire: WireDetectionResult): DetectionResult {
  const signals: ReadonlyArray<FeatureSignal> = wire.signals.map((signal) => ({
    id: signal.id,
    label: signal.label,
    value: signal.value,
    description: signal.description,
    leansToward: signal.leans_toward,
  }));

  const sentences: ReadonlyArray<SentencePrediction> = wire.sentences.map((sentence) => ({
    id: sentence.id,
    text: sentence.text,
    aiProbability: sentence.ai_probability,
  }));

  const suspectedModels: ReadonlyArray<SuspectedModel> = wire.suspected_models.map((model) => ({
    family: model.family,
    affinity: model.affinity,
  }));

  return {
    id: wire.id,
    documentTitle: wire.document_title,
    wordCount: wire.word_count,
    analyzedAt: wire.analyzed_at,
    aiProbability: wire.ai_probability,
    confidence: wire.confidence,
    verdict: requireKnown(VERDICT_FROM_WIRE, wire.verdict, "verdict"),
    perplexity: wire.perplexity,
    burstiness: wire.burstiness,
    signals,
    sentences,
    suspectedModels,
  };
}

export function toParseResult(wire: WireParseResult): ParseResult {
  return {
    id: wire.id,
    filename: wire.filename,
    documentFormat: wire.document_format,
    byteSize: wire.byte_size,
    parsedAt: wire.parsed_at,
    metadata: {
      title: wire.metadata.title,
      authors: wire.metadata.authors,
      pageCount: wire.metadata.page_count,
      language: wire.metadata.language,
    },
    text: wire.text,
    wordCount: wire.word_count,
    characterCount: wire.character_count,
    sections: wire.sections.map((section) => ({
      id: section.id,
      kind: section.kind,
      heading: section.heading,
      text: section.text,
      startOffset: section.start_offset,
      endOffset: section.end_offset,
    })),
    chunks: wire.chunks.map((chunk) => ({
      id: chunk.id,
      sectionId: chunk.section_id,
      text: chunk.text,
      startOffset: chunk.start_offset,
      endOffset: chunk.end_offset,
      wordCount: chunk.word_count,
    })),
    truncated: wire.truncated,
    warnings: wire.warnings,
  };
}
