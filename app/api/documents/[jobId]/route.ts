import { proxyGet } from "@/lib/api/server/proxy";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/documents/[jobId]">,
): Promise<Response> {
  const { jobId } = await context.params;
  return proxyGet({
    backendPath: `/v1/documents/${encodeURIComponent(jobId)}`,
    serviceName: "Document service",
  });
}
