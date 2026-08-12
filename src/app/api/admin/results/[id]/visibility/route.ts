import { requireAdmin } from "@/lib/api/auth";
import { error, json, parseJson } from "@/lib/api/http";
import { parseVisibilityOverrides, serializeAdminResult } from "@/lib/api/results";
import { db } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };
type VisibilityBody = {
  visibility_overrides?: Record<string, boolean>;
};

export async function PUT(request: Request, context: RouteContext) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) {
    return admin;
  }

  const { id } = await context.params;
  const body = await parseJson<VisibilityBody>(request);
  if (body instanceof Response) {
    return body;
  }

  if (!body.visibility_overrides) {
    return error("visibility_overrides is required", 400);
  }

  const overrides = parseVisibilityOverrides(body.visibility_overrides);

  try {
    const result = await db.testResult.update({
      where: { id },
      data: { visibilityOverrides: overrides },
      include: { session: true },
    });

    return json(await serializeAdminResult(result));
  } catch {
    return error("Result not found", 404);
  }
}
