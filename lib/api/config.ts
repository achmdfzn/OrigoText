/**
 * Resolution of the FastAPI base URL and credentials. Read through functions
 * rather than module constants so tests and preview environments can override
 * the env vars without a rebuild-time snapshot.
 */

const DEFAULT_BASE_URL = "http://localhost:8000";

export const API_KEY_HEADER = "X-API-Key";

export function apiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const base = configured !== undefined && configured.length > 0 ? configured : DEFAULT_BASE_URL;
  return base.replace(/\/+$/, "");
}

/**
 * The API key sent with analysis requests.
 *
 * This is a `NEXT_PUBLIC_` value, so it ships to the browser and is visible to
 * anyone using the app. It is a deployment-scoped key for gating the public
 * surface, not a per-user secret. Per-user credentials require a server-side
 * proxy so the key never leaves the server.
 */
export function apiKey(): string | null {
  const configured = process.env.NEXT_PUBLIC_API_KEY?.trim();
  return configured !== undefined && configured.length > 0 ? configured : null;
}

export function authHeaders(): Record<string, string> {
  const key = apiKey();
  return key !== null ? { [API_KEY_HEADER]: key } : {};
}

/** Upper bound for a single analysis request. Backend work is CPU-bound. */
export const DEFAULT_TIMEOUT_MS = 30_000;
