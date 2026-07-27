/**
 * Resolution of the FastAPI base URL. Read through a function rather than a
 * module constant so tests and preview environments can override the env var
 * without a rebuild-time snapshot.
 */

const DEFAULT_BASE_URL = "http://localhost:8000";

export function apiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const base = configured !== undefined && configured.length > 0 ? configured : DEFAULT_BASE_URL;
  return base.replace(/\/+$/, "");
}

/** Upper bound for a single analysis request. Backend work is CPU-bound. */
export const DEFAULT_TIMEOUT_MS = 30_000;
