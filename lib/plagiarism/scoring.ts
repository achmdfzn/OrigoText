import type {
  MatchKind,
  MatchedSpan,
  PlagiarismReport,
  RiskBand,
  RiskLevel,
  SourceMatch,
} from "./types";

const RISK_BANDS: ReadonlyArray<RiskBand> = [
  { level: "critical", label: "Very high", token: "risk-critical", lowerBound: 0.6 },
  { level: "high", label: "High", token: "risk-high", lowerBound: 0.4 },
  { level: "medium", label: "Moderate", token: "risk-medium", lowerBound: 0.2 },
  { level: "low", label: "Some", token: "risk-low", lowerBound: 0.08 },
  { level: "none", label: "Low", token: "risk-none", lowerBound: 0 },
];

const MATCH_KIND_LABELS: Readonly<Record<MatchKind, string>> = {
  verbatim: "Verbatim",
  "near-duplicate": "Near-duplicate",
  paraphrase: "Paraphrase",
  "cross-language": "Cross-language",
  cited: "Cited",
};

function clampUnit(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function riskBandForSimilarity(similarity: number): RiskBand {
  const value = clampUnit(similarity);
  const band = RISK_BANDS.find((candidate) => value >= candidate.lowerBound);
  return band ?? RISK_BANDS[RISK_BANDS.length - 1];
}

export function riskLevelForSimilarity(similarity: number): RiskLevel {
  return riskBandForSimilarity(similarity).level;
}

export function originalityScore(report: PlagiarismReport): number {
  return Math.round((1 - clampUnit(report.overallSimilarity)) * 100);
}

export function toPercent(value: number): number {
  return Math.round(clampUnit(value) * 100);
}

export function matchKindLabel(kind: MatchKind): string {
  return MATCH_KIND_LABELS[kind];
}

export function rankSources(
  sources: ReadonlyArray<SourceMatch>,
): ReadonlyArray<SourceMatch> {
  return [...sources].sort((a, b) => {
    if (b.similarity !== a.similarity) return b.similarity - a.similarity;
    return b.confidence - a.confidence;
  });
}

export function totalMatchedWords(report: PlagiarismReport): number {
  return report.sources.reduce((sum, source) => sum + source.matchedWords, 0);
}

export function highestRisk(
  report: PlagiarismReport,
): RiskBand {
  return riskBandForSimilarity(report.overallSimilarity);
}

export interface TextSegment {
  readonly text: string;
  readonly span: MatchedSpan | null;
}

export function segmentSubmission(
  report: PlagiarismReport,
): ReadonlyArray<TextSegment> {
  const spans = report.sources
    .flatMap((source) => source.spans)
    .filter((span) => span.submissionEnd > span.submissionStart)
    .sort((a, b) => a.submissionStart - b.submissionStart);

  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const span of spans) {
    if (span.submissionStart < cursor) continue;
    if (span.submissionStart > cursor) {
      segments.push({
        text: report.submissionText.slice(cursor, span.submissionStart),
        span: null,
      });
    }
    segments.push({
      text: report.submissionText.slice(span.submissionStart, span.submissionEnd),
      span,
    });
    cursor = span.submissionEnd;
  }

  if (cursor < report.submissionText.length) {
    segments.push({ text: report.submissionText.slice(cursor), span: null });
  }

  return segments;
}
