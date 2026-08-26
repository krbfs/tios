#!/usr/bin/env node
/**
 * Management command equivalent: import_content
 * Loads content blocks from JSON into content_blocks (Neon).
 *
 * Usage:
 *   npm run db:import-content
 *   npm run db:import-content -- data/content_registry.json
 *   npm run db:import-v1-content
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { PrismaClient } from "@prisma/client";

type ImportBlock = {
  psychotype_code?: string;
  mode?: string;
  block_key?: string;
  block_template?: string;
  title?: string | null;
  content_text?: string;
  sort_order?: number;
  is_visible_default?: boolean;
  version?: number;
  is_active?: boolean;
  triad_variant?: string | null;
};

type RegistryFile = {
  blocks?: ImportBlock[];
};

const DEFAULT_FILE = resolve(process.cwd(), "data/content_registry.json");

function parseArgs(argv: string[]): { filePath: string } {
  const fileFlagIndex = argv.indexOf("--file");
  if (fileFlagIndex >= 0) {
    const filePath = argv[fileFlagIndex + 1];
    if (!filePath) {
      throw new Error("Missing value for --file");
    }
    return { filePath: resolve(process.cwd(), filePath) };
  }

  const positional = argv.find((arg) => !arg.startsWith("--"));
  if (positional) {
    return { filePath: resolve(process.cwd(), positional) };
  }

  return { filePath: DEFAULT_FILE };
}

function loadBlocks(filePath: string): ImportBlock[] {
  const raw = JSON.parse(readFileSync(filePath, "utf8")) as
    | RegistryFile
    | ImportBlock[];

  if (Array.isArray(raw)) {
    return raw;
  }

  if (!Array.isArray(raw.blocks)) {
    throw new Error("JSON must be an array of blocks or { blocks: [...] }");
  }

  return raw.blocks;
}

function normalizeTriadVariant(value: string | null | undefined): string | null {
  if (value === "left" || value === "right") {
    return value;
  }
  return null;
}

function blockIdentity(block: ImportBlock): string {
  const triad = normalizeTriadVariant(block.triad_variant) ?? "∅";
  return `${block.psychotype_code ?? "?"}/${block.mode ?? "?"}/${block.block_key ?? "?"}/${triad}`;
}

async function main() {
  const { filePath } = parseArgs(process.argv.slice(2));
  const blocks = loadBlocks(filePath);
  const db = new PrismaClient();

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const modes = new Set<string>();

  try {
    for (const block of blocks) {
      const identity = blockIdentity(block);

      if (
        !block.psychotype_code?.trim() ||
        !block.mode?.trim() ||
        !block.block_key?.trim() ||
        !block.block_template?.trim()
      ) {
        skipped += 1;
        console.warn(`SKIP (missing fields): ${identity}`);
        continue;
      }

      const contentText = block.content_text?.trim() ?? "";
      if (!contentText) {
        skipped += 1;
        console.warn(`SKIP (empty content_text): ${identity}`);
        continue;
      }

      const version = block.version ?? 1;
      const triadVariant = normalizeTriadVariant(block.triad_variant);
      modes.add(block.mode);

      const existing = await db.contentBlock.findFirst({
        where: {
          psychotypeCode: block.psychotype_code,
          mode: block.mode as never,
          blockKey: block.block_key,
          version,
          triadVariant,
        },
        select: { id: true },
      });

      const data = {
        psychotypeCode: block.psychotype_code,
        mode: block.mode as never,
        blockKey: block.block_key,
        blockTemplate: block.block_template,
        title: block.title ?? null,
        contentText,
        sortOrder: block.sort_order ?? 0,
        isVisibleDefault: block.is_visible_default ?? true,
        version,
        isActive: block.is_active ?? true,
        triadVariant,
      };

      if (existing) {
        await db.contentBlock.update({
          where: { id: existing.id },
          data: {
            blockTemplate: data.blockTemplate,
            title: data.title,
            contentText: data.contentText,
            sortOrder: data.sortOrder,
            isVisibleDefault: data.isVisibleDefault,
            isActive: data.isActive,
            triadVariant: data.triadVariant,
          },
        });
        updated += 1;
      } else {
        await db.contentBlock.create({ data });
        created += 1;
      }
    }

    console.log(`Imported from: ${filePath}`);
    console.log(
      `Upserted: ${created + updated} (created ${created}, updated ${updated}, skipped ${skipped})`,
    );

    for (const mode of [...modes].sort()) {
      const total = await db.contentBlock.count({
        where: { mode: mode as never, isActive: true },
      });
      console.log(`Total active content_blocks for mode='${mode}': ${total}`);
    }

    if (modes.size === 0) {
      console.log("No modes imported.");
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
