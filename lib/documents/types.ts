export type DocumentFormat =
  | "pdf"
  | "docx"
  | "txt"
  | "rtf"
  | "odt"
  | "html"
  | "markdown"
  | "latex"
  | "epub";

export type SectionKind = "title" | "abstract" | "heading" | "body" | "references";

export interface DocumentSection {
  readonly id: string;
  readonly kind: SectionKind;
  readonly heading: string | null;
  readonly text: string;
  readonly startOffset: number;
  readonly endOffset: number;
}

export interface DocumentChunk {
  readonly id: string;
  readonly sectionId: string;
  readonly text: string;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly wordCount: number;
}

export interface DocumentMetadata {
  readonly title: string | null;
  readonly authors: ReadonlyArray<string>;
  readonly pageCount: number | null;
  readonly language: string | null;
}

export interface ParseResult {
  readonly id: string;
  readonly filename: string;
  readonly documentFormat: DocumentFormat;
  readonly byteSize: number;
  readonly parsedAt: string;
  readonly metadata: DocumentMetadata;
  readonly text: string;
  readonly wordCount: number;
  readonly characterCount: number;
  readonly sections: ReadonlyArray<DocumentSection>;
  readonly chunks: ReadonlyArray<DocumentChunk>;
  readonly truncated: boolean;
  readonly warnings: ReadonlyArray<string>;
}
