export type DocumentType =
  | "article"
  | "conference"
  | "preprint"
  | "book"
  | "thesis"
  | "report";

export type OpenAccessStatus = "gold" | "green" | "bronze" | "closed";

export interface Author {
  readonly name: string;
  readonly affiliation: string | null;
  readonly orcid: string | null;
}

export interface SearchResult {
  readonly id: string;
  readonly title: string;
  readonly authors: ReadonlyArray<Author>;
  readonly abstract: string | null;
  readonly journal: string | null;
  readonly publisher: string | null;
  readonly year: number | null;
  readonly doi: string | null;
  readonly url: string;
  readonly citationCount: number;
  readonly documentType: DocumentType;
  readonly openAccess: OpenAccessStatus;
  readonly keywords: ReadonlyArray<string>;
  readonly source: string;
}

export interface SearchFilters {
  readonly yearFrom: number | null;
  readonly yearTo: number | null;
  readonly documentTypes: ReadonlyArray<DocumentType>;
  readonly openAccessOnly: boolean;
}

export interface SearchQuery {
  readonly q: string;
  readonly filters: SearchFilters;
  readonly page: number;
  readonly pageSize: number;
}

export interface SearchResponse {
  readonly query: string;
  readonly totalCount: number;
  readonly page: number;
  readonly pageSize: number;
  readonly results: ReadonlyArray<SearchResult>;
  readonly durationMs: number;
}

export const EMPTY_FILTERS: SearchFilters = {
  yearFrom: null,
  yearTo: null,
  documentTypes: [],
  openAccessOnly: false,
};
