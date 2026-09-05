/**
 * Subfactor scores for compensatory checks (sep_5th docx).
 * Each triplet sums pole points on −2…+2 answers → range 0…6; threshold SUBFACTOR_MODERATE_MIN = 2.
 */

import { normalizeAnswers } from "@/lib/calculations";

export const SUBFACTOR_MODERATE_MIN = 2;

export type SubfactorSide = "left" | "right";

export type SubfactorCode =
  | "1.2"
  | "2.3"
  | "3.1"
  | "3.2"
  | "3.3"
  | "3.4"
  | "3.5"
  | "5.1"
  | "5.2"
  | "5.3"
  | "5.5";

type SubfactorDefinition = {
  questions: readonly number[];
  side: SubfactorSide;
};

export const SUBFACTOR_DEFINITIONS: Record<SubfactorCode, SubfactorDefinition> = {
  "1.2": { questions: [16, 21, 26], side: "left" },
  "2.3": { questions: [32, 37, 42], side: "right" },
  "3.1": { questions: [3, 8, 13], side: "left" },
  "3.2": { questions: [18, 23, 28], side: "left" },
  "3.3": { questions: [33, 38, 43], side: "left" },
  "3.4": { questions: [48, 53, 58], side: "left" },
  "3.5": { questions: [63, 68, 73], side: "left" },
  "5.1": { questions: [5, 10, 15], side: "left" },
  "5.2": { questions: [20, 25, 30], side: "left" },
  /** LR 5.3 «Отношение к новизне» — LAB pole (docx «спонтанность»). */
  "5.3": { questions: [35, 40, 45], side: "left" },
  "5.5": { questions: [65, 70, 75], side: "right" },
};

export const SUBFACTOR_TRIplet_MAX = 6;

/** Expected factor prefix per question id (keys table / questions_aug26.json). */
export const SUBFACTOR_QUESTION_FACTOR_PREFIX: Record<number, string> = {
  3: "3.1",
  8: "3.1",
  13: "3.1",
  16: "1.2",
  18: "3.2",
  21: "1.2",
  23: "3.2",
  26: "1.2",
  28: "3.2",
  32: "2.3",
  33: "3.3",
  35: "5.3",
  37: "2.3",
  38: "3.3",
  40: "5.3",
  42: "2.3",
  43: "3.3",
  45: "5.3",
  48: "3.4",
  53: "3.4",
  58: "3.4",
  5: "5.1",
  10: "5.1",
  15: "5.1",
  20: "5.2",
  25: "5.2",
  30: "5.2",
  63: "3.5",
  68: "3.5",
  73: "3.5",
  65: "5.5",
  70: "5.5",
  75: "5.5",
};

function polePoints(val: number, side: SubfactorSide): number {
  if (side === "left") {
    return val < 0 ? Math.abs(val) : 0;
  }
  return val > 0 ? val : 0;
}

function scoreTriplet(
  normalized: readonly number[],
  questions: readonly number[],
  side: SubfactorSide,
): number {
  let total = 0;
  for (const questionId of questions) {
    total += polePoints(normalized[questionId - 1], side);
  }
  return total;
}

export type SubfactorScores = Record<SubfactorCode, number>;

export function emptySubfactorScores(): SubfactorScores {
  return Object.fromEntries(
    Object.keys(SUBFACTOR_DEFINITIONS).map((code) => [code, 0]),
  ) as SubfactorScores;
}

export function calculateSubfactorScores(
  answers: readonly (number | null)[],
): SubfactorScores {
  const normalized = normalizeAnswers(answers);
  const scores = emptySubfactorScores();

  for (const [code, definition] of Object.entries(SUBFACTOR_DEFINITIONS) as [
    SubfactorCode,
    SubfactorDefinition,
  ][]) {
    scores[code] = scoreTriplet(
      normalized,
      definition.questions,
      definition.side,
    );
  }

  return scores;
}

export function isSubfactorModerate(score: number, min = SUBFACTOR_MODERATE_MIN): boolean {
  return score > min;
}
