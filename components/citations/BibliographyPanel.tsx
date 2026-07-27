"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { CITATION_STYLE_LABELS } from "@/lib/citations/types";
import { formatBibliography } from "@/lib/citations/formatting";
import type { CitationStyle, Reference } from "@/lib/citations/types";

const STYLES = Object.keys(CITATION_STYLE_LABELS) as CitationStyle[];

interface BibliographyPanelProps {
  readonly references: ReadonlyArray<Reference>;
}

export function BibliographyPanel({ references }: BibliographyPanelProps) {
  const [style, setStyle] = useState<CitationStyle>("apa7");
  const [copied, setCopied] = useState(false);

  const entries = formatBibliography(references, style);
  const fullText = entries.map((e) => e.text).join("\n\n");

  function handleCopy() {
    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Card className="flex flex-col gap-4">
      <CardHeader>
        <CardTitle>Bibliography</CardTitle>
        <CardDescription>
          Formatted reference list — {references.length} source
          {references.length !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>

      <div className="flex flex-wrap items-center justify-between gap-3">
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
        <button
          type="button"
          onClick={handleCopy}
          className="text-body-sm font-medium text-accent hover:text-accent-hover transition-colors"
        >
          {copied ? "Copied!" : "Copy all"}
        </button>
      </div>

      <ol className="flex flex-col gap-3">
        {entries.map((entry, i) => (
          <li key={entry.id} className="flex gap-3 text-body-sm leading-relaxed text-fg">
            {(style === "ieee" || style === "vancouver") ? (
              <span className="shrink-0 tabular-nums text-fg-muted">[{i + 1}]</span>
            ) : null}
            <span>{entry.text}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
