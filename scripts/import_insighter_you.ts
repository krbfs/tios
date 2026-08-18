#!/usr/bin/env node
/**
 * Build insighter_you content blocks from source_current/ответы инсайтер 1.xlsx
 * and upsert into content_blocks (mode = insighter_you).
 *
 * Usage:
 *   npm run db:import-insighter-you
 *   npm run db:import-insighter-you -- --dry-run
 *   npm run db:import-insighter-you -- --out data/insighter_you_registry.json
 */
import { execSync } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SOURCE_DIR = resolve(ROOT, "../source_current");
const DEFAULT_OUT = resolve(ROOT, "data/insighter_you_registry.json");

type ImportBlock = {
  psychotype_code: string;
  mode: "insighter_you";
  block_key: string;
  block_template: "text_block";
  title: string;
  content_text: string;
  sort_order: number;
  is_visible_default: boolean;
  version: number;
  is_active: boolean;
};

const LEGACY_PSYCHOTYPE_MAP: Record<string, string> = {
  fashionista: "aesthete",
  sensitive: "empath",
  reserved: "analyst",
  realist: "pragmatist",
};

const ROW_DEFINITIONS: { block_key: string; sort_order: number }[] = [
  { block_key: "teamPlayer", sort_order: 10 },
  { block_key: "productivityDependsOn", sort_order: 20 },
  { block_key: "typesOfWorkflows", sort_order: 30 },
  { block_key: "whatTriggersAndDemotivates", sort_order: 40 },
  { block_key: "howConflicting", sort_order: 50 },
  { block_key: "independenceAndSelfOrganized", sort_order: 60 },
  { block_key: "thinkingStyleAndInfoDelivery", sort_order: 70 },
  { block_key: "strengthsAtWork", sort_order: 80 },
  { block_key: "burnoutReason", sort_order: 90 },
  { block_key: "optimalTrainingSystem", sort_order: 100 },
];

const PURE_PSYCHOTYPE_COLUMNS = [
  "individualist",
  "innovator",
  "influencer",
  "fashionista",
  "conservative",
  "sensitive",
  "reserved",
  "realist",
];

function normalizeForMatch(value: string): string {
  return value.normalize("NFC").toLowerCase();
}

function findYouXlsx(): string {
  const file = readdirSync(SOURCE_DIR).find(
    (name) =>
      normalizeForMatch(name).includes("инсайтер") &&
      name.endsWith(".xlsx") &&
      !name.startsWith("~") &&
      !normalizeForMatch(name).includes("outer"),
  );
  if (!file) {
    throw new Error(`insighter_you xlsx not found in ${SOURCE_DIR}`);
  }
  return resolve(SOURCE_DIR, file);
}

function extractBlocksFromXlsx(xlsxPath: string): ImportBlock[] {
  const output = execSync(
    `python3 "${resolve(__dirname, "extract_insighter_you.py")}" ${JSON.stringify(xlsxPath)}`,
    {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  const parsed = JSON.parse(output) as { blocks: ImportBlock[] };
  if (!parsed.blocks?.length) {
    throw new Error("No blocks extracted from xlsx");
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

      if (existing) {
        updated += 1;
      } else {
        created += 1;
      }
    }

    const total = await db.contentBlock.count({
      where: { mode: "insighter_you", isActive: true },
    });
    console.log(`Upserted ${created + updated} (created ${created}, updated ${updated})`);
    console.log(`Total active insighter_you blocks: ${total}`);
  } finally {
    await db.$disconnect();
  }
}

async function main() {
  const { dryRun, outPath } = parseArgs(process.argv.slice(2));
  const xlsxPath = findYouXlsx();
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
