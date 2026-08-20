import { buildA2AAgentCard } from "@/lib/seo";

export const dynamic = "force-static";

export function GET() {
  return Response.json(buildA2AAgentCard(), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
