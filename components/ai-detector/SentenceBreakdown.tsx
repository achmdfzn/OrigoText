import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import {
  countSentenceLabels,
  sentenceLabelForProbability,
  toPercent,
} from "@/lib/ai-detection/scoring";
import type { DetectionResult, SentenceLabel } from "@/lib/ai-detection/types";

const SENTENCE_CLASSES: Record<string, string> = {
  "risk-none": "bg-risk-none/12 border-l-2 border-risk-none",
  "risk-medium": "bg-risk-medium/15 border-l-2 border-risk-medium",
  "risk-high": "bg-risk-high/15 border-l-2 border-risk-high",
};

const LABEL_TEXT: Record<SentenceLabel, string> = {
  human: "Likely human",
  mixed: "Mixed",
  ai: "Likely AI",
};

interface SentenceBreakdownProps {
  readonly result: DetectionResult;
  readonly className?: string;
}

export function SentenceBreakdown({ result, className }: SentenceBreakdownProps) {
  const counts = countSentenceLabels(result.sentences);

  return (
    <Card className={cn("flex flex-col gap-4", className)}>
      <CardHeader>
        <CardTitle>Sentence-level analysis</CardTitle>
        <CardDescription>
          {counts.ai} likely AI · {counts.mixed} mixed · {counts.human} likely
          human
        </CardDescription>
      </CardHeader>

      <div className="flex flex-wrap gap-3 text-caption text-fg-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border-l-2 border-risk-high bg-risk-high/15" />
          Likely AI
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border-l-2 border-risk-medium bg-risk-medium/15" />
          Mixed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border-l-2 border-risk-none bg-risk-none/12" />
          Likely human
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {result.sentences.map((sentence) => {
          const { label, token } = sentenceLabelForProbability(
            sentence.aiProbability,
          );
          return (
            <li
              key={sentence.id}
              className={cn(
                "flex items-start gap-3 rounded-sm px-3 py-2",
                SENTENCE_CLASSES[token],
              )}
            >
              <p className="flex-1 text-body-sm leading-relaxed text-fg">
                {sentence.text}
              </p>
              <span
                className="shrink-0 pt-0.5 text-caption tabular-nums text-fg-muted"
                title={`${LABEL_TEXT[label]} · ${toPercent(sentence.aiProbability)}% AI probability`}
              >
                {toPercent(sentence.aiProbability)}%
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
