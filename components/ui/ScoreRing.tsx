import { cn } from "@/lib/cn";
import { riskBandForSimilarity } from "@/lib/plagiarism/scoring";

interface ScoreRingProps {
  readonly originality: number;
  readonly size?: number;
  readonly strokeWidth?: number;
  readonly className?: string;
}

const RISK_STROKE: Record<string, string> = {
  "risk-none": "stroke-risk-none",
  "risk-low": "stroke-risk-low",
  "risk-medium": "stroke-risk-medium",
  "risk-high": "stroke-risk-high",
  "risk-critical": "stroke-risk-critical",
};

const RISK_TEXT: Record<string, string> = {
  "risk-none": "fill-risk-none",
  "risk-low": "fill-risk-low",
  "risk-medium": "fill-risk-medium",
  "risk-high": "fill-risk-high",
  "risk-critical": "fill-risk-critical",
};

export function ScoreRing({
  originality,
  size = 120,
  strokeWidth = 8,
  className,
}: ScoreRingProps) {
  const similarity = 1 - originality / 100;
  const band = riskBandForSimilarity(similarity);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - originality / 100);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <figure
      role="img"
      aria-label={`Originality score: ${originality}%`}
      className={cn("relative inline-flex items-center justify-center", className)}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-bg-muted"
        />
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          className={cn(
            "transition-[stroke-dashoffset] duration-500",
            RISK_STROKE[band.token],
          )}
        />
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.22}
          fontWeight={600}
          className={RISK_TEXT[band.token]}
        >
          {originality}%
        </text>
        <text
          x={cx}
          y={cy + size * 0.16}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.1}
          className="fill-fg-muted"
        >
          original
        </text>
      </svg>
    </figure>
  );
}
