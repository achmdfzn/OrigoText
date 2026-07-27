import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { toPercent } from "@/lib/ai-detection/scoring";
import type { DetectionResult, SentenceLabel } from "@/lib/ai-detection/types";

const LEAN_TOKEN: Record<SentenceLabel, string> = {
  human: "risk-none",
  mixed: "risk-medium",
  ai: "risk-high",
};

const FILL_CLASSES: Record<string, string> = {
  "risk-none": "bg-risk-none",
  "risk-medium": "bg-risk-medium",
  "risk-high": "bg-risk-high",
};

const LEAN_LABEL: Record<SentenceLabel, string> = {
  human: "leans human",
  mixed: "mixed",
  ai: "leans AI",
};

interface DetectorSignalsProps {
  readonly result: DetectionResult;
  readonly className?: string;
}

export function DetectorSignals({ result, className }: DetectorSignalsProps) {
  return (
    <Card className={cn("flex flex-col gap-4", className)}>
      <CardHeader>
        <CardTitle>Linguistic signals</CardTitle>
        <CardDescription>
          Feature-level evidence behind the estimate
        </CardDescription>
      </CardHeader>

      <ul className="flex flex-col gap-4">
        {result.signals.map((signal) => {
          const token = LEAN_TOKEN[signal.leansToward];
          const percent = toPercent(signal.value);
          return (
            <li key={signal.id} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-body-sm font-medium text-fg">
                  {signal.label}
                </span>
                <span className="text-caption text-fg-muted">
                  {LEAN_LABEL[signal.leansToward]}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-muted">
                <div
                  className={cn("h-full rounded-full", FILL_CLASSES[token])}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="text-caption text-fg-muted">{signal.description}</p>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <span className="text-body-sm font-medium text-fg">
          Stylistic affinity
        </span>
        <p className="text-caption text-fg-muted">
          Relative similarity to known model families — not an attribution.
        </p>
        <ul className="flex flex-col gap-2 pt-1">
          {result.suspectedModels.map((model) => (
            <li key={model.family} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-caption text-fg-muted">
                {model.family}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-muted">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${toPercent(model.affinity)}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-caption tabular-nums text-fg-muted">
                {toPercent(model.affinity)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
