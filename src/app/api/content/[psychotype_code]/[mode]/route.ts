import { error, json } from "@/lib/api/http";
import { loadVisibleContentBlocks } from "@/lib/api/results";
import { isAllowedMode } from "@/lib/modes";

type RouteContext = {
  params: Promise<{ psychotype_code: string; mode: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { psychotype_code, mode } = await context.params;

  if (!isAllowedMode(mode)) {
    return error("Invalid mode", 400);
  }

  const blocks = await loadVisibleContentBlocks(psychotype_code, mode, {});

  return json({
    psychotype_code,
    mode,
    blocks,
  });
}
