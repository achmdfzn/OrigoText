import type { MatchKind } from "@/lib/plagiarism/types";
import { cn } from "@/lib/cn";
import { matchKindLabel, riskBandForSimilarity, toPercent } from "@/lib/plagiarism/scoring";

interface HighlightSpanProps {
  readonly text: string;
  readonly kind: MatchKind;
  readonly similarity: number;
  readonly confidence: number;
  readonly sourceTitle: string;
}

const HIGHLIGHT_CLASSES: Record<string, string> = {
  "risk-none": "bg-risk-none/15 border-l-2 border-risk-none",
  "risk-low": "bg-risk-low/15 border-l-2 border-risk-low",
  "risk-medium": "bg-risk-medium/15 border-l-2 border-risk-medium",
  "risk-high": "bg-risk-high/15 border-l-2 border-risk-high",
  "risk-critical": "bg-risk-critical/15 border-l-2 border-risk-critical",
};

export function HighlightSpan({
  text,
  kind,
  similarity,
  confidence,
  sourceTitle,
}: HighlightSpanProps) {
  const band = riskBandForSimilarity(similarity);
  const highlightClass = HIGHLIGHT_CLASSES[band.token];

  return (
    <mark
      className={cn(
        "relative cursor-pointer rounded-sm px-0.5 underline decoration-dotted decoration-1 underline-offset-2 transition-opacity hover:opacity-80",
        highlightClass,
      )}
      title={`${sourceTitle} · ${matchKindLabel(kind)} · ${toPercent(similarity)}% similarity · ${toPercent(confidence)}% confidence`}
      aria-label={`Matched text: ${matchKindLabel(kind)}, ${toPercent(similarity)}% similarity from "${sourceTitle}"`}
    >
      {text}
    </mark>
  );
}

interface PlainSegmentProps {
  readonly text: string;
}

export function PlainSegment({ text }: PlainSegmentProps) {
  return <span>{text}</span>;
}
