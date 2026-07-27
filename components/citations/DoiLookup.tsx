"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { resolveDoi } from "@/lib/citations/sample-library";
import type { Reference } from "@/lib/citations/types";

interface DoiLookupProps {
  readonly onAdd: (ref: Reference) => void;
  readonly existingIds: ReadonlyArray<string>;
}

type LookupState =
  | { stage: "idle" }
  | { stage: "loading" }
  | { stage: "found"; ref: Reference }
  | { stage: "not-found" };

const LOOKUP_DURATION_MS = 600;

export function DoiLookup({ onAdd, existingIds }: DoiLookupProps) {
  const [value, setValue] = useState("");
  const [state, setState] = useState<LookupState>({ stage: "idle" });

  function handleLookup() {
    if (value.trim().length === 0) return;
    setState({ stage: "loading" });
    setTimeout(() => {
      const ref = resolveDoi(value.trim());
      setState(ref !== null ? { stage: "found", ref } : { stage: "not-found" });
    }, LOOKUP_DURATION_MS);
  }

  function handleAdd(ref: Reference) {
    onAdd(ref);
    setValue("");
    setState({ stage: "idle" });
  }

  const alreadyAdded =
    state.stage === "found" && existingIds.includes(state.ref.id);

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-h3 font-semibold text-fg">Add by DOI</h2>
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setState({ stage: "idle" });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleLookup();
          }}
          placeholder="10.1145/3442188.3445922"
          aria-label="DOI"
          className={cn(
            "flex-1 rounded-md border border-border bg-bg px-4 py-2 text-body-sm text-fg",
            "placeholder:text-fg-muted font-mono",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          )}
        />
        <button
          type="button"
          onClick={handleLookup}
          disabled={value.trim().length === 0 || state.stage === "loading"}
          className={cn(
            "rounded-md px-4 py-2 text-body-sm font-medium transition-colors duration-150",
            value.trim().length > 0 && state.stage !== "loading"
              ? "bg-accent text-white hover:bg-accent-hover"
              : "cursor-not-allowed bg-bg-muted text-fg-muted",
          )}
        >
          {state.stage === "loading" ? "Looking up…" : "Look up"}
        </button>
      </div>

      {state.stage === "found" ? (
        <div className="flex items-start justify-between gap-4 rounded-md border border-border bg-bg-subtle p-3">
          <div className="flex flex-col gap-0.5">
            <p className="text-body-sm font-medium text-fg">{state.ref.title}</p>
            <p className="text-caption text-fg-muted">
              {state.ref.authors.map((a) => `${a.given} ${a.family}`).join(", ")}
              {state.ref.year !== null ? ` · ${state.ref.year}` : ""}
            </p>
          </div>
          <button
            type="button"
            disabled={alreadyAdded}
            onClick={() => handleAdd(state.ref)}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-caption font-medium transition-colors duration-150",
              alreadyAdded
                ? "cursor-not-allowed bg-bg-muted text-fg-muted"
                : "bg-accent text-white hover:bg-accent-hover",
            )}
          >
            {alreadyAdded ? "Already added" : "Add"}
          </button>
        </div>
      ) : null}

      {state.stage === "not-found" ? (
        <p className="text-body-sm text-warning">
          No metadata found for that DOI. Try a different identifier.
        </p>
      ) : null}
    </Card>
  );
}
