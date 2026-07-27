export type Verdict = "human" | "uncertain" | "mixed" | "likely-ai" | "ai";

export type SentenceLabel = "human" | "mixed" | "ai";

export interface FeatureSignal {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly description: string;
  readonly leansToward: SentenceLabel;
}

export interface SentencePrediction {
  readonly id: string;
  readonly text: string;
  readonly aiProbability: number;
}

export interface SuspectedModel {
  readonly family: string;
  readonly affinity: number;
}

export interface DetectionResult {
  readonly id: string;
  readonly documentTitle: string;
  readonly wordCount: number;
  readonly analyzedAt: string;
  readonly aiProbability: number;
  readonly confidence: number;
  readonly verdict: Verdict;
  readonly perplexity: number;
  readonly burstiness: number;
  readonly signals: ReadonlyArray<FeatureSignal>;
  readonly sentences: ReadonlyArray<SentencePrediction>;
  readonly suspectedModels: ReadonlyArray<SuspectedModel>;
}

export interface VerdictBand {
  readonly verdict: Verdict;
  readonly label: string;
  readonly token: string;
  readonly lowerBound: number;
}
