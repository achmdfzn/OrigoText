/**
 * Thin HTTP client for the OrigoText FastAPI backend. Every response is mapped
 * into domain types before leaving this module, and every failure is normalized
 * into an `ApiError` so callers never handle raw fetch rejections.
 */

import { DEFAULT_TIMEOUT_MS, apiBaseUrl } from "./config";
import { ApiContractError, ApiError } from "./errors";
import { toDetectionResult, toParseResult, toPlagiarismReport } from "./mappers";
import type {
  WireDetectionResult,
  WireParseResult,
  WirePlagiarismReport,
  WireProblem,
  WireValidationError,
} from "./wire";
import type { PlagiarismReport } from "@/lib/plagiarism/types";
import type { DetectionResult } from "@/lib/ai-detection/types";
import type { ParseResult } from "@/lib/documents/types";

export interface AnalysisRequest {
  readonly text: string;
  readonly documentTitle?: string;
  /** Lets a caller cancel in-flight work, e.g. on unmount or resubmit. */
  readonly signal?: AbortSignal;
}

function isValidationBody(value: unknown): value is WireValidationError {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { detail?: unknown }).detail)
  );
}

function isProblemBody(value: unknown): value is WireProblem {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { detail?: unknown }).detail === "string" &&
    typeof (value as { title?: unknown }).title === "string"
  );
}

async function describeFailure(response: Response): Promise<string> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return "";
  }
  if (isProblemBody(body)) {
    return body.detail;
  }
  if (isValidationBody(body)) {
    return body.detail.map((entry) => entry.msg).join("; ");
  }
  return "";
}

/**
 * Combines the caller's abort signal with an internal timeout so a hung backend
 * cannot leave the UI stuck in its loading state.
 */
function withTimeout(signal: AbortSignal | undefined): {
  readonly signal: AbortSignal;
  readonly timedOut: () => boolean;
  readonly dispose: () => void;
} {
  const controller = new AbortController();
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, DEFAULT_TIMEOUT_MS);

  const forward = () => controller.abort();
  if (signal !== undefined) {
    if (signal.aborted) forward();
    else signal.addEventListener("abort", forward, { once: true });
  }

  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    dispose: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", forward);
    },
  };
}

async function postJson<TWire>(
  path: string,
  body: Readonly<Record<string, unknown>>,
  signal: AbortSignal | undefined,
): Promise<TWire> {
  const timeout = withTimeout(signal);

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: timeout.signal,
      cache: "no-store",
    });
  } catch {
    if (timeout.timedOut()) {
      throw new ApiError("timeout", "The analysis service took too long to respond.");
    }
    if (signal?.aborted === true) {
      throw new ApiError("aborted", "The request was cancelled.");
    }
    throw new ApiError(
      "network",
      "Could not reach the analysis service. Is the backend running?",
    );
  } finally {
    timeout.dispose();
  }

  if (!response.ok) {
    const detail = await describeFailure(response);
    if (response.status === 422) {
      throw new ApiError(
        "validation",
        detail.length > 0 ? detail : "The submitted text was rejected.",
        response.status,
      );
    }
    throw new ApiError(
      "server",
      detail.length > 0 ? detail : `Analysis service returned ${response.status}.`,
      response.status,
    );
  }

  try {
    return (await response.json()) as TWire;
  } catch {
    throw new ApiContractError("Analysis service returned a malformed JSON body.");
  }
}

export async function checkPlagiarism({
  text,
  documentTitle,
  signal,
}: AnalysisRequest): Promise<PlagiarismReport> {
  const wire = await postJson<WirePlagiarismReport>(
    "/v1/plagiarism/checks",
    { text, document_title: documentTitle ?? "Untitled" },
    signal,
  );
  return toPlagiarismReport(wire);
}

export async function detectAiText({
  text,
  documentTitle,
  signal,
}: AnalysisRequest): Promise<DetectionResult> {
  const wire = await postJson<WireDetectionResult>(
    "/v1/ai-detection/analyze",
    { text, document_title: documentTitle ?? "Untitled" },
    signal,
  );
  return toDetectionResult(wire);
}

export interface ParseDocumentRequest {
  readonly file: File;
  readonly signal?: AbortSignal;
}

/**
 * Uploads a file for server-side parsing. The browser never interprets the file
 * itself: binary formats such as PDF and DOCX require real extraction, and the
 * backend also sanitizes the result before it reaches any prompt.
 */
export async function parseDocument({
  file,
  signal,
}: ParseDocumentRequest): Promise<ParseResult> {
  const form = new FormData();
  form.append("file", file, file.name);

  const timeout = withTimeout(signal);

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}/v1/documents`, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: form,
      signal: timeout.signal,
      cache: "no-store",
    });
  } catch {
    if (timeout.timedOut()) {
      throw new ApiError("timeout", "Parsing the document took too long.");
    }
    if (signal?.aborted === true) {
      throw new ApiError("aborted", "The upload was cancelled.");
    }
    throw new ApiError("network", "Could not reach the document service.");
  } finally {
    timeout.dispose();
  }

  if (!response.ok) {
    const detail = await describeFailure(response);
    throw new ApiError(
      response.status < 500 ? "validation" : "server",
      detail.length > 0 ? detail : `Document service returned ${response.status}.`,
      response.status,
    );
  }

  try {
    return toParseResult((await response.json()) as WireParseResult);
  } catch {
    throw new ApiContractError("Document service returned a malformed JSON body.");
  }
}
