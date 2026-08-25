import { getPublicGaConfig } from "@/lib/ga-config";
import { getPublicMetrikaConfig } from "@/lib/metrika-config";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      ...getPublicGaConfig(),
      ...getPublicMetrikaConfig(),
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}
