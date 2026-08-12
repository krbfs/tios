import { requireAdmin } from "@/lib/api/auth";
import { error, json, parseJson } from "@/lib/api/http";
import { serializeResult } from "@/lib/api/results";
import { db } from "@/lib/db";

const ALLOWED_MODES = [
  "leader_resource",
  "insighter",
  "stressless",
  "hr_table",
] as const;

type RouteContext = { params: Promise<{ id: string }> };
type ModeBody = { mode?: string };

export async function PUT(request: Request, context: RouteContext) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) {
    return admin;
  }

  const { id } = await context.params;
  const body = await parseJson<ModeBody>(request);
  if (body instanceof Response) {
    return body;
  }

  if (!body.mode || !ALLOWED_MODES.includes(body.mode as (typeof ALLOWED_MODES)[number])) {
    return error("Invalid mode", 400);
  }

  try {
    const result = await db.testResult.update({
      where: { id },
      data: { mode: body.mode },
      include: { session: true },
    });

    return json(await serializeResult(result, { includeHiddenBlocks: true }));
  } catch {
    return error("Result not found", 404);
  }
}
