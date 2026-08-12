import type { ContentBlock, Prisma } from "@prisma/client";

import { db } from "@/lib/db";

export type AdminContentBlockDto = {
  id: number;
  psychotype_code: string;
  mode: string;
  block_key: string;
  block_template: string;
  title: string | null;
  content_text: string;
  sort_order: number;
  is_visible_default: boolean;
  version: number;
  updated_at: string;
};

function latestBlocksByKey(blocks: ContentBlock[]): ContentBlock[] {
  const latestByKey = new Map<string, ContentBlock>();
  for (const block of blocks) {
    const key = `${block.psychotypeCode}:${block.mode}:${block.blockKey}`;
    const existing = latestByKey.get(key);
    if (!existing || block.version > existing.version) {
      latestByKey.set(key, block);
    }
  }

  return [...latestByKey.values()].sort(
    (a, b) =>
      a.psychotypeCode.localeCompare(b.psychotypeCode) ||
      a.mode.localeCompare(b.mode) ||
      a.sortOrder - b.sortOrder ||
      a.blockKey.localeCompare(b.blockKey),
  );
}

export function serializeContentBlock(block: ContentBlock): AdminContentBlockDto {
  return {
    id: block.id,
    psychotype_code: block.psychotypeCode,
    mode: block.mode,
    block_key: block.blockKey,
    block_template: block.blockTemplate,
    title: block.title,
    content_text: block.contentText,
    sort_order: block.sortOrder,
    is_visible_default: block.isVisibleDefault,
    version: block.version,
    updated_at: block.updatedAt.toISOString(),
  };
}

export async function listAdminContentBlocks(filters?: {
  psychotypeCode?: string;
  mode?: string;
}): Promise<AdminContentBlockDto[]> {
  const where: Prisma.ContentBlockWhereInput = { isActive: true };
  if (filters?.psychotypeCode) {
    where.psychotypeCode = filters.psychotypeCode;
  }
  if (filters?.mode) {
    where.mode = filters.mode;
  }

  const blocks = await db.contentBlock.findMany({
    where,
    orderBy: [
      { psychotypeCode: "asc" },
      { mode: "asc" },
      { sortOrder: "asc" },
      { blockKey: "asc" },
    ],
  });

  return latestBlocksByKey(blocks).map(serializeContentBlock);
}
