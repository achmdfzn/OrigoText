import type {
  DetectionResult,
  SentenceLabel,
  SentencePrediction,
  VerdictBand,
} from "./types";

/**
 * Thresholds mirror `_verdict` in backend/ai_detection/application/service.py.
 * Keep both sides in sync when either changes.
 */
const VERDICT_BANDS: ReadonlyArray<VerdictBand> = [
  { verdict: "ai", label: "Likely AI-generated", token: "risk-critical", lowerBound: 0.8 },
  { verdict: "likely-ai", label: "Leans AI-generated", token: "risk-high", lowerBound: 0.6 },
  { verdict: "mixed", label: "Mixed signals", token: "risk-medium", lowerBound: 0.4 },
  { verdict: "uncertain", label: "Inconclusive", token: "risk-low", lowerBound: 0.2 },
  { verdict: "human", label: "Likely human-written", token: "risk-none", lowerBound: 0 },
];

const SENTENCE_LABEL_BANDS: ReadonlyArray<{
  readonly label: SentenceLabel;
  readonly token: string;
  readonly lowerBound: number;
}> = [
  { label: "ai", token: "risk-high", lowerBound: 0.6 },
  { label: "mixed", token: "risk-medium", lowerBound: 0.35 },
  { label: "human", token: "risk-none", lowerBound: 0 },
];

function clampUnit(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function verdictBandForProbability(probability: number): VerdictBand {
  const value = clampUnit(probability);
  const band = VERDICT_BANDS.find((candidate) => value >= candidate.lowerBound);
  return band ?? VERDICT_BANDS[VERDICT_BANDS.length - 1];
}

/**
 * Prefers the verdict the backend assigned over recomputing it from the
 * probability, so the label never contradicts the result being rendered.
 */
export function verdictBandFor(result: DetectionResult): VerdictBand {
  const band = VERDICT_BANDS.find((candidate) => candidate.verdict === result.verdict);
  return band ?? verdictBandForProbability(result.aiProbability);
}

export function sentenceLabelForProbability(probability: number): {
  readonly label: SentenceLabel;
  readonly token: string;
} {
  const value = clampUnit(probability);
  const band =
    SENTENCE_LABEL_BANDS.find((candidate) => value >= candidate.lowerBound) ??
    SENTENCE_LABEL_BANDS[SENTENCE_LABEL_BANDS.length - 1];
  return { label: band.label, token: band.token };
}

export function humanLikelihood(result: DetectionResult): number {
  return Math.round((1 - clampUnit(result.aiProbability)) * 100);
}

export function toPercent(value: number): number {
  return Math.round(clampUnit(value) * 100);
}

export function countSentenceLabels(
  sentences: ReadonlyArray<SentencePrediction>,
): Readonly<Record<SentenceLabel, number>> {
  return sentences.reduce(
    (acc, sentence) => {
      const { label } = sentenceLabelForProbability(sentence.aiProbability);
      return { ...acc, [label]: acc[label] + 1 };
    },
    { human: 0, mixed: 0, ai: 0 } as Record<SentenceLabel, number>,
  );
}
