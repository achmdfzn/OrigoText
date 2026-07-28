import { proxyPost } from "@/lib/api/server/proxy";

export const runtime = "nodejs";

const POLICY = {
  backendPath: "/v1/plagiarism/checks",
  contentTypes: ["application/json"],
  maxBodyBytes: 256 * 1024,
  serviceName: "Plagiarism service",
} as const;

export async function POST(request: Request): Promise<Response> {
  return proxyPost(request, POLICY);
}
