import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import {
  humanLikelihood,
  toPercent,
  verdictBandFor,
  verdictBandForProbability,
} from "@/lib/ai-detection/scoring";
import type { DetectionResult } from "@/lib/ai-detection/types";

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

const RISK_BADGE: Record<string, string> = {
  "risk-none": "bg-risk-none/12 text-risk-none",
  "risk-low": "bg-risk-low/16 text-risk-low",
  "risk-medium": "bg-risk-medium/16 text-risk-medium",
  "risk-high": "bg-risk-high/16 text-risk-high",
  "risk-critical": "bg-risk-critical/16 text-risk-critical",
};

interface LikelihoodRingProps {
  readonly aiProbability: number;
  readonly humanPercent: number;
  readonly size?: number;
  readonly strokeWidth?: number;
}

function LikelihoodRing({
  aiProbability,
  humanPercent,
  size = 120,
  strokeWidth = 8,
}: LikelihoodRingProps) {
  const band = verdictBandForProbability(aiProbability);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - humanPercent / 100);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <figure
      role="img"
      aria-label={`Human-written likelihood: ${humanPercent}%`}
      className="relative inline-flex items-center justify-center"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
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
          {humanPercent}%
        </text>
        <text
          x={cx}
          y={cy + size * 0.16}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.1}
          className="fill-fg-muted"
        >
          human
        </text>
      </svg>
    </figure>
  );
}

interface DetectorSummaryProps {
  readonly result: DetectionResult;
  readonly className?: string;
}

export function DetectorSummary({ result, className }: DetectorSummaryProps) {
  const human = humanLikelihood(result);
  const band = verdictBandFor(result);
  const analyzedAt = new Date(result.analyzedAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <Card className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-col gap-1">
        <h1 className="text-h2 font-semibold text-fg">{result.documentTitle}</h1>
        <p className="text-body-sm text-fg-muted">
          Analyzed {analyzedAt} · {result.wordCount.toLocaleString()} words ·{" "}
          <span className="font-mono text-caption">{result.id}</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-8">
        <LikelihoodRing
          aiProbability={result.aiProbability}
          humanPercent={human}
          size={120}
        />

        <div className="flex flex-1 flex-col gap-4 min-w-48">
          <div className="flex flex-col gap-1">
            <span
              className={cn(
                "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-body-sm font-medium",
                RISK_BADGE[band.token],
              )}
            >
              <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
              {band.label}
            </span>
            <span className="text-body-sm text-fg-muted">
              {toPercent(result.aiProbability)}% estimated AI probability ·{" "}
              {toPercent(result.confidence)}% model confidence
            </span>
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="flex flex-col gap-0.5">
              <span className="text-caption text-fg-muted">Perplexity</span>
              <span className="text-h3 font-semibold tabular-nums text-fg">
                {result.perplexity.toFixed(1)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-caption text-fg-muted">Burstiness</span>
              <span className="text-h3 font-semibold tabular-nums text-fg">
                {result.burstiness.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-caption text-fg-muted">Sentences</span>
              <span className="text-h3 font-semibold tabular-nums text-fg">
                {result.sentences.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      <p className="rounded-md border border-border bg-bg-muted/50 px-4 py-3 text-caption text-fg-muted">
        AI detection is probabilistic and can produce false positives, especially
        for non-native writers and heavily edited text. Use this estimate as one
        signal among many — never as sole evidence of misconduct.
      </p>
    </Card>
  );
}
