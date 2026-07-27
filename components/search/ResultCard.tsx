import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import {
  DOCUMENT_TYPE_LABELS,
  OPEN_ACCESS_LABELS,
  formatAuthors,
  formatCitations,
  isOpenAccess,
} from "@/lib/search/filtering";
import type { SearchResult } from "@/lib/search/types";

interface ResultCardProps {
  readonly result: SearchResult;
}

export function ResultCard({ result }: ResultCardProps) {
  const openAccess = isOpenAccess(result.openAccess);

  return (
    <Card className="flex flex-col gap-3 transition-colors duration-150 hover:border-accent/40">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-h3 font-semibold leading-snug text-fg">
          <a
            href={result.url}
            target="_blank"
            rel="noreferrer noopener"
            className="hover:text-accent transition-colors"
          >
            {result.title}
          </a>
        </h3>
        <span className="shrink-0 rounded-full bg-bg-muted px-2.5 py-0.5 text-caption font-medium text-fg-muted">
          {DOCUMENT_TYPE_LABELS[result.documentType]}
        </span>
      </div>

      <p className="text-body-sm text-fg-muted">
        {formatAuthors(result.authors)}
        {result.year !== null ? ` · ${result.year}` : ""}
        {result.journal !== null ? ` · ${result.journal}` : ""}
      </p>

      {result.abstract !== null ? (
        <p className="line-clamp-3 text-body-sm leading-relaxed text-fg">
          {result.abstract}
        </p>
      ) : null}

      {result.keywords.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {result.keywords.map((keyword) => (
            <li
              key={keyword}
              className="rounded-full border border-border px-2 py-0.5 text-caption text-fg-muted"
            >
              {keyword}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3 text-caption text-fg-muted">
        <span className="inline-flex items-center gap-1.5 font-medium text-fg">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M7 1.5l1.7 3.4 3.8.6-2.7 2.7.6 3.8L7 10.6 3.6 12l.6-3.8L1.5 5.5l3.8-.6z"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
          {formatCitations(result.citationCount)} citations
        </span>

        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium",
            openAccess
              ? "bg-success/12 text-success"
              : "bg-bg-muted text-fg-muted",
          )}
        >
          <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
          {OPEN_ACCESS_LABELS[result.openAccess]}
        </span>

        {result.doi !== null ? (
          <a
            href={`https://doi.org/${result.doi}`}
            target="_blank"
            rel="noreferrer noopener"
            className="font-mono hover:text-accent transition-colors"
          >
            {result.doi}
          </a>
        ) : null}

        <span className="ml-auto">via {result.source}</span>
      </div>
    </Card>
  );
}
