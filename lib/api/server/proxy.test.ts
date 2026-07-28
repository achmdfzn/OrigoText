import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import type { ProxyPolicy } from "./proxy";

mock.module("server-only", () => ({}));

const { proxyPost } = await import("./proxy");

const POLICY: ProxyPolicy = {
  backendPath: "/v1/plagiarism/checks",
  contentTypes: ["application/json"],
  maxBodyBytes: 1024,
  serviceName: "Plagiarism service",
};

const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_ENV = { ...process.env };

type FetchImpl = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/**
 * Bun's `fetch` type carries a `preconnect` property that mocks do not have,
 * so the cast is isolated here instead of repeated at every call site.
 */
function stubFetch(implementation: FetchImpl): ReturnType<typeof mock> {
  const fetchMock = mock(implementation);
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function request(body = '{"text":"enough text"}', contentType = "application/json"): Request {
  return new Request("http://localhost/api/plagiarism/checks", {
    method: "POST",
    headers: { "Content-Type": contentType },
    body,
  });
}

beforeEach(() => {
  process.env.ORIGOTEXT_API_BASE_URL = "http://backend.internal:8000";
  process.env.ORIGOTEXT_API_KEY = "server-only-secret";
  process.env.ORIGOTEXT_API_TIMEOUT_MS = "1000";
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  process.env = { ...ORIGINAL_ENV };
});

describe("proxyPost", () => {
  test("forwards the body and injects the server-only key", async () => {
    let upstreamRequest: Request | null = null;
    stubFetch(async (input, init) => {
      upstreamRequest = new Request(input, init);
      return Response.json({ id: "report_1" }, { status: 200 });
    });

    const response = await proxyPost(request(), POLICY);

    expect(response.status).toBe(200);
    expect(upstreamRequest).not.toBeNull();
    expect(upstreamRequest!.url).toBe(
      "http://backend.internal:8000/v1/plagiarism/checks",
    );
    expect(upstreamRequest!.headers.get("X-API-Key")).toBe("server-only-secret");
    expect(await upstreamRequest!.text()).toBe('{"text":"enough text"}');
  });

  test("does not expose the API key and forwards rate-limit headers", async () => {
    stubFetch(async () =>
      Response.json(
        { detail: "slow down" },
        {
          status: 429,
          headers: {
            "Retry-After": "42",
            "X-RateLimit-Limit": "3",
            "X-RateLimit-Remaining": "0",
            "X-API-Key": "must-not-leak",
          },
        },
      ),
    );

    const response = await proxyPost(request(), POLICY);

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
    expect(response.headers.get("X-RateLimit-Limit")).toBe("3");
    expect(response.headers.get("X-API-Key")).toBeNull();
  });

  test("rejects unsupported media types without contacting the backend", async () => {
    const fetchMock = stubFetch(async () => Response.json({}));

    const response = await proxyPost(request("hello", "text/plain"), POLICY);

    expect(response.status).toBe(415);
    expect(response.headers.get("content-type")).toContain("application/problem+json");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("rejects an oversized body even without a content-length header", async () => {
    const fetchMock = stubFetch(async () => Response.json({}));
    const oversized = request("x".repeat(POLICY.maxBodyBytes + 1));
    oversized.headers.delete("content-length");

    const response = await proxyPost(oversized, POLICY);

    expect(response.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("maps an unreachable backend to 502 problem details", async () => {
    stubFetch(async () => {
      throw new TypeError("connection refused");
    });

    const response = await proxyPost(request(), POLICY);
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.title).toBe("Backend unavailable");
    expect(JSON.stringify(body)).not.toContain("connection refused");
  });

  test("maps an upstream timeout to 504", async () => {
    process.env.ORIGOTEXT_API_TIMEOUT_MS = "5";
    stubFetch(
      async (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );

    const response = await proxyPost(request(), POLICY);

    expect(response.status).toBe(504);
  });

  test("rejects invalid backend configuration without leaking values", async () => {
    process.env.ORIGOTEXT_API_BASE_URL = "file:///private/backend";
    const fetchMock = stubFetch(async () => Response.json({}));

    const response = await proxyPost(request(), POLICY);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.title).toBe("Proxy configuration error");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
