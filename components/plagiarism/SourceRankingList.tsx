import { SimilarityBadge } from "@/components/ui/SimilarityBadge";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { matchKindLabel, rankSources, toPercent } from "@/lib/plagiarism/scoring";
import type { PlagiarismReport, SourceMatch } from "@/lib/plagiarism/types";

interface SourceRowProps {
  readonly match: SourceMatch;
  readonly rank: number;
  readonly isSelected: boolean;
  readonly onSelect: (id: string) => void;
}

function SourceRow({ match, rank, isSelected, onSelect }: SourceRowProps) {
  const { source } = match;
  const kinds = [...new Set(match.spans.map((s) => s.kind))];

  return (
    <button
      type="button"
      onClick={() => onSelect(source.id)}
      className={cn(
        "w-full rounded-md border px-4 py-3 text-left transition-colors duration-150",
        "hover:border-accent hover:bg-accent-weak",
        isSelected
          ? "border-accent bg-accent-weak"
          : "border-border bg-bg",
      )}
      aria-pressed={isSelected}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-caption font-medium tabular-nums text-fg-muted">
              #{rank}
            </span>
            <span className="truncate text-body-sm font-medium text-fg">
              {source.title}
            </span>
            {source.openAccess ? (
              <span className="shrink-0 rounded-sm bg-success/12 px-1.5 py-0.5 text-caption font-medium text-success">
                OA
              </span>
            ) : null}
          </div>
          <p className="text-caption text-fg-muted">
            {source.authors.slice(0, 2).join(", ")}
            {source.authors.length > 2 ? " et al." : ""} ·{" "}
            {source.container} · {source.year}
          </p>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {kinds.map((kind) => (
              <span
                key={kind}
                className="rounded-sm bg-bg-muted px-1.5 py-0.5 text-caption text-fg-muted"
              >
                {matchKindLabel(kind)}
              </span>
            ))}
            <span className="rounded-sm bg-bg-muted px-1.5 py-0.5 text-caption text-fg-muted">
              {match.matchedWords} words matched
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <SimilarityBadge similarity={match.similarity} showLabel={false} />
          <span className="text-caption text-fg-muted">
            {toPercent(match.confidence)}% conf.
          </span>
        </div>
      </div>
    </button>
  );
}

interface SourceRankingListProps {
  readonly report: PlagiarismReport;
  readonly selectedSourceId: string | null;
  readonly onSelectSource: (id: string) => void;
  readonly className?: string;
}

export function SourceRankingList({
  report,
  selectedSourceId,
  onSelectSource,
  className,
}: SourceRankingListProps) {
  const ranked = rankSources(report.sources);

  return (
    <Card className={cn("flex flex-col gap-4", className)}>
      <CardHeader>
        <CardTitle>Matched sources</CardTitle>
      </CardHeader>
      <div className="flex flex-col gap-2">
        {ranked.map((match, index) => (
          <SourceRow
            key={match.source.id}
            match={match}
            rank={index + 1}
            isSelected={selectedSourceId === match.source.id}
            onSelect={onSelectSource}
          />
        ))}
      </div>
    </Card>
  );
}
