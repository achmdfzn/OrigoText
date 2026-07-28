import "server-only";

const DEFAULT_BACKEND_URL = "http://localhost:8000";
const DEFAULT_PROXY_TIMEOUT_MS = 35_000;

export interface BackendConfig {
  readonly baseUrl: string;
  readonly apiKey: string | null;
  readonly timeoutMs: number;
}

export class BackendConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackendConfigurationError";
  }
}

function parseBaseUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new BackendConfigurationError("ORIGOTEXT_API_BASE_URL must be a valid URL.");
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new BackendConfigurationError("ORIGOTEXT_API_BASE_URL must use HTTP or HTTPS.");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new BackendConfigurationError(
      "ORIGOTEXT_API_BASE_URL cannot contain credentials, query parameters, or fragments.",
    );
  }

  return url.toString().replace(/\/$/, "");
}

export function backendConfig(): BackendConfig {
  const baseUrl = parseBaseUrl(
    process.env.ORIGOTEXT_API_BASE_URL?.trim() || DEFAULT_BACKEND_URL,
  );
  const apiKey = process.env.ORIGOTEXT_API_KEY?.trim() || null;
  const configuredTimeout = Number.parseInt(
    process.env.ORIGOTEXT_API_TIMEOUT_MS?.trim() || "",
    10,
  );

  return {
    baseUrl,
    apiKey,
    timeoutMs:
      Number.isFinite(configuredTimeout) && configuredTimeout > 0
        ? configuredTimeout
        : DEFAULT_PROXY_TIMEOUT_MS,
  };
}
