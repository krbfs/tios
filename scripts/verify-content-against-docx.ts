#!/usr/bin/env tsx
/**
 * Verify portrait content: docx → JSON → Neon (no text loss).
 *
 * Usage:
 *   npm run content:verify-docx
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { PrismaClient } from "@prisma/client";

import {
  buildContentRegistries,
  type RegistryBlock,
} from "./build-content-registry";

const DOCX = resolve(
  process.cwd(),
  "../source_sep_2nd/Предложение_по_изменению_ТК_вопросы_ок.docx",
);

function loadJson(file: string): RegistryBlock[] {
  const raw = JSON.parse(readFileSync(resolve(process.cwd(), file), "utf8")) as {
    blocks?: RegistryBlock[];
  };
  return raw.blocks ?? [];
}

function blockIdentity(block: RegistryBlock): string {
  const triad = block.triad_variant ?? "∅";
  return `${block.psychotype_code}/${block.block_key}/${triad}`;
}

function compareBlockSets(
  label: string,
  expected: RegistryBlock[],
  actual: RegistryBlock[],
): string[] {
  const errors: string[] = [];
  const actualMap = new Map(actual.map((block) => [blockIdentity(block), block]));

  for (const block of expected) {
    const key = blockIdentity(block);
    const other = actualMap.get(key);
    if (!other) {
      errors.push(`${label}: missing block ${key}`);
      continue;
    }
    const left = (block.content_text ?? "").trim();
    const right = (other.content_text ?? "").trim();
    if (left !== right) {
      errors.push(
        `${label}: text mismatch ${key} (expected ${left.length} chars, got ${right.length} chars)`,
      );
    }
  }

  for (const key of actualMap.keys()) {
    if (!expected.some((block) => blockIdentity(block) === key)) {
      errors.push(`${label}: unexpected extra block ${key}`);
    }
  }

  return errors;
}

async function verifyDatabase(blocks: RegistryBlock[]): Promise<string[]> {
  if (!process.env.DATABASE_URL) {
    console.log("Skip Neon check (DATABASE_URL not set)");
    return [];
  }

  const db = new PrismaClient();
  const errors: string[] = [];

  try {
    for (const block of blocks) {
      const key = blockIdentity(block);
      const row = await db.contentBlock.findFirst({
        where: {
          psychotypeCode: block.psychotype_code,
          mode: "leader_resource",
          blockKey: block.block_key,
          version: block.version ?? 2,
          triadVariant: block.triad_variant ?? null,
          isActive: true,
        },
        select: { contentText: true },
      });

      if (!row) {
        errors.push(`Neon: missing row ${key}`);
        continue;
      }

      const jsonText = (block.content_text ?? "").trim();
      const dbText = row.contentText.trim();
      if (jsonText !== dbText) {
        errors.push(
          `Neon: text mismatch ${key} (json ${jsonText.length} chars, db ${dbText.length} chars)`,
        );
      }
    }

    const dbCount = await db.contentBlock.count({
      where: {
        mode: "leader_resource",
        version: 2,
        isActive: true,
        psychotypeCode: {
          in: [
            "individualist",
            "innovator",
            "influencer",
            "aesthete",
            "conservative",
            "empath",
            "analyst",
            "pragmatist",
            "complex",
          ],
        },
      },
    });

    console.log(
      `Neon: checked ${blocks.length} blocks, ${dbCount} active v2 leader_resource rows`,
    );
  } finally {
    await db.$disconnect();
  }

  return errors;
}

async function main() {
  const fromDocx = buildContentRegistries(DOCX);
  const jsonPortrait = loadJson("data/content_registry.json");
  const jsonV1 = loadJson("data/v1_leader_resource_blocks.json");
  const allJson = [...jsonPortrait, ...jsonV1];

  const errors = [
    ...compareBlockSets("JSON portrait", fromDocx.portraitBlocks, jsonPortrait),
    ...compareBlockSets("JSON v1", fromDocx.v1Blocks, jsonV1),
    ...(await verifyDatabase(allJson)),
  ];

  console.log(`Source: ${DOCX}`);
  console.log(
    `Parsed from docx: ${fromDocx.portraitBlocks.length} portrait + ${fromDocx.v1Blocks.length} v1`,
  );
  console.log(`On disk JSON: ${jsonPortrait.length} + ${jsonV1.length}`);

  if (errors.length > 0) {
    console.error(`\nContent verification failed (${errors.length}):`);
    for (const message of errors) {
      console.error(`  - ${message}`);
    }
    process.exit(1);
  }

  console.log("\nOK: docx, JSON and Neon match — no text loss detected.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
