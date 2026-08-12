import { requireAdmin } from "@/lib/api/auth";
import { error, json, parseJson } from "@/lib/api/http";
import { serializeAdminResult } from "@/lib/api/results";
import { db } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };
type CommentBody = {
  comment?: string;
  show_to_user?: boolean;
};

export async function POST(request: Request, context: RouteContext) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) {
    return admin;
  }

  const { id } = await context.params;
  const body = await parseJson<CommentBody>(request);
  if (body instanceof Response) {
    return body;
  }

  if (typeof body.comment !== "string") {
    return error("comment is required", 400);
  }

  try {
    const result = await db.testResult.update({
      where: { id },
      data: {
        adminComment: body.comment,
        showAdminComment: body.show_to_user ?? false,
      },
      include: { session: true },
    });

    return json(await serializeAdminResult(result));
  } catch {
    return error("Result not found", 404);
  }
}
