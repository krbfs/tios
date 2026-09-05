/**
 * Fixed answer vectors for browser e2e quiz runs.
 * Psychotype expectations are computed from `calculate_result` (MVP: TIOS_V1_PROFILES off).
 */

import {
  calculate_result,
  fillAnswers,
  fillTimings,
  type PsychotypeCode,
} from "../../src/lib/calculations";
import { getDemoAnswers } from "../../src/lib/encdata";

const BLOCK_EI = [1, 6, 11, 16, 21, 26, 31, 36, 41, 46, 51, 56, 61, 66, 71];
const BLOCK_TA = [2, 7, 12, 17, 22, 27, 32, 37, 42, 47, 52, 57, 62, 67, 72];
const BLOCK_SS = [3, 8, 13, 18, 23, 28, 33, 38, 43, 48, 53, 58, 63, 68, 73];
const BLOCK_LR = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75];

function setBlock(answers: number[], ids: readonly number[], value: number) {
  for (const id of ids) {
    answers[id - 1] = value;
  }
}

export type QuizE2EFixture = {
  /** Stable id used in CLI filter and E2E_QUIZ_TESTS.md */
  id: string;
  /** Short RU description */
  title: string;
  answers: number[];
  expectedPsychotype: PsychotypeCode;
  /** Substring expected in `#psychotype-title` */
  expectedTitleContains: string;
  /** Optional scale checks against by-encdata / UI radar data */
  expectedScaleMins?: Partial<Record<string, number>>;
};

function fixtureFromAnswers(
  id: string,
  title: string,
  answers: number[],
  expectedTitleContains: string,
  expectedScaleMins?: Partial<Record<string, number>>,
): QuizE2EFixture {
  const computed = calculate_result(answers, fillTimings(5));
  return {
    id,
    title,
    answers,
    expectedPsychotype: computed.psychotype_code,
    expectedTitleContains,
    expectedScaleMins,
  };
}

function pureType(
  id: PsychotypeCode,
  title: string,
  fill: (answers: number[]) => void,
  titleRu: string,
  scaleMins: Partial<Record<string, number>>,
): QuizE2EFixture {
  const answers = fillAnswers(0);
  fill(answers);
  return fixtureFromAnswers(id, title, answers, titleRu, scaleMins);
}

/** All catalogued browser scenarios. */
export const QUIZ_E2E_FIXTURES: QuizE2EFixture[] = [
  pureType(
    "individualist",
    "AGG+SPO max → Индивидуалист",
    (a) => {
      setBlock(a, BLOCK_TA, 2);
      setBlock(a, BLOCK_SS, 2);
    },
    "Индивидуалист",
    { aggression: 30, spontaneity: 30 },
  ),
  pureType(
    "innovator",
    "SPO+EXT max → Инноватор",
    (a) => {
      setBlock(a, BLOCK_SS, 2);
      setBlock(a, BLOCK_EI, -2);
    },
    "Инноватор",
    { spontaneity: 30, extraversion: 30 },
  ),
  pureType(
    "influencer",
    "EXT+LAB max → Лидер мнений",
    (a) => {
      setBlock(a, BLOCK_EI, -2);
      setBlock(a, BLOCK_LR, -2);
    },
    "Лидер мнений",
    { extraversion: 30, lability: 30 },
  ),
  pureType(
    "aesthete",
    "LAB+ANX max → Эстет",
    (a) => {
      setBlock(a, BLOCK_LR, -2);
      setBlock(a, BLOCK_TA, -2);
    },
    "Эстет",
    { lability: 30, anxiety: 30 },
  ),
  pureType(
    "conservative",
    "ANX+SEN max → Консерватор",
    (a) => {
      setBlock(a, BLOCK_TA, -2);
      setBlock(a, BLOCK_SS, -2);
    },
    "Консерватор",
    { anxiety: 30, sensitivity: 30 },
  ),
  pureType(
    "empath",
    "SEN+INT max → Эмпат",
    (a) => {
      setBlock(a, BLOCK_SS, -2);
      setBlock(a, BLOCK_EI, 2);
    },
    "Эмпат",
    { sensitivity: 30, introversion: 30 },
  ),
  pureType(
    "analyst",
    "INT+RIG max → Аналитик",
    (a) => {
      setBlock(a, BLOCK_EI, 2);
      setBlock(a, BLOCK_LR, 2);
    },
    "Аналитик",
    { introversion: 30, rigidity: 30 },
  ),
  pureType(
    "pragmatist",
    "RIG+AGG max → Прагматик",
    (a) => {
      setBlock(a, BLOCK_LR, 2);
      setBlock(a, BLOCK_TA, 2);
    },
    "Прагматик",
    { rigidity: 30, aggression: 30 },
  ),
  fixtureFromAnswers(
    "mixed_zeros",
    "Все ответы 0 → Смешанный тип (MVP)",
    fillAnswers(0),
    "Смешанный тип",
  ),
  fixtureFromAnswers(
    "demo_influencer",
    "Демо-вектор ответов → Лидер мнений",
    getDemoAnswers(),
    "Лидер мнений",
    { extraversion: 24, lability: 18, anxiety: 17 },
  ),
];

/** Default smoke subset (faster). Override with E2E_QUIZ_CASES or E2E_QUIZ_ALL=1. */
export const QUIZ_E2E_SMOKE_IDS = [
  "individualist",
  "empath",
  "mixed_zeros",
  "demo_influencer",
] as const;

export function selectQuizFixtures(): QuizE2EFixture[] {
  if (process.env.E2E_QUIZ_ALL === "1") {
    return QUIZ_E2E_FIXTURES;
  }
  const raw = process.env.E2E_QUIZ_CASES?.trim();
  if (raw) {
    const ids = new Set(
      raw
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    );
    const selected = QUIZ_E2E_FIXTURES.filter((item) => ids.has(item.id));
    if (selected.length === 0) {
      throw new Error(
        `E2E_QUIZ_CASES matched nothing. Known ids: ${QUIZ_E2E_FIXTURES.map((f) => f.id).join(", ")}`,
      );
    }
    return selected;
  }
  return QUIZ_E2E_FIXTURES.filter((item) =>
    (QUIZ_E2E_SMOKE_IDS as readonly string[]).includes(item.id),
  );
}

/** Human-like timings that pass antibot (sum ≫ 120s, not flat). */
export function humanLikeTimings(): number[] {
  return Array.from({ length: 75 }, (_, i) => 2.4 + (i % 13) * 0.35);
}
