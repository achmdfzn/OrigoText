"use client";

import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

interface UploadFormProps {
  readonly onSubmit: (text: string) => void;
}

const MAX_CHARS = 50_000;
const ACCEPTED = ".pdf,.docx,.txt,.rtf,.odt,.md";

export function UploadForm({ onSubmit }: UploadFormProps) {
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  }

  function readFile(file: File) {
    setFileError(null);
    if (file.size > 5 * 1024 * 1024) {
      setFileError("File exceeds 5 MB limit.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === "string") {
        setText(result.slice(0, MAX_CHARS));
      }
    };
    reader.onerror = () => setFileError("Could not read file.");
    reader.readAsText(file);
  }

  const remaining = MAX_CHARS - text.length;
  const canSubmit = text.trim().length >= 50;

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
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
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
          className="text-fg-muted"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <span className="text-body-sm text-fg-muted">
          Drag &amp; drop a file, or{" "}
          <span className="font-medium text-accent">browse</span>
        </span>
        <span className="text-caption text-fg-muted">
          PDF, DOCX, TXT, RTF, ODT, MD · max 5 MB
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
          onChange={handleFileChange}
        />
      </div>

      {fileError !== null ? (
        <p role="alert" className="text-body-sm text-danger">
          {fileError}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <label htmlFor="submission-text" className="text-body-sm font-medium text-fg">
          Or paste text directly
        </label>
        <textarea
          id="submission-text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
          rows={12}
          placeholder="Paste your essay, paper, or article here…"
          className={cn(
            "w-full resize-y rounded-md border border-border bg-bg px-4 py-3",
            "font-sans text-body text-fg placeholder:text-fg-muted",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            "transition-colors duration-150",
          )}
          aria-describedby="char-count"
        />
        <div
          id="char-count"
          className={cn(
            "text-right text-caption",
            remaining < 1000 ? "text-warning" : "text-fg-muted",
          )}
        >
          {remaining.toLocaleString()} characters remaining
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-caption text-fg-muted">
          Minimum 50 characters required.
        </p>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => onSubmit(text.trim())}
          className={cn(
            "rounded-md px-5 py-2.5 text-body-sm font-medium transition-colors duration-150",
            canSubmit
              ? "bg-accent text-white hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              : "cursor-not-allowed bg-bg-muted text-fg-muted",
          )}
        >
          Check for plagiarism
        </button>
      </div>
    </Card>
  );
}
