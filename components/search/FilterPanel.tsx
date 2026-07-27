"use client";

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { DOCUMENT_TYPE_LABELS } from "@/lib/search/filtering";
import type { DocumentType, SearchFilters } from "@/lib/search/types";

interface FilterPanelProps {
  readonly filters: SearchFilters;
  readonly onChange: (filters: SearchFilters) => void;
}

const DOCUMENT_TYPES = Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[];

export function FilterPanel({ filters, onChange }: FilterPanelProps) {
  function toggleType(type: DocumentType) {
    const active = filters.documentTypes.includes(type);
    onChange({
      ...filters,
      documentTypes: active
        ? filters.documentTypes.filter((t) => t !== type)
        : [...filters.documentTypes, type],
    });
  }

  function setYear(key: "yearFrom" | "yearTo", raw: string) {
    const parsed = raw.trim() === "" ? null : Number.parseInt(raw, 10);
    onChange({
      ...filters,
      [key]: parsed !== null && Number.isNaN(parsed) ? null : parsed,
    });
  }

  return (
    <Card className="flex flex-col gap-5 self-start">
      <h2 className="text-h3 font-semibold text-fg">Filters</h2>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-body-sm font-medium text-fg">
          Publication year
        </legend>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            placeholder="From"
            aria-label="Year from"
            value={filters.yearFrom ?? ""}
            onChange={(e) => setYear("yearFrom", e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-1.5 text-body-sm text-fg placeholder:text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          <span aria-hidden="true" className="text-fg-muted">
            –
          </span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="To"
            aria-label="Year to"
            value={filters.yearTo ?? ""}
            onChange={(e) => setYear("yearTo", e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-1.5 text-body-sm text-fg placeholder:text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-body-sm font-medium text-fg">
          Document type
        </legend>
        <div className="flex flex-col gap-1.5">
          {DOCUMENT_TYPES.map((type) => {
            const checked = filters.documentTypes.includes(type);
            return (
              <label
                key={type}
                className="flex cursor-pointer items-center gap-2.5 text-body-sm text-fg"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleType(type)}
                  className="size-4 rounded border-border text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                />
                {DOCUMENT_TYPE_LABELS[type]}
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="flex cursor-pointer items-center justify-between gap-2 border-t border-border pt-4 text-body-sm font-medium text-fg">
        Open access only
        <button
          type="button"
          role="switch"
          aria-checked={filters.openAccessOnly}
          onClick={() =>
            onChange({ ...filters, openAccessOnly: !filters.openAccessOnly })
          }
          className={cn(
            "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150",
            filters.openAccessOnly ? "bg-accent" : "bg-bg-muted",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-4 rounded-full bg-white transition-transform duration-150",
              filters.openAccessOnly ? "translate-x-4" : "translate-x-0.5",
            )}
          />
        </button>
      </label>
    </Card>
  );
}
