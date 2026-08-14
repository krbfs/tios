import { getPublicGaConfig } from "@/lib/ga-config";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(getPublicGaConfig(), {
    headers: {
      "Cache-Control": "public, max-age=300",
    },
  });
}
