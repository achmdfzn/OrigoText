import { HighlightSpan, PlainSegment } from "@/components/ui/HighlightSpan";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { segmentSubmission } from "@/lib/plagiarism/scoring";
import type { PlagiarismReport, SourceMatch } from "@/lib/plagiarism/types";

interface AnnotatedSubmissionProps {
  readonly report: PlagiarismReport;
  readonly selectedSource: SourceMatch | null;
  readonly className?: string;
}

export function AnnotatedSubmission({
  report,
  selectedSource,
  className,
}: AnnotatedSubmissionProps) {
  const segments = segmentSubmission(report);

  const visibleSpanIds = selectedSource
    ? new Set(selectedSource.spans.map((s) => s.id))
    : null;

  const sourceMap = new Map(
    report.sources.map((match) => [match.source.id, match.source]),
  );

  return (
    <Card className={cn("flex flex-col gap-4", className)}>
      <CardHeader>
        <CardTitle>Submission text</CardTitle>
        <CardDescription>
          {selectedSource
            ? `Showing matches from "${selectedSource.source.title}"`
            : "All matched passages highlighted — select a source to filter"}
        </CardDescription>
      </CardHeader>

      <div className="flex flex-wrap gap-2 text-caption text-fg-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border-l-2 border-risk-critical bg-risk-critical/15" />
          Very high
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border-l-2 border-risk-high bg-risk-high/15" />
          High
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border-l-2 border-risk-medium bg-risk-medium/15" />
          Moderate
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border-l-2 border-risk-low bg-risk-low/15" />
          Some
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border-l-2 border-risk-none bg-risk-none/15" />
          Low
        </span>
      </div>

      <p className="text-body leading-relaxed text-fg whitespace-pre-wrap">
        {segments.map((segment) => {
          if (segment.span === null) {
            return <PlainSegment key={`plain-${segment.text.slice(0, 12)}`} text={segment.text} />;
          }

          const isVisible =
            visibleSpanIds === null || visibleSpanIds.has(segment.span.id);

          if (!isVisible) {
            return <PlainSegment key={segment.span.id} text={segment.text} />;
          }

          const source = sourceMap.get(segment.span.sourceId);

          return (
            <HighlightSpan
              key={segment.span.id}
              text={segment.text}
              kind={segment.span.kind}
              similarity={segment.span.similarity}
              confidence={segment.span.confidence}
              sourceTitle={source?.title ?? "Unknown source"}
            />
          );
        })}
      </p>
    </Card>
  );
}
