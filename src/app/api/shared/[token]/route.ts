import { error, json } from "@/lib/api/http";
import { serializeResult } from "@/lib/api/results";
import { db } from "@/lib/db";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;

  const result = await db.testResult.findFirst({
    where: {
      shareToken: token,
      isPublic: true,
    },
    include: { session: true },
  });

  if (!result) {
    return error("Shared result not found", 404);
  }

  return json(await serializeResult(result));
}
