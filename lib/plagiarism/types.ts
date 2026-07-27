export type RiskLevel = "none" | "low" | "medium" | "high" | "critical";

export type MatchKind =
  | "verbatim"
  | "near-duplicate"
  | "paraphrase"
  | "cross-language"
  | "cited";

export interface SourceRef {
  readonly id: string;
  readonly title: string;
  readonly authors: ReadonlyArray<string>;
  readonly container: string;
  readonly year: number;
  readonly doi: string | null;
  readonly url: string;
  readonly openAccess: boolean;
}

export interface MatchedSpan {
  readonly id: string;
  readonly sourceId: string;
  readonly submissionText: string;
  readonly sourceText: string;
  readonly submissionStart: number;
  readonly submissionEnd: number;
  readonly kind: MatchKind;
  readonly similarity: number;
  readonly confidence: number;
}

export interface SourceMatch {
  readonly source: SourceRef;
  readonly similarity: number;
  readonly confidence: number;
  readonly matchedWords: number;
  readonly spans: ReadonlyArray<MatchedSpan>;
}

export interface PlagiarismReport {
  readonly id: string;
  readonly documentTitle: string;
  readonly wordCount: number;
  readonly checkedAt: string;
  readonly overallSimilarity: number;
  readonly riskLevel: RiskLevel;
  readonly sources: ReadonlyArray<SourceMatch>;
  readonly submissionText: string;
}

export interface RiskBand {
  readonly level: RiskLevel;
  readonly label: string;
  readonly token: string;
  readonly lowerBound: number;
}
