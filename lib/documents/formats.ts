import type { DocumentFormat } from "./types";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Extensions offered in the file picker. The backend re-derives the real format
 * from magic bytes, so this list is a convenience filter and never a trust
 * boundary.
 */
export const ACCEPTED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".odt",
  ".epub",
  ".txt",
  ".rtf",
  ".html",
  ".htm",
  ".md",
  ".tex",
] as const;

export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.join(",");

const FORMAT_LABELS: Readonly<Record<DocumentFormat, string>> = {
  pdf: "PDF",
  docx: "Word document",
  odt: "OpenDocument text",
  epub: "EPUB",
  txt: "Plain text",
  rtf: "Rich text",
  html: "HTML",
  markdown: "Markdown",
  latex: "LaTeX",
};

export function documentFormatLabel(format: DocumentFormat): string {
  return FORMAT_LABELS[format];
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
