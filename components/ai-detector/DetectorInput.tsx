"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

interface DetectorInputProps {
  readonly onSubmit: (text: string) => void | Promise<void>;
  readonly onUseSample: () => void;
  /** Message from a failed analysis, surfaced above the submit button. */
  readonly error?: string | null;
}

const MAX_CHARS = 50_000;

export function DetectorInput({
  onSubmit,
  onUseSample,
  error = null,
}: DetectorInputProps) {
  const [text, setText] = useState("");

  const remaining = MAX_CHARS - text.length;
  const canSubmit = text.trim().length >= 50;

  return (
    <Card className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h2 font-semibold text-fg">
          AI-Generated Text Detector
        </h1>
        <p className="text-body-sm text-fg-muted">
          Estimate the likelihood that a passage was written by a language model.
          Results are probabilistic — never treat any score as proof of authorship.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="detector-text" className="text-body-sm font-medium text-fg">
          Paste text to analyze
        </label>
        <textarea
          id="detector-text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
          rows={12}
          placeholder="Paste the text you want to analyze here…"
          className={cn(
            "w-full resize-y rounded-md border border-border bg-bg px-4 py-3",
            "font-sans text-body text-fg placeholder:text-fg-muted",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            "transition-colors duration-150",
          )}
          aria-describedby="detector-char-count"
        />
        <div
          id="detector-char-count"
          className={cn(
            "text-right text-caption",
            remaining < 1000 ? "text-warning" : "text-fg-muted",
          )}
        >
          {remaining.toLocaleString()} characters remaining
        </div>
      </div>

      {error !== null ? (
        <p
          role="alert"
          className="rounded-md border border-danger/40 bg-danger/8 px-4 py-3 text-body-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onUseSample}
          className="text-body-sm font-medium text-accent hover:text-accent-hover transition-colors"
        >
          Try a sample
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => onSubmit(text.trim())}
          className={cn(
            "rounded-md px-5 py-2.5 text-body-sm font-medium transition-colors duration-150",
            canSubmit
              ? "bg-accent text-white hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              : "cursor-not-allowed bg-bg-muted text-fg-muted",
          )}
        >
          Analyze text
        </button>
      </div>
    </Card>
  );
}
