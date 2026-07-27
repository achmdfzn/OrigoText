export type CitationStyle =
  | "apa7"
  | "ieee"
  | "mla9"
  | "chicago17"
  | "vancouver"
  | "harvard";

export type ReferenceType =
  | "article"
  | "book"
  | "chapter"
  | "conference"
  | "thesis"
  | "report"
  | "website"
  | "preprint";

export interface ReferenceAuthor {
  readonly given: string;
  readonly family: string;
  readonly orcid: string | null;
}

export interface Reference {
  readonly id: string;
  readonly type: ReferenceType;
  readonly title: string;
  readonly authors: ReadonlyArray<ReferenceAuthor>;
  readonly year: number | null;
  readonly journal: string | null;
  readonly volume: string | null;
  readonly issue: string | null;
  readonly pages: string | null;
  readonly publisher: string | null;
  readonly place: string | null;
  readonly doi: string | null;
  readonly url: string | null;
  readonly accessedDate: string | null;
  readonly addedAt: string;
  readonly tags: ReadonlyArray<string>;
  readonly notes: string | null;
}

export const CITATION_STYLE_LABELS: Readonly<Record<CitationStyle, string>> = {
  apa7: "APA 7th",
  ieee: "IEEE",
  mla9: "MLA 9th",
  chicago17: "Chicago 17th",
  vancouver: "Vancouver",
  harvard: "Harvard",
};
