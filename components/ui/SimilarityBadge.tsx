import { cn } from "@/lib/cn";
import { riskBandForSimilarity, toPercent } from "@/lib/plagiarism/scoring";

const RISK_CLASSES: Record<string, string> = {
  "risk-none": "bg-risk-none/12 text-risk-none",
  "risk-low": "bg-risk-low/16 text-risk-low",
  "risk-medium": "bg-risk-medium/16 text-risk-medium",
  "risk-high": "bg-risk-high/16 text-risk-high",
  "risk-critical": "bg-risk-critical/16 text-risk-critical",
};

interface SimilarityBadgeProps {
  readonly similarity: number;
  readonly showLabel?: boolean;
  readonly className?: string;
}

export function SimilarityBadge({
  similarity,
  showLabel = true,
  className,
}: SimilarityBadgeProps) {
  const band = riskBandForSimilarity(similarity);
  const percent = toPercent(similarity);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-medium tabular-nums",
        RISK_CLASSES[band.token],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full bg-current"
      />
      {percent}%
      {showLabel ? (
        <span className="font-normal opacity-80">{band.label}</span>
      ) : null}
    </span>
  );
}
