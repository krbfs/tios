import { randomUUID } from "node:crypto";

import { getAuthUser } from "@/lib/api/auth";
import { error, json } from "@/lib/api/http";
import {
  buildShareUrl,
  canAccessResult,
  getEncdataFromAnswers,
  getResultWithSession,
} from "@/lib/api/results";
import { db } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await getResultWithSession(id);

  if (!result) {
    return error("Result not found", 404);
  }

  const sessionUuid = request.headers.get("x-session-uuid");
  const user = await getAuthUser(request);
  const allowed = await canAccessResult(result, user, sessionUuid);

  if (!allowed && user?.role !== "admin") {
    return error("Forbidden", 403);
  }

  const encdata = getEncdataFromAnswers(result.answers);
  if (!encdata) {
    return error("Result answers are missing", 400);
  }

  const shareToken = result.shareToken ?? randomUUID();

  const updated = await db.testResult.update({
    where: { id: result.id },
    data: {
      shareToken,
      isPublic: true,
    },
  });

  return json({
    share_token: updated.shareToken,
    encdata,
    result_url: buildShareUrl(encdata),
    share_link: buildShareUrl(encdata),
  });
}
