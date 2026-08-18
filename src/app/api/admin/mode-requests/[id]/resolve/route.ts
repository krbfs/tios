import { requireAdmin } from "@/lib/api/auth";
import { error, json, parseJson } from "@/lib/api/http";
import { db } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };
type ResolveBody = {
  action?: "approve" | "reject";
  admin_note?: string;
};

export async function PATCH(request: Request, context: RouteContext) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) {
    return admin;
  }

  const { id } = await context.params;
  const body = await parseJson<ResolveBody>(request);
  if (body instanceof Response) {
    return body;
  }

  if (body.action !== "approve" && body.action !== "reject") {
    return error("action must be approve or reject", 400);
  }

  const existing = await db.modeRequest.findUnique({
    where: { id },
    include: { result: true },
  });

  if (!existing) {
    return error("Mode request not found", 404);
  }

  if (existing.status !== "pending") {
    return error("Request already resolved", 400);
  }

  const status = body.action === "approve" ? "approved" : "rejected";

  const updated = await db.$transaction(async (tx) => {
    const modeRequest = await tx.modeRequest.update({
      where: { id },
      data: {
        status,
        resolvedAt: new Date(),
        resolvedById: admin.id,
        adminNote: body.admin_note?.trim() || null,
      },
    });

    if (body.action === "approve") {
      await tx.testResult.update({
        where: { id: existing.resultId },
        data: { mode: existing.requestedMode },
      });
    }

    return modeRequest;
  });

  return json({
    id: updated.id,
    status: updated.status,
    requested_mode: updated.requestedMode,
    result_id: updated.resultId,
  });
}
