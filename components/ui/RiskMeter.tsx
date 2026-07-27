import { cn } from "@/lib/cn";
import { riskBandForSimilarity, toPercent } from "@/lib/plagiarism/scoring";

interface RiskMeterProps {
  readonly similarity: number;
  readonly label?: string;
  readonly className?: string;
}

const FILL_CLASSES: Record<string, string> = {
  "risk-none": "bg-risk-none",
  "risk-low": "bg-risk-low",
  "risk-medium": "bg-risk-medium",
  "risk-high": "bg-risk-high",
  "risk-critical": "bg-risk-critical",
};

export function RiskMeter({ similarity, label, className }: RiskMeterProps) {
  const band = riskBandForSimilarity(similarity);
  const percent = toPercent(similarity);
  const fillClass = FILL_CLASSES[band.token];

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label !== undefined ? (
        <div className="flex items-center justify-between">
          <span className="text-body-sm text-fg-muted">{label}</span>
          <span className="text-body-sm font-medium tabular-nums text-fg">
            {percent}%
          </span>
        </div>
      ) : null}
      <div
        role="meter"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? `Similarity ${percent}%`}
        className="h-2 w-full overflow-hidden rounded-full bg-bg-muted"
      >
        <div
          className={cn("h-full rounded-full transition-all duration-300", fillClass)}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-caption text-fg-muted">{band.label} similarity</span>
    </div>
  );
}
