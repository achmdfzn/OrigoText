import { proxyPost } from "@/lib/api/server/proxy";

export const runtime = "nodejs";

const POLICY = {
  backendPath: "/v1/documents",
  contentTypes: ["multipart/form-data"],
  maxBodyBytes: 11 * 1024 * 1024,
  serviceName: "Document service",
} as const;

export async function POST(request: Request): Promise<Response> {
  return proxyPost(request, POLICY);
}
