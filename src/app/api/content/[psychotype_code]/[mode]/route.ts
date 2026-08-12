import { json } from "@/lib/api/http";
import { loadVisibleContentBlocks } from "@/lib/api/results";

type RouteContext = {
  params: Promise<{ psychotype_code: string; mode: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { psychotype_code, mode } = await context.params;

  const blocks = await loadVisibleContentBlocks(psychotype_code, mode, {});

  return json({
    psychotype_code,
    mode,
    blocks,
  });
}
