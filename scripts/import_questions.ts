#!/usr/bin/env node
/**
 * Management command equivalent: import_questions
 * Loads 75 questions from the questionnaire docx (or JSON dump) into Neon.
 *
 * Usage:
 *   npm run db:import-questions
 *   npm run db:import-questions -- --file ../source_current/....docx
 *   npm run db:import-questions -- --json data/questions_aug26.json
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { PrismaClient } from "@prisma/client";

import {
  parseQuestionnaireDocx,
  type ParsedQuestion,
} from "./lib/parse-questionnaire-docx";

function findDefaultQuestionnairePath(): string {
  const sourceDir = resolve(process.cwd(), "../source_current");
  const file = readdirSync(sourceDir).find(
    (name) =>
      name.toLowerCase().includes("текст_опросника") &&
      name.endsWith(".docx") &&
      !name.startsWith("~") &&
      !name.startsWith("."),
  );

  if (!file) {
    throw new Error(
      `Questionnaire docx not found in ${sourceDir}. Pass --file or --json explicitly.`,
    );
  }

  return join(sourceDir, file);
}

function parseArgs(argv: string[]): { filePath?: string; jsonPath?: string } {
  const fileFlagIndex = argv.indexOf("--file");
  const jsonFlagIndex = argv.indexOf("--json");
  const out: { filePath?: string; jsonPath?: string } = {};

  if (fileFlagIndex >= 0) {
    const filePath = argv[fileFlagIndex + 1];
    if (!filePath) throw new Error("Missing value for --file");
    out.filePath = resolve(process.cwd(), filePath);
  }

  if (jsonFlagIndex >= 0) {
    const jsonPath = argv[jsonFlagIndex + 1];
    if (!jsonPath) throw new Error("Missing value for --json");
    out.jsonPath = resolve(process.cwd(), jsonPath);
  }

  if (!out.filePath && !out.jsonPath) {
    out.filePath = findDefaultQuestionnairePath();
  }

  return out;
}

function questionsFromJsonDump(jsonPath: string): ParsedQuestion[] {
  const raw = JSON.parse(readFileSync(jsonPath, "utf8")) as {
    questions: Array<{
      id: number;
      factor: string;
      left_text: string;
      right_text: string;
    }>;
  };

  if (!Array.isArray(raw.questions) || raw.questions.length !== 75) {
    throw new Error(`Expected 75 questions in ${jsonPath}`);
  }

  const TENDENCY_BY_BLOCK: Record<string, { positive: string; negative: string }> = {
    "1": { positive: "extraversion", negative: "introversion" },
    "2": { positive: "anxiety", negative: "aggression" },
    "3": { positive: "sensitivity", negative: "spontaneity" },
    "5": { positive: "lability", negative: "rigidity" },
  };
  const SYSTEMIC_BY_SUB: Record<string, string> = {
    "4.1": "sys_energy",
    "4.2": "sys_result",
    "4.3": "sys_quality",
    "4.4": "sys_rules",
    "4.5": "sys_delegation",
  };

  return raw.questions
    .slice()
    .sort((a, b) => a.id - b.id)
    .map((q) => {
      const subFactor = q.factor.split(" ")[0];
      const block = subFactor.split(".")[0];
      if (block === "4") {
        return {
          id: q.id,
          left_text: q.left_text,
          right_text: q.right_text,
          factor_group: q.factor,
          sub_factor: subFactor,
          tendency_positive: SYSTEMIC_BY_SUB[subFactor],
          tendency_negative: null,
        };
      }
      const tendencies = TENDENCY_BY_BLOCK[block];
      if (!tendencies) {
        throw new Error(`Unknown factor for question ${q.id}: ${q.factor}`);
      }
      return {
        id: q.id,
        left_text: q.left_text,
        right_text: q.right_text,
        factor_group: q.factor,
        sub_factor: subFactor,
        tendency_positive: tendencies.positive,
        tendency_negative: tendencies.negative,
      };
    });
}

async function main() {
  const { filePath, jsonPath } = parseArgs(process.argv.slice(2));
  const questions = jsonPath
    ? questionsFromJsonDump(jsonPath)
    : parseQuestionnaireDocx(filePath!);
  const sourceLabel = jsonPath ?? filePath!;
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
    console.log(`Imported from: ${sourceLabel}`);
    console.log(
      `Upserted: ${questions.length} (created ${created}, updated ${updated})`,
    );
    console.log(`Total questions in DB: ${total}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
