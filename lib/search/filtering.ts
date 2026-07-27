import type {
  DocumentType,
  OpenAccessStatus,
  SearchFilters,
  SearchResult,
} from "./types";

export const DOCUMENT_TYPE_LABELS: Readonly<Record<DocumentType, string>> = {
  article: "Journal article",
  conference: "Conference paper",
  preprint: "Preprint",
  book: "Book",
  thesis: "Thesis",
  report: "Report",
};

export const OPEN_ACCESS_LABELS: Readonly<Record<OpenAccessStatus, string>> = {
  gold: "Open access",
  green: "Open access",
  bronze: "Free to read",
  closed: "Subscription",
};

export function isOpenAccess(status: OpenAccessStatus): boolean {
  return status !== "closed";
}

export function matchesFilters(
  result: SearchResult,
  filters: SearchFilters,
): boolean {
  if (filters.openAccessOnly && !isOpenAccess(result.openAccess)) return false;

  if (
    filters.documentTypes.length > 0 &&
    !filters.documentTypes.includes(result.documentType)
  ) {
    return false;
  }

  if (result.year !== null) {
    if (filters.yearFrom !== null && result.year < filters.yearFrom) return false;
    if (filters.yearTo !== null && result.year > filters.yearTo) return false;
  }

  return true;
}

export function formatAuthors(
  authors: SearchResult["authors"],
  max = 3,
): string {
  if (authors.length === 0) return "Unknown authors";
  const names = authors.map((a) => a.name);
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")}, +${names.length - max} more`;
}

export function formatCitations(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}
