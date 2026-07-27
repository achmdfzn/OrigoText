import { ScoreRing } from "@/components/ui/ScoreRing";
import { RiskMeter } from "@/components/ui/RiskMeter";
import { SimilarityBadge } from "@/components/ui/SimilarityBadge";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import {
  highestRisk,
  originalityScore,
  toPercent,
  totalMatchedWords,
} from "@/lib/plagiarism/scoring";
import type { PlagiarismReport } from "@/lib/plagiarism/types";

interface StatProps {
  readonly label: string;
  readonly value: string | number;
  readonly sub?: string;
}

function Stat({ label, value, sub }: StatProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-caption text-fg-muted">{label}</span>
      <span className="text-h3 font-semibold tabular-nums text-fg">{value}</span>
      {sub !== undefined ? (
        <span className="text-caption text-fg-muted">{sub}</span>
      ) : null}
    </div>
  );
}

interface ReportSummaryProps {
  readonly report: PlagiarismReport;
  readonly className?: string;
}

export function ReportSummary({ report, className }: ReportSummaryProps) {
  const originality = originalityScore(report);
  const band = highestRisk(report);
  const matched = totalMatchedWords(report);
  const checkedAt = new Date(report.checkedAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <Card className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-col gap-1">
        <h1 className="text-h2 font-semibold text-fg">{report.documentTitle}</h1>
        <p className="text-body-sm text-fg-muted">
          Checked {checkedAt} · {report.wordCount.toLocaleString()} words ·{" "}
          <span className="font-mono text-caption">{report.id}</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-8">
        <ScoreRing originality={originality} size={120} />

        <div className="flex flex-1 flex-col gap-5 min-w-48">
          <RiskMeter
            similarity={report.overallSimilarity}
            label="Overall similarity"
          />
          <div className="flex flex-wrap gap-6">
            <Stat
              label="Matched words"
              value={matched.toLocaleString()}
              sub={`of ${report.wordCount.toLocaleString()}`}
            />
            <Stat
              label="Sources found"
              value={report.sources.length}
            />
            <Stat
              label="Risk level"
              value={band.label}
            />
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 self-start">
          <SimilarityBadge similarity={report.overallSimilarity} />
          <span className="text-caption text-fg-muted">
            {toPercent(report.overallSimilarity)}% similarity detected
          </span>
        </div>
      </div>
    </Card>
  );
}
