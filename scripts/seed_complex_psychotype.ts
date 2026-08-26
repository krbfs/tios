#!/usr/bin/env node
/**
 * Upsert psychotype_definitions row for V1 code `complex` (no tendencies).
 *
 * Usage: npx tsx scripts/seed_complex_psychotype.ts
 */

import { PrismaClient } from "@prisma/client";

async function main() {
  const db = new PrismaClient();
  try {
    const row = await db.psychotypeDefinition.upsert({
      where: { code: "complex" },
      create: {
        code: "complex",
        nameRu: "Сложный профиль",
        tendency1: "",
        tendency2: "",
        level: "complex",
        isActive: true,
      },
      update: {
        nameRu: "Сложный профиль",
        tendency1: "",
        tendency2: "",
        level: "complex",
        isActive: true,
      },
    });
    console.log(`Upserted psychotype_definitions id=${row.id} code=${row.code}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
