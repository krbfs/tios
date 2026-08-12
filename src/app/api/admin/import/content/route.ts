import { requireAdmin } from "@/lib/api/auth";
import { error, json, parseJson } from "@/lib/api/http";
import { db } from "@/lib/db";

type ImportBlock = {
  psychotype_code: string;
  mode: string;
  block_key: string;
  block_template: string;
  title?: string | null;
  content_text: string;
  sort_order?: number;
  is_visible_default?: boolean;
  version?: number;
};

type ImportBody = {
  blocks?: ImportBlock[];
};

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) {
    return admin;
  }

  const body = await parseJson<ImportBody>(request);
  if (body instanceof Response) {
    return body;
  }

  if (!Array.isArray(body.blocks) || body.blocks.length === 0) {
    return error("blocks array is required", 400);
  }

  let created = 0;
  let updated = 0;

  for (const block of body.blocks) {
    if (
      !block.psychotype_code ||
      !block.mode ||
      !block.block_key ||
      !block.block_template ||
      !block.content_text
    ) {
      return error("Each block requires psychotype_code, mode, block_key, block_template, content_text", 400);
    }

    const version = block.version ?? 1;
    const existing = await db.contentBlock.findFirst({
      where: {
        psychotypeCode: block.psychotype_code,
        mode: block.mode,
        blockKey: block.block_key,
        version,
      },
    });

    await db.contentBlock.upsert({
      where: {
        psychotypeCode_mode_blockKey_version: {
          psychotypeCode: block.psychotype_code,
          mode: block.mode,
          blockKey: block.block_key,
          version,
        },
      },
      create: {
        psychotypeCode: block.psychotype_code,
        mode: block.mode,
        blockKey: block.block_key,
        blockTemplate: block.block_template,
        title: block.title ?? null,
        contentText: block.content_text,
        sortOrder: block.sort_order ?? 0,
        isVisibleDefault: block.is_visible_default ?? true,
        version,
        isActive: true,
      },
      update: {
        blockTemplate: block.block_template,
        title: block.title ?? null,
        contentText: block.content_text,
        sortOrder: block.sort_order ?? 0,
        isVisibleDefault: block.is_visible_default ?? true,
        isActive: true,
      },
    });

    if (existing) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  return json({
    imported: body.blocks.length,
    created,
    updated,
  });
}
