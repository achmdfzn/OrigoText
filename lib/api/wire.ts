/**
 * Wire-level shapes exactly as FastAPI serializes them: snake_case fields and
 * snake_case enum values. These types are the contract boundary — nothing
 * outside `lib/api` should import them. The per-feature domain types stay
 * idiomatic TypeScript, and the mappers translate between the two.
 *
 * Source of truth: backend/plagiarism/domain/models.py and
 * backend/ai_detection/domain/models.py (exposed via /openapi.json).
 */

export type WireRiskLevel = "none" | "low" | "medium" | "high" | "critical";

export type WireMatchKind =
  | "verbatim"
  | "near_duplicate"
  | "paraphrase"
  | "cross_language"
  | "cited";

export interface WireSourceRef {
  readonly id: string;
  readonly title: string;
  readonly authors: ReadonlyArray<string>;
  readonly container: string;
  readonly year: number;
  readonly doi: string | null;
  readonly url: string;
  readonly open_access: boolean;
}

export interface WireMatchedSpan {
  readonly id: string;
  readonly source_id: string;
  readonly submission_text: string;
  readonly source_text: string;
  readonly submission_start: number;
  readonly submission_end: number;
  readonly kind: WireMatchKind;
  readonly similarity: number;
  readonly confidence: number;
}

export interface WireSourceMatch {
  readonly source: WireSourceRef;
  readonly similarity: number;
  readonly confidence: number;
  readonly matched_words: number;
  readonly spans: ReadonlyArray<WireMatchedSpan>;
}

export interface WirePlagiarismReport {
  readonly id: string;
  readonly document_title: string;
  readonly word_count: number;
  readonly checked_at: string;
  readonly overall_similarity: number;
  readonly risk_level: WireRiskLevel;
  readonly sources: ReadonlyArray<WireSourceMatch>;
  readonly submission_text: string;
}

export type WireSentenceLabel = "human" | "mixed" | "ai";

export type WireVerdict = "human" | "uncertain" | "mixed" | "likely_ai" | "ai";

export interface WireFeatureSignal {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly description: string;
  readonly leans_toward: WireSentenceLabel;
}

export interface WireSentencePrediction {
  readonly id: string;
  readonly text: string;
  readonly ai_probability: number;
}

export interface WireSuspectedModel {
  readonly family: string;
  readonly affinity: number;
}

export interface WireDetectionResult {
  readonly id: string;
  readonly document_title: string;
  readonly word_count: number;
  readonly analyzed_at: string;
  readonly ai_probability: number;
  readonly confidence: number;
  readonly verdict: WireVerdict;
  readonly perplexity: number;
  readonly burstiness: number;
  readonly signals: ReadonlyArray<WireFeatureSignal>;
  readonly sentences: ReadonlyArray<WireSentencePrediction>;
  readonly suspected_models: ReadonlyArray<WireSuspectedModel>;
}

/** FastAPI's 422 body from Pydantic validation failures. */
export interface WireValidationError {
  readonly detail: ReadonlyArray<{
    readonly loc: ReadonlyArray<string | number>;
    readonly msg: string;
    readonly type: string;
  }>;
}
