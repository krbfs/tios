import { requireAdmin } from "@/lib/api/auth";
import { serializeContentBlock } from "@/lib/api/content";
import { error, json, parseJson } from "@/lib/api/http";
import { db } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };
type UpdateBody = {
  content_text?: string;
  title?: string | null;
  block_template?: string;
  sort_order?: number;
  is_visible_default?: boolean;
};

export async function PUT(request: Request, context: RouteContext) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) {
    return admin;
  }

  const { id } = await context.params;
  const blockId = Number(id);
  if (!Number.isInteger(blockId) || blockId <= 0) {
    return error("Invalid block id", 400);
  }

  const body = await parseJson<UpdateBody>(request);
  if (body instanceof Response) {
    return body;
  }

  if (typeof body.content_text !== "string" || !body.content_text.trim()) {
    return error("content_text is required", 400);
  }

  try {
    const block = await db.contentBlock.update({
      where: { id: blockId },
      data: {
        contentText: body.content_text,
        title: body.title !== undefined ? body.title : undefined,
        blockTemplate: body.block_template,
        sortOrder: body.sort_order,
        isVisibleDefault: body.is_visible_default,
      },
    });

    return json(serializeContentBlock(block));
  } catch {
    return error("Content block not found", 404);
  }
}
