import { proxyGet } from "@/lib/api/server/proxy";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: RouteContext<"/api/documents/[jobId]/stream">,
): Promise<Response> {
  const { jobId } = await context.params;
  return proxyGet({
    backendPath: `/v1/documents/${encodeURIComponent(jobId)}/stream`,
    serviceName: "Document service",
    signal: request.signal,
    stream: true,
  });
}
