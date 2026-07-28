/**
 * Thin HTTP client for the OrigoText FastAPI backend. Every response is mapped
 * into domain types before leaving this module, and every failure is normalized
 * into an `ApiError` so callers never handle raw fetch rejections.
 */

import { DEFAULT_TIMEOUT_MS } from "./config";
import { ApiContractError, ApiError, RateLimitError } from "./errors";
import { toDetectionResult, toPlagiarismReport } from "./mappers";
import type {
  WireDetectionResult,
  WirePlagiarismReport,
  WireProblem,
  WireValidationError,
} from "./wire";
import type { PlagiarismReport } from "@/lib/plagiarism/types";
import type { DetectionResult } from "@/lib/ai-detection/types";

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

function retryAfterSeconds(response: Response): number {
  const header = response.headers.get("Retry-After");
  const parsed = header !== null ? Number.parseInt(header, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60;
}

/** Maps a non-2xx response onto the matching typed error. */
async function failureFor(response: Response, serviceName: string): Promise<ApiError> {
  const detail = await describeFailure(response);
  const message = detail.length > 0 ? detail : `${serviceName} returned ${response.status}.`;

  if (response.status === 401 || response.status === 403) {
    return new ApiError("unauthenticated", message, response.status);
  }
  if (response.status === 429) {
    return new RateLimitError(message, retryAfterSeconds(response));
  }
  if (response.status < 500) {
    return new ApiError("validation", message, response.status);
  }
  return new ApiError("server", message, response.status);
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
    response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
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
    throw await failureFor(response, "Analysis service");
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
    "/api/plagiarism/checks",
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
    "/api/ai-detection/analyze",
    { text, document_title: documentTitle ?? "Untitled" },
    signal,
  );
  return toDetectionResult(wire);
}

export { getDocumentJob, parseDocument, submitDocument } from "./documents";
