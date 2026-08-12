#!/usr/bin/env node
/**
 * Management command equivalent: import_questions
 * Loads 75 questions from the questionnaire docx into Neon (questions table).
 *
 * Usage:
 *   npm run db:import-questions
 *   npm run db:import-questions -- --file ../source_main/....docx
 */

import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { PrismaClient } from "@prisma/client";

import { parseQuestionnaireDocx } from "./lib/parse-questionnaire-docx";

function findDefaultQuestionnairePath(): string {
  const sourceDir = resolve(process.cwd(), "../source_main");
  const file = readdirSync(sourceDir).find(
    (name) =>
      name.includes("текст_опросника") &&
      name.endsWith(".docx") &&
      !name.startsWith("~") &&
      !name.startsWith("."),
  );

  if (!file) {
    throw new Error(
      `Questionnaire docx not found in ${sourceDir}. Pass --file explicitly.`,
    );
  }

  return join(sourceDir, file);
}

function parseArgs(argv: string[]): { filePath: string } {
  const fileFlagIndex = argv.indexOf("--file");
  if (fileFlagIndex >= 0) {
    const filePath = argv[fileFlagIndex + 1];
    if (!filePath) {
      throw new Error("Missing value for --file");
    }
    return { filePath: resolve(process.cwd(), filePath) };
  }

  return { filePath: findDefaultQuestionnairePath() };
}

async function main() {
  const { filePath } = parseArgs(process.argv.slice(2));
  const questions = parseQuestionnaireDocx(filePath);
  const db = new PrismaClient();

  try {
    let created = 0;
    let updated = 0;

    for (const question of questions) {
      const existing = await db.question.findUnique({
        where: { id: question.id },
        select: { id: true },
      });

      await db.question.upsert({
        where: { id: question.id },
        create: {
          id: question.id,
          leftText: question.left_text,
          rightText: question.right_text,
          factorGroup: question.factor_group,
          subFactor: question.sub_factor,
          tendencyPositive: question.tendency_positive,
          tendencyNegative: question.tendency_negative,
        },
        update: {
          leftText: question.left_text,
          rightText: question.right_text,
          factorGroup: question.factor_group,
          subFactor: question.sub_factor,
          tendencyPositive: question.tendency_positive,
          tendencyNegative: question.tendency_negative,
        },
      });

      if (existing) {
        updated += 1;
      } else {
        created += 1;
      }
    }

    const total = await db.question.count();
    console.log(`Imported from: ${filePath}`);
    console.log(`Upserted: ${questions.length} (created ${created}, updated ${updated})`);
    console.log(`Total questions in DB: ${total}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
