import { requireAdmin } from "@/lib/api/auth";
import { error, json } from "@/lib/api/http";
import { getResultWithSession, serializeAdminResult } from "@/lib/api/results";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) {
    return admin;
  }

  const { id } = await context.params;
  const result = await getResultWithSession(id);
  if (!result) {
    return error("Result not found", 404);
  }

  return json(await serializeAdminResult(result));
}
