"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { formatReference } from "@/lib/citations/formatting";
import type { CitationStyle, Reference } from "@/lib/citations/types";
import { CITATION_STYLE_LABELS } from "@/lib/citations/types";

const STYLES = Object.keys(CITATION_STYLE_LABELS) as CitationStyle[];

const TYPE_LABELS: Record<Reference["type"], string> = {
  article: "Article",
  book: "Book",
  chapter: "Chapter",
  conference: "Conference",
  thesis: "Thesis",
  report: "Report",
  website: "Website",
  preprint: "Preprint",
};

interface ReferenceListProps {
  readonly references: ReadonlyArray<Reference>;
  readonly selectedIds: ReadonlyArray<string>;
  readonly onToggle: (id: string) => void;
}

export function ReferenceList({
  references,
  selectedIds,
  onToggle,
}: ReferenceListProps) {
  const [style, setStyle] = useState<CitationStyle>("apa7");

  return (
    <Card className="flex flex-col gap-4">
      <CardHeader>
        <CardTitle>Library</CardTitle>
        <CardDescription>
          {references.length} reference{references.length !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>

      <div
        role="group"
        aria-label="Citation style"
        className="flex flex-wrap gap-1.5"
      >
        {STYLES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStyle(s)}
            aria-pressed={style === s}
            className={cn(
              "rounded-full px-3 py-1 text-caption font-medium transition-colors duration-150",
              style === s
                ? "bg-accent text-white"
                : "bg-bg-muted text-fg-muted hover:text-fg",
            )}
          >
            {CITATION_STYLE_LABELS[s]}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-2">
        {references.map((ref, i) => {
          const selected = selectedIds.includes(ref.id);
          const formatted = formatReference(ref, style, i + 1);
          return (
            <li key={ref.id}>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors duration-150",
                  selected
                    ? "border-accent bg-accent/5"
                    : "border-border hover:border-accent/40",
                )}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggle(ref.id)}
                  className="mt-0.5 size-4 shrink-0 rounded border-border text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                />
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-body-sm font-medium text-fg leading-snug">
                      {ref.title}
                    </span>
                    <span className="shrink-0 rounded-full bg-bg-muted px-2 py-0.5 text-caption text-fg-muted">
                      {TYPE_LABELS[ref.type]}
                    </span>
                  </div>
                  <p className="text-caption text-fg-muted leading-relaxed">
                    {formatted}
                  </p>
                  {ref.tags.length > 0 ? (
                    <ul className="flex flex-wrap gap-1 pt-0.5">
                      {ref.tags.map((tag) => (
                        <li
                          key={tag}
                          className="rounded-full border border-border px-2 py-0.5 text-caption text-fg-muted"
                        >
                          {tag}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </label>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
