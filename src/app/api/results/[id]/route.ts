import { getAuthUser } from "@/lib/api/auth";
import { error, json } from "@/lib/api/http";
import {
  canAccessResult,
  getResultWithSession,
  serializeResult,
} from "@/lib/api/results";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await getResultWithSession(id);

  if (!result) {
    return error("Result not found", 404);
  }

  const sessionUuid = request.headers.get("x-session-uuid");
  const user = await getAuthUser(request);
  const allowed =
    result.isPublic || (await canAccessResult(result, user, sessionUuid));

  if (!allowed) {
    return error("Forbidden", 403);
  }

  return json(
    await serializeResult(result, {
      user,
      sessionUuid,
    }),
  );
}
