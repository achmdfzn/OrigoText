"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { parseDocument } from "@/lib/api/client";
import { userFacingMessage } from "@/lib/api/errors";
import {
  ACCEPT_ATTRIBUTE,
  MAX_UPLOAD_BYTES,
  documentFormatLabel,
  formatBytes,
} from "@/lib/documents/formats";
import type { ParseResult } from "@/lib/documents/types";

interface UploadFormProps {
  readonly onSubmit: (text: string) => void | Promise<void>;
  readonly error?: string | null;
}

const MAX_CHARS = 50_000;
const MIN_CHARS = 50;

export function UploadForm({ onSubmit, error = null }: UploadFormProps) {
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(true);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void uploadFile(file);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void uploadFile(file);
  }

  async function uploadFile(file: File) {
    setFileError(null);
    setParsed(null);

    if (file.size > MAX_UPLOAD_BYTES) {
      setFileError(`File exceeds the ${formatBytes(MAX_UPLOAD_BYTES)} limit.`);
      return;
    }

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setParsing(true);

    try {
      const result = await parseDocument({ file, signal: controller.signal });
      if (controller.signal.aborted) return;
      setParsed(result);
      setText(result.text.slice(0, MAX_CHARS));
    } catch (cause) {
      if (controller.signal.aborted) return;
      setFileError(userFacingMessage(cause));
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      setParsing(false);
    }
  }

  const remaining = MAX_CHARS - text.length;
  const canSubmit = text.trim().length >= MIN_CHARS && !parsing;

  return (
    <Card className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h2 font-semibold text-fg">
          Origo<span className="text-accent">Text</span> Plagiarism Checker
        </h1>
        <p className="text-body-sm text-fg-muted">
          Paste your text or upload a document to check for similarity against
          academic sources.
        </p>
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label="Drop zone — click or drag a file here"
        aria-busy={parsing}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => event.key === "Enter" && inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 transition-colors duration-150",
          dragging
            ? "border-accent bg-accent-weak"
            : "border-border hover:border-accent hover:bg-accent-weak/50",
        )}
      >
        <svg
          aria-hidden="true"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn("text-fg-muted", parsing && "animate-pulse")}
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <span className="text-body-sm text-fg-muted">
          {parsing ? (
            "Extracting text…"
          ) : (
            <>
              Drag &amp; drop a file, or{" "}
              <span className="font-medium text-accent">browse</span>
            </>
          )}
        </span>
        <span className="text-caption text-fg-muted">
          PDF, DOCX, ODT, EPUB, TXT, RTF, HTML, MD, TEX · max{" "}
          {formatBytes(MAX_UPLOAD_BYTES)}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          className="sr-only"
          tabIndex={-1}
          onChange={handleFileChange}
        />
      </div>

      <div aria-live="polite" className="flex flex-col gap-2">
        {fileError !== null ? (
          <p role="alert" className="text-body-sm text-danger">
            {fileError}
          </p>
        ) : null}

        {parsed !== null ? (
          <div className="flex flex-col gap-1 rounded-md border border-border bg-bg-muted/50 px-4 py-3">
            <p className="text-body-sm text-fg">
              {parsed.metadata.title ?? parsed.filename}
            </p>
            <p className="text-caption text-fg-muted">
              {documentFormatLabel(parsed.documentFormat)} ·{" "}
              {parsed.wordCount.toLocaleString()} words ·{" "}
              {parsed.sections.length} sections
              {parsed.metadata.pageCount !== null
                ? ` · ${parsed.metadata.pageCount} pages`
                : ""}
            </p>
            {parsed.warnings.map((warning) => (
              <p key={warning} className="text-caption text-warning">
                {warning}
              </p>
            ))}
          </div>
        ) : null}
      </div>
