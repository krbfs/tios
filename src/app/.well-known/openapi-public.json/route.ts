import { buildPublicOpenApi } from "@/lib/seo";

export const dynamic = "force-static";

export function GET() {
  return Response.json(buildPublicOpenApi(), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
