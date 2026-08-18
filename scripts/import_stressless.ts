#!/usr/bin/env node
/**
 * Build stressless content blocks from StressLess worksheet xlsx (13×8 MVP).
 */
import { execSync } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SOURCE_DIR = resolve(ROOT, "../source_current");
const DEFAULT_OUT = resolve(ROOT, "data/stressless_registry.json");

type ImportBlock = {
  psychotype_code: string;
  mode: "stressless";
  block_key: string;
  block_template: string;
  title: string;
  content_text: string;
  sort_order: number;
  is_visible_default: boolean;
  version: number;
  is_active: boolean;
};

function findStresslessXlsx(): string {
  const file = readdirSync(SOURCE_DIR).find(
    (name) =>
      name.toLowerCase().includes("stressless") &&
      name.endsWith(".xlsx") &&
      !name.startsWith("~"),
  );
  if (!file) {
    throw new Error(`stressless xlsx not found in ${SOURCE_DIR}`);
  }
  return resolve(SOURCE_DIR, file);
}

function extractBlocksFromXlsx(xlsxPath: string): ImportBlock[] {
  const output = execSync(
    `python3 "${resolve(__dirname, "extract_stressless.py")}" ${JSON.stringify(xlsxPath)}`,
    { encoding: "utf8", maxBuffer: 15 * 1024 * 1024 },
  );
  const parsed = JSON.parse(output) as { blocks: ImportBlock[] };
  if (!parsed.blocks?.length) {
    throw new Error("No blocks extracted from stressless xlsx");
  }
  return parsed.blocks;
}

function parseArgs(argv: string[]) {
  return {
    dryRun: argv.includes("--dry-run"),
    outPath: (() => {
      const idx = argv.indexOf("--out");
      if (idx >= 0 && argv[idx + 1]) {
        return resolve(process.cwd(), argv[idx + 1]);
      }
      return DEFAULT_OUT;
    })(),
  };
}

async function upsertBlocks(blocks: ImportBlock[]) {
  const db = new PrismaClient();
  let created = 0;
  let updated = 0;

  try {
    for (const block of blocks) {
      const existing = await db.contentBlock.findUnique({
        where: {
          psychotypeCode_mode_blockKey_version: {
            psychotypeCode: block.psychotype_code,
            mode: block.mode,
            blockKey: block.block_key,
            version: block.version,
          },
        },
        select: { id: true },
      });

      await db.contentBlock.upsert({
        where: {
          psychotypeCode_mode_blockKey_version: {
            psychotypeCode: block.psychotype_code,
            mode: block.mode,
            blockKey: block.block_key,
            version: block.version,
          },
        },
        create: {
          psychotypeCode: block.psychotype_code,
          mode: block.mode,
          blockKey: block.block_key,
          blockTemplate: block.block_template,
          title: block.title,
          contentText: block.content_text,
          sortOrder: block.sort_order,
          isVisibleDefault: block.is_visible_default,
          version: block.version,
          isActive: block.is_active,
        },
        update: {
          blockTemplate: block.block_template,
          title: block.title,
          contentText: block.content_text,
          sortOrder: block.sort_order,
          isVisibleDefault: block.is_visible_default,
          isActive: block.is_active,
        },
      });

      if (existing) updated += 1;
      else created += 1;
    }

    const total = await db.contentBlock.count({
      where: { mode: "stressless", isActive: true },
    });
    console.log(`Upserted ${created + updated} (created ${created}, updated ${updated})`);
    console.log(`Total active stressless blocks: ${total}`);
  } finally {
    await db.$disconnect();
  }
}

async function main() {
  const { dryRun, outPath } = parseArgs(process.argv.slice(2));
  const xlsxPath = findStresslessXlsx();
  const blocks = extractBlocksFromXlsx(xlsxPath);

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify({ blocks }, null, 2)}\n`, "utf8");
  console.log(`Wrote ${blocks.length} blocks to ${outPath}`);
  console.log(`Source: ${xlsxPath}`);

  if (dryRun) {
    console.log("Dry run — skipping DB upsert");
    return;
  }

  await upsertBlocks(blocks);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
