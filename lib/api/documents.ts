/**
 * Client for the asynchronous document pipeline. Uploading queues a job; the
 * caller follows progress over server-sent events and receives the parse result
 * from the terminal event.
 */

import { ApiContractError, ApiError } from "./errors";
import { toParseJob } from "./mappers";
import type { WireParseJob } from "./wire";
import { isTerminal, type ParseJob, type ParseResult } from "@/lib/documents/types";

const POLL_INTERVAL_MS = 500;
const MAX_POLL_ATTEMPTS = 240;

export interface UploadDocumentRequest {
  readonly file: File;
  readonly signal?: AbortSignal;
  /** Invoked on every progress update, including the terminal one. */
  readonly onProgress?: (job: ParseJob) => void;
}

async function describeFailure(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null) {
      const detail = (body as { detail?: unknown }).detail;
      if (typeof detail === "string") return detail;
    }
  } catch {
    return "";
  }
  return "";
}

function failureFor(response: Response, detail: string): ApiError {
  const message = detail.length > 0 ? detail : `Document service returned ${response.status}.`;
  if (response.status === 401 || response.status === 403) {
    return new ApiError("unauthenticated", message, response.status);
  }
  if (response.status < 500) {
    return new ApiError("validation", message, response.status);
  }
  return new ApiError("server", message, response.status);
}

export async function submitDocument({
  file,
  signal,
}: Omit<UploadDocumentRequest, "onProgress">): Promise<ParseJob> {
  const form = new FormData();
  form.append("file", file, file.name);

  let response: Response;
  try {
    response = await fetch("/api/documents", {
      method: "POST",
      headers: { Accept: "application/json" },
      body: form,
      signal,
      cache: "no-store",
    });
  } catch {
    if (signal?.aborted === true) throw new ApiError("aborted", "The upload was cancelled.");
    throw new ApiError("network", "Could not reach the document service.");
  }

  if (!response.ok) {
    throw failureFor(response, await describeFailure(response));
  }

  try {
    return toParseJob((await response.json()) as WireParseJob);
  } catch {
    throw new ApiContractError("Document service returned a malformed job.");
  }
}

export async function getDocumentJob(
  jobId: string,
  signal?: AbortSignal,
): Promise<ParseJob> {
  let response: Response;
  try {
    response = await fetch(`/api/documents/${encodeURIComponent(jobId)}`, {
      headers: { Accept: "application/json" },
      signal,
      cache: "no-store",
    });
  } catch {
    if (signal?.aborted === true) throw new ApiError("aborted", "The request was cancelled.");
    throw new ApiError("network", "Could not reach the document service.");
  }

  if (!response.ok) {
    throw failureFor(response, await describeFailure(response));
  }

  try {
    return toParseJob((await response.json()) as WireParseJob);
  } catch {
    throw new ApiContractError("Document service returned a malformed job.");
  }
}

/** Yields each job update from the server-sent event stream. */
async function* streamJob(
  jobId: string,
  signal: AbortSignal | undefined,
): AsyncGenerator<ParseJob> {
  const response = await fetch(`/api/documents/${encodeURIComponent(jobId)}/stream`, {
    headers: { Accept: "text/event-stream" },
    signal,
    cache: "no-store",
  });

  if (!response.ok || response.body === null) {
    throw failureFor(response, await describeFailure(response));
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;
      buffer += value;

      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() ?? "";

      for (const block of blocks) {
        for (const line of block.split("\n")) {
          if (!line.startsWith("data:")) continue;
          try {
            yield toParseJob(JSON.parse(line.slice(5).trim()) as WireParseJob);
          } catch {
            throw new ApiContractError("Document service sent a malformed progress event.");
          }
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

async function pollUntilTerminal(
  jobId: string,
  signal: AbortSignal | undefined,
  onProgress: ((job: ParseJob) => void) | undefined,
): Promise<ParseJob> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    const job = await getDocumentJob(jobId, signal);
    onProgress?.(job);
    if (isTerminal(job.status)) return job;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new ApiError("timeout", "The document took too long to parse.");
}

function resultOrThrow(job: ParseJob): ParseResult {
  if (job.status === "failed") {
    const failure = job.failure;
    throw new ApiError(
      failure !== null && failure.status < 500 ? "validation" : "server",
      failure?.detail ?? "The document could not be parsed.",
      failure?.status ?? null,
    );
  }
  if (job.result === null) {
    throw new ApiContractError("The job completed without a parse result.");
  }
  return job.result;
}

/**
 * Uploads a file and resolves with the parse result once the job finishes.
 *
 * Progress arrives over server-sent events. If the stream cannot be
 * established or drops before a terminal event, this falls back to polling so a
 * proxy that buffers streams cannot strand the upload.
 */
export async function parseDocument({
  file,
  signal,
  onProgress,
}: UploadDocumentRequest): Promise<ParseResult> {
  const queued = await submitDocument({ file, signal });
  onProgress?.(queued);

  let latest = queued;
  try {
    for await (const job of streamJob(queued.id, signal)) {
      latest = job;
      onProgress?.(job);
      if (isTerminal(job.status)) return resultOrThrow(job);
    }
  } catch (error) {
    if (error instanceof ApiError && error.kind === "aborted") throw error;
    if (signal?.aborted === true) throw new ApiError("aborted", "The upload was cancelled.");
  }

  if (isTerminal(latest.status)) return resultOrThrow(latest);
  return resultOrThrow(await pollUntilTerminal(queued.id, signal, onProgress));
}
