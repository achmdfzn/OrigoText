"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { SearchBar } from "@/components/search/SearchBar";
import { FilterPanel } from "@/components/search/FilterPanel";
import { ResultCard } from "@/components/search/ResultCard";
import { buildSampleResponse } from "@/lib/search/sample-response";
import { matchesFilters } from "@/lib/search/filtering";
import { EMPTY_FILTERS } from "@/lib/search/types";
import type { SearchFilters, SearchResponse } from "@/lib/search/types";

type PageState =
  | { stage: "idle" }
  | { stage: "searching" }
  | { stage: "done"; response: SearchResponse };

const SEARCH_DURATION_MS = 700;

export default function SearchPage() {
  const [pageState, setPageState] = useState<PageState>({ stage: "idle" });
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [query, setQuery] = useState("");

  function handleSearch(nextQuery: string) {
    setQuery(nextQuery);
    setPageState({ stage: "searching" });
    setTimeout(() => {
      setPageState({ stage: "done", response: buildSampleResponse(nextQuery) });
    }, SEARCH_DURATION_MS);
  }

  const visibleResults = useMemo(() => {
    if (pageState.stage !== "done") return [];
    return pageState.response.results.filter((r) => matchesFilters(r, filters));
  }, [pageState, filters]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h2 font-semibold text-fg">Academic Search</h1>
        <p className="text-body-sm text-fg-muted">
          Federated search across Crossref, OpenAlex, arXiv, PubMed, and other
          licensed sources.
        </p>
      </div>

      <SearchBar
        initialQuery={query}
        onSearch={handleSearch}
        disabled={pageState.stage === "searching"}
      />

      {pageState.stage === "idle" ? (
        <Card className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-body font-medium text-fg">
            Search the scholarly record
          </p>
          <p className="max-w-md text-body-sm text-fg-muted">
            Enter a topic, author, DOI, or natural-language question to begin.
            Results include metadata, citation counts, and open-access status.
          </p>
        </Card>
      ) : null}

      {pageState.stage === "searching" ? (
        <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="flex flex-col gap-3">
              <div className="h-5 w-3/4 animate-pulse rounded bg-bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-bg-muted" />
              <div className="h-3 w-full animate-pulse rounded bg-bg-muted" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-bg-muted" />
            </Card>
          ))}
        </div>
      ) : null}

      {pageState.stage === "done" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          <FilterPanel filters={filters} onChange={setFilters} />
          <div className="flex flex-col gap-4">
            <p className="text-body-sm text-fg-muted" aria-live="polite">
              {visibleResults.length} of {pageState.response.totalCount} results
              for <span className="font-medium text-fg">“{pageState.response.query}”</span>{" "}
              · {pageState.response.durationMs} ms
            </p>
            {visibleResults.length === 0 ? (
              <Card className="py-12 text-center text-body-sm text-fg-muted">
                No results match the current filters.
              </Card>
            ) : (
              visibleResults.map((result) => (
                <ResultCard key={result.id} result={result} />
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
