#!/usr/bin/env node
/**
 * Verify content registry JSON files before prod import.
 * Usage: npm run db:verify-content
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { PrismaClient } from "@prisma/client";

const PSYCHOTYPES = [
  "individualist",
  "innovator",
  "influencer",
  "aesthete",
  "conservative",
  "empath",
  "analyst",
  "pragmatist",
] as const;

const REGISTRIES = [
  {
    mode: "leader_resource",
    file: "data/content_registry.json",
    minPerPsychotype: 10,
  },
  { mode: "insighter", file: "data/insighter_registry.json", minPerPsychotype: 10 },
  {
    mode: "insighter_you",
    file: "data/insighter_you_registry.json",
    minPerPsychotype: 10,
  },
  {
    mode: "stressless",
    file: "data/stressless_registry.json",
    minPerPsychotype: 13,
  },
  { mode: "hr_table", file: "data/hr_table_registry.json", minPerPsychotype: 7 },
] as const;

type RegistryBlock = {
  psychotype_code?: string;
  mode?: string;
  block_key?: string;
  content_text?: string;
  is_active?: boolean;
};

function loadBlocks(filePath: string): RegistryBlock[] {
  const raw = JSON.parse(readFileSync(filePath, "utf8")) as
    | { blocks?: RegistryBlock[] }
    | RegistryBlock[];
  return Array.isArray(raw) ? raw : (raw.blocks ?? []);
}

function verifyRegistry(entry: (typeof REGISTRIES)[number]): string[] {
  const errors: string[] = [];
  const filePath = resolve(process.cwd(), entry.file);
  const blocks = loadBlocks(filePath).filter(
    (block) => block.is_active !== false && block.mode === entry.mode,
  );

  for (const psychotype of PSYCHOTYPES) {
    const typed = blocks.filter((block) => block.psychotype_code === psychotype);
    const withText = typed.filter(
      (block) => typeof block.content_text === "string" && block.content_text.trim(),
    );

    if (withText.length < entry.minPerPsychotype) {
      errors.push(
        `${entry.mode}/${psychotype}: ${withText.length} blocks (expected ≥ ${entry.minPerPsychotype})`,
      );
    }
  }

  console.log(
    `OK ${entry.mode}: ${blocks.length} blocks in ${entry.file}`,
  );

  return errors;
}

function verifyV1ComplexBlocks(): string[] {
  const errors: string[] = [];
  const filePath = resolve(process.cwd(), "data/v1_leader_resource_blocks.json");
  const blocks = loadBlocks(filePath).filter(
    (block) =>
      block.is_active !== false &&
      block.mode === "leader_resource" &&
      block.psychotype_code === "complex",
  );

  for (const blockKey of ["complex_profile_message", "universal_techniques"]) {
    const match = blocks.find(
      (block) =>
        block.block_key === blockKey &&
        typeof block.content_text === "string" &&
        block.content_text.trim(),
    );
    if (!match) {
      errors.push(`v1_leader_resource/complex: missing ${blockKey}`);
    }
  }

  const universal = blocks.find(
    (block) => block.block_key === "universal_techniques",
  );
  if (universal?.content_text && !universal.content_text.includes("4-7-8")) {
    errors.push("v1_leader_resource/complex: universal_techniques missing 4-7-8");
  }

  if (!errors.length) {
    console.log("OK v1_leader_resource complex blocks (plaque + universal_techniques)");
  }

  return errors;
}

async function verifyDatabase(): Promise<string[]> {
  if (!process.env.DATABASE_URL) {
    console.log("Skip DB check (DATABASE_URL not set)");
    return [];
  }

  const db = new PrismaClient();
  const errors: string[] = [];

  try {
    for (const entry of REGISTRIES) {
      for (const psychotype of PSYCHOTYPES) {
        const count = await db.contentBlock.count({
          where: {
            mode: entry.mode,
            psychotypeCode: psychotype,
            isActive: true,
            triadVariant: null,
          },
        });

        if (count < entry.minPerPsychotype) {
          errors.push(
            `DB ${entry.mode}/${psychotype}: ${count} base rows (expected ≥ ${entry.minPerPsychotype})`,
          );
        }
      }
      console.log(`OK DB mode=${entry.mode}`);
    }

    const complexCount = await db.contentBlock.count({
      where: {
        mode: "leader_resource",
        psychotypeCode: "complex",
        blockKey: "complex_profile_message",
        isActive: true,
      },
    });
    if (complexCount < 1) {
      errors.push("DB leader_resource/complex: missing complex_profile_message");
    } else {
      console.log("OK DB leader_resource/complex_profile_message");
    }

    const universalCount = await db.contentBlock.count({
      where: {
        mode: "leader_resource",
        psychotypeCode: "complex",
        blockKey: "universal_techniques",
        isActive: true,
      },
    });
    if (universalCount < 1) {
      errors.push("DB leader_resource/complex: missing universal_techniques");
    } else {
      console.log("OK DB leader_resource/universal_techniques");
    }

    for (const psychotype of PSYCHOTYPES) {
      for (const triad of ["left", "right"] as const) {
        const key =
          triad === "left" ? "triad_addition_left" : "triad_addition_right";
        const count = await db.contentBlock.count({
          where: {
            mode: "leader_resource",
            psychotypeCode: psychotype,
            blockKey: key,
            triadVariant: triad,
            isActive: true,
          },
        });
        if (count < 1) {
          errors.push(`DB leader_resource/${psychotype}/${key}: missing`);
        }
      }
    }
    console.log("OK DB leader_resource triad additions (8×2)");

    for (const blockKey of [
      "empath_subtype_guardian",
      "empath_subtype_creator",
      "empath_subtype_systematic",
    ]) {
      const count = await db.contentBlock.count({
        where: {
          mode: "leader_resource",
          psychotypeCode: "empath",
          blockKey,
          isActive: true,
        },
      });
      if (count < 1) {
        errors.push(`DB leader_resource/empath/${blockKey}: missing`);
      }
    }
    console.log("OK DB leader_resource empath subtypes (3)");
  } finally {
    await db.$disconnect();
  }

  return errors;
}

async function main() {
  const checkDb = process.argv.includes("--db");
  const errors = [...REGISTRIES.flatMap(verifyRegistry), ...verifyV1ComplexBlocks()];

  if (checkDb) {
    errors.push(...(await verifyDatabase()));
  } else {
    console.log("JSON-only check (pass --db to verify DATABASE_URL too)");
  }

  if (errors.length) {
    console.error("\nContent verification failed:");
    for (const message of errors) {
      console.error(`  - ${message}`);
    }
    process.exit(1);
  }

  console.log("\nAll content registries look good.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
