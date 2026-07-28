import { proxyPost } from "@/lib/api/server/proxy";

export const runtime = "nodejs";

const POLICY = {
  backendPath: "/v1/ai-detection/analyze",
  contentTypes: ["application/json"],
  maxBodyBytes: 64 * 1024,
  serviceName: "AI detection service",
} as const;

export async function POST(request: Request): Promise<Response> {
  return proxyPost(request, POLICY);
}
