#!/usr/bin/env node
/**
 * Import hr_table content blocks + compatibility_rules from HR docx.
 */
import { execSync } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SOURCE_DIR = resolve(ROOT, "../source_current");
const DEFAULT_OUT = resolve(ROOT, "data/hr_table_registry.json");

type ImportBlock = {
  psychotype_code: string;
  mode: "hr_table";
  block_key: string;
  block_template: string;
  title: string;
  content_text: string;
  sort_order: number;
  is_visible_default: boolean;
  version: number;
  is_active: boolean;
};

type CompatibilityRule = {
  type_a_code: string;
  type_b_code: string;
  compatibility_level: string;
  recommendation?: string;
};

function findHrDocx(): string {
  const file = readdirSync(SOURCE_DIR).find(
    (name) =>
      name.toLowerCase().includes("hr") &&
      name.endsWith(".docx") &&
      !name.startsWith("~"),
  );
  if (!file) {
    throw new Error(`HR docx not found in ${SOURCE_DIR}`);
  }
  return resolve(SOURCE_DIR, file);
}

function extractFromDocx(docxPath: string): {
  blocks: ImportBlock[];
  compatibility_rules: CompatibilityRule[];
} {
  const output = execSync(
    `python3 "${resolve(__dirname, "extract_hr_table.py")}" ${JSON.stringify(docxPath)}`,
    { encoding: "utf8", maxBuffer: 15 * 1024 * 1024 },
  );
  return JSON.parse(output) as {
    blocks: ImportBlock[];
    compatibility_rules: CompatibilityRule[];
  };
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

async function upsertAll(blocks: ImportBlock[], rules: CompatibilityRule[]) {
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

    for (const rule of rules) {
      await db.compatibilityRule.upsert({
        where: {
          typeACode_typeBCode: {
            typeACode: rule.type_a_code,
            typeBCode: rule.type_b_code,
          },
        },
        create: {
          typeACode: rule.type_a_code,
          typeBCode: rule.type_b_code,
          compatibilityLevel: rule.compatibility_level,
          recommendation: rule.recommendation ?? null,
        },
        update: {
          compatibilityLevel: rule.compatibility_level,
          recommendation: rule.recommendation ?? null,
        },
      });
    }

    const totalBlocks = await db.contentBlock.count({
      where: { mode: "hr_table", isActive: true },
    });
    const totalRules = await db.compatibilityRule.count();
    console.log(`Blocks upserted ${created + updated} (created ${created}, updated ${updated})`);
    console.log(`Total active hr_table blocks: ${totalBlocks}`);
    console.log(`Compatibility rules: ${totalRules}`);
  } finally {
    await db.$disconnect();
  }
}

async function main() {
  const { dryRun, outPath } = parseArgs(process.argv.slice(2));
  const docxPath = findHrDocx();
  const { blocks, compatibility_rules } = extractFromDocx(docxPath);

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(
    outPath,
    `${JSON.stringify({ blocks, compatibility_rules }, null, 2)}\n`,
    "utf8",
  );
  console.log(`Wrote ${blocks.length} blocks, ${compatibility_rules.length} rules to ${outPath}`);
  console.log(`Source: ${docxPath}`);

  if (dryRun) {
    console.log("Dry run — skipping DB upsert");
    return;
  }

  await upsertAll(blocks, compatibility_rules);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
