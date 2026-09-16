import { error, json } from "@/lib/api/http";
import { loadVisibleContentBlocks } from "@/lib/api/results";
import { isAllowedMode } from "@/lib/modes";

type RouteContext = {
  params: Promise<{ psychotype_code: string; mode: string }>;
};

function parseTriadVariant(raw: string | null): string | null {
  if (raw === "left" || raw === "right" || raw === "detected") {
    return raw;
  }
  return null;
}

export async function GET(request: Request, context: RouteContext) {
  const { psychotype_code, mode } = await context.params;

  if (!isAllowedMode(mode)) {
    return error("Invalid mode", 400);
  }

  const triad_variant = parseTriadVariant(
    new URL(request.url).searchParams.get("triad_variant"),
  );

  const blocks = await loadVisibleContentBlocks(
    psychotype_code,
    mode,
    {},
    triad_variant,
  );

  return json({
    psychotype_code,
    mode,
    triad_variant,
    blocks,
  });
}
