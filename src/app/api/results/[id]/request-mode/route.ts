import { getAuthUser } from "@/lib/api/auth";
import { error, json, parseJson } from "@/lib/api/http";
import { canAccessResult, getResultWithSession } from "@/lib/api/results";
import { db } from "@/lib/db";
import { isAllowedMode } from "@/lib/modes";

type RouteContext = { params: Promise<{ id: string }> };
type RequestBody = { mode?: string };

const REQUESTABLE_MODES = ["stressless", "insighter_you"] as const;

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await getResultWithSession(id);

  if (!result) {
    return error("Result not found", 404);
  }

  const sessionUuid = request.headers.get("x-session-uuid");
  const user = await getAuthUser(request);
  const allowed = await canAccessResult(result, user, sessionUuid);

  if (!allowed) {
    return error("Forbidden", 403);
  }

  const body = await parseJson<RequestBody>(request);
  if (body instanceof Response) {
    return body;
  }

  if (
    !body.mode ||
    !isAllowedMode(body.mode) ||
    !REQUESTABLE_MODES.includes(body.mode as (typeof REQUESTABLE_MODES)[number])
  ) {
    return error("Invalid requested mode", 400);
  }

  const pending = await db.modeRequest.findFirst({
    where: {
      resultId: id,
      requestedMode: body.mode,
      status: "pending",
    },
  });

  if (pending) {
    return json({
      id: pending.id,
      status: pending.status,
      requested_mode: pending.requestedMode,
      message: "Заявка уже отправлена и ожидает рассмотрения",
    });
  }

  const created = await db.modeRequest.create({
    data: {
      resultId: id,
      requestedMode: body.mode,
    },
  });

  return json({
    id: created.id,
    status: created.status,
    requested_mode: created.requestedMode,
    message: "Заявка отправлена администратору",
  });
}
