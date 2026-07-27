"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

interface SearchBarProps {
  readonly initialQuery: string;
  readonly onSearch: (query: string) => void;
  readonly disabled?: boolean;
}

export function SearchBar({ initialQuery, onSearch, disabled }: SearchBarProps) {
  const [value, setValue] = useState(initialQuery);
  const canSearch = value.trim().length >= 2 && !disabled;

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSearch) onSearch(value.trim());
      }}
      className="flex items-center gap-3"
    >
      <div className="relative flex-1">
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted"
        >
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M12.5 12.5L16 16"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search papers, authors, DOIs, keywords…"
          aria-label="Search query"
          className={cn(
            "w-full rounded-md border border-border bg-bg py-2.5 pl-11 pr-4",
            "text-body text-fg placeholder:text-fg-muted",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            "transition-colors duration-150",
          )}
        />
      </div>
      <button
        type="submit"
        disabled={!canSearch}
        className={cn(
          "rounded-md px-5 py-2.5 text-body-sm font-medium transition-colors duration-150",
          canSearch
            ? "bg-accent text-white hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            : "cursor-not-allowed bg-bg-muted text-fg-muted",
        )}
      >
        Search
      </button>
    </form>
  );
}
