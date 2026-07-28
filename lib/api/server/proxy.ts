import "server-only";

import { backendConfig, BackendConfigurationError } from "./config";

const API_KEY_HEADER = "X-API-Key";
const PROBLEM_CONTENT_TYPE = "application/problem+json";
const FORWARDED_RESPONSE_HEADERS = [
  "content-type",
  "location",
  "retry-after",
  "x-ratelimit-limit",
  "x-ratelimit-remaining",
] as const;

export interface ProxyPolicy {
  readonly backendPath: string;
  readonly contentTypes: ReadonlyArray<string>;
  readonly maxBodyBytes: number;
  readonly serviceName: string;
}

function problem(status: number, title: string, detail: string, type: string): Response {
  return Response.json(
    {
      type: `https://origotext.dev/problems/${type}`,
      title,
      status,
      detail,
    },
    {
      status,
      headers: {
        "Content-Type": PROBLEM_CONTENT_TYPE,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

function matchesContentType(actual: string, accepted: ReadonlyArray<string>): boolean {
  const mediaType = actual.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  return accepted.some((candidate) => candidate.toLowerCase() === mediaType);
}

function requestSize(request: Request): number | null {
  const value = request.headers.get("content-length");
  if (value === null) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function forwardedHeaders(request: Request, apiKey: string | null): Headers {
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType !== null) headers.set("Content-Type", contentType);
  headers.set("Accept", "application/json, application/problem+json");
  if (apiKey !== null) headers.set(API_KEY_HEADER, apiKey);
  return headers;
}

function responseHeaders(upstream: Response): Headers {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  return headers;
}

export async function proxyPost(request: Request, policy: ProxyPolicy): Promise<Response> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!matchesContentType(contentType, policy.contentTypes)) {
    return problem(
      415,
      "Unsupported media type",
      `Expected ${policy.contentTypes.join(" or ")}.`,
      "unsupported-media-type",
    );
  }

  const declaredSize = requestSize(request);
  if (declaredSize !== null && declaredSize > policy.maxBodyBytes) {
    return problem(
      413,
      "Request too large",
      `Request body exceeds the ${policy.maxBodyBytes}-byte proxy limit.`,
      "request-too-large",
    );
  }

  let body: ArrayBuffer;
  try {
    body = await request.arrayBuffer();
  } catch {
    return problem(400, "Invalid request body", "The request body could not be read.", "invalid-body");
  }
  if (body.byteLength > policy.maxBodyBytes) {
    return problem(
      413,
      "Request too large",
      `Request body exceeds the ${policy.maxBodyBytes}-byte proxy limit.`,
      "request-too-large",
    );
  }

  let config;
  try {
    config = backendConfig();
  } catch (error) {
    const detail =
      error instanceof BackendConfigurationError
        ? error.message
        : "The backend connection is not configured correctly.";
    return problem(500, "Proxy configuration error", detail, "proxy-configuration-error");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const upstream = await fetch(`${config.baseUrl}${policy.backendPath}`, {
      method: "POST",
      headers: forwardedHeaders(request, config.apiKey),
      body,
      signal: controller.signal,
      cache: "no-store",
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders(upstream),
    });
  } catch {
    if (controller.signal.aborted) {
      return problem(
        504,
        "Backend timeout",
        `${policy.serviceName} did not respond before the proxy timeout.`,
        "backend-timeout",
      );
    }
    return problem(
      502,
      "Backend unavailable",
      `${policy.serviceName} could not be reached.`,
      "backend-unavailable",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export interface GetProxyOptions {
  readonly backendPath: string;
  readonly serviceName: string;
  /** Aborts the upstream request when the browser disconnects from a stream. */
  readonly signal?: AbortSignal;
  /**
   * Streaming responses (server-sent events) must not be bounded by the normal
   * request timeout, since an idle stream is expected while a job runs.
   */
  readonly stream?: boolean;
}

export async function proxyGet(options: GetProxyOptions): Promise<Response> {
  let config;
  try {
    config = backendConfig();
  } catch (error) {
    const detail =
      error instanceof BackendConfigurationError
        ? error.message
        : "The backend connection is not configured correctly.";
    return problem(500, "Proxy configuration error", detail, "proxy-configuration-error");
  }

  const controller = new AbortController();
  const forwardAbort = () => controller.abort();
  options.signal?.addEventListener("abort", forwardAbort, { once: true });
  const timer =
    options.stream === true
      ? null
      : setTimeout(() => controller.abort(), config.timeoutMs);

  const headers = new Headers({
    Accept: options.stream === true ? "text/event-stream" : "application/json",
  });
  if (config.apiKey !== null) headers.set(API_KEY_HEADER, config.apiKey);

  try {
    const upstream = await fetch(`${config.baseUrl}${options.backendPath}`, {
      method: "GET",
      headers,
      signal: controller.signal,
      cache: "no-store",
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders(upstream),
    });
  } catch {
    if (options.signal?.aborted === true) {
      return new Response(null, { status: 499 });
    }
    if (controller.signal.aborted) {
      return problem(
        504,
        "Backend timeout",
        `${options.serviceName} did not respond before the proxy timeout.`,
        "backend-timeout",
      );
    }
    return problem(
      502,
      "Backend unavailable",
      `${options.serviceName} could not be reached.`,
      "backend-unavailable",
    );
  } finally {
    if (timer !== null) clearTimeout(timer);
    options.signal?.removeEventListener("abort", forwardAbort);
  }
}
