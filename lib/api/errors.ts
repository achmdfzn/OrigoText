/**
 * Errors raised at the HTTP boundary between the Next.js app and the FastAPI
 * backend. Kept separate from domain types so UI code can branch on cause
 * without knowing transport details.
 */

export type ApiErrorKind =
  | "network"
  | "timeout"
  | "aborted"
  | "unauthenticated"
  | "rateLimited"
  | "validation"
  | "server"
  | "contract";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;

  constructor(kind: ApiErrorKind, message: string, status: number | null = null) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
  }

  /** True when retrying the same request could plausibly succeed. */
  get retryable(): boolean {
    return (
      this.kind === "network" ||
      this.kind === "timeout" ||
      this.kind === "server" ||
      this.kind === "rateLimited"
    );
  }
}

/** Seconds to wait before retrying, taken from the Retry-After header. */
export class RateLimitError extends ApiError {
  readonly retryAfterSeconds: number;

  constructor(message: string, retryAfterSeconds: number) {
    super("rateLimited", message, 429);
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * The backend responded, but the payload did not match the contract this client
 * was built against. Signals a version skew between frontend and OpenAPI spec.
 */
export class ApiContractError extends ApiError {
  constructor(message: string) {
    super("contract", message);
    this.name = "ApiContractError";
  }
}

const FALLBACK_MESSAGES: Readonly<Record<ApiErrorKind, string>> = {
  network: "Could not reach the analysis service. Check your connection and try again.",
  timeout: "The analysis service took too long to respond. Try again in a moment.",
  aborted: "The request was cancelled.",
  unauthenticated: "This app is not authorized to use the analysis service.",
  rateLimited: "Too many requests. Wait a moment before trying again.",
  validation: "The submitted text was rejected by the analysis service.",
  server: "The analysis service failed to process this request.",
  contract: "The analysis service returned an unexpected response.",
};

export function userFacingMessage(error: unknown): string {
  if (error instanceof RateLimitError) {
    return `Too many requests. Try again in ${error.retryAfterSeconds} second${
      error.retryAfterSeconds === 1 ? "" : "s"
    }.`;
  }
  if (error instanceof ApiError) {
    return error.message.length > 0 ? error.message : FALLBACK_MESSAGES[error.kind];
  }
  return "Something went wrong while running the analysis.";
}
