/**
 * Расчёты по ТЗ §3.1–3.3 и NAVIGATOR §7–8.
 * Источник формул: ФИНАЛЬНОЕ ТЗ, разделы 3.1–3.5.
 */

export const SCALE_KEYS = [
  "extraversion",
  "introversion",
  "anxiety",
  "aggression",
  "sensitivity",
  "spontaneity",
  "lability",
  "rigidity",
] as const;

export type ScaleKey = (typeof SCALE_KEYS)[number];
export type ScaledScores = Record<ScaleKey, number>;

export const SYSTEMIC_KEYS = [
  "sys_energy",
  "sys_result",
  "sys_quality",
  "sys_rules",
  "sys_delegation",
] as const;

export type SystemicKey = (typeof SYSTEMIC_KEYS)[number];
export type SystemicScores = Record<SystemicKey, number>;

export type PsychotypeCode =
  | "individualist"
  | "innovator"
  | "influencer"
  | "aesthete"
  | "conservative"
  | "empath"
  | "analyst"
  | "pragmatist";

export type PsychotypeResult = {
  psychotype_code: PsychotypeCode;
  secondary: PsychotypeCode | null;
  is_dyad: boolean;
  avg_intensity: number;
  warnings: string[];
};

/** Блок 1: экстраверсия / интроверсия */
const BLOCK_EI = [1, 6, 11, 16, 21, 26, 31, 36, 41, 46, 51, 56, 61, 66, 71];
/** Блок 2: тревожность / агрессивность */
const BLOCK_TA = [2, 7, 12, 17, 22, 27, 32, 37, 42, 47, 52, 57, 62, 67, 72];
/** Блок 3: сензитивность / спонтанность */
const BLOCK_SS = [3, 8, 13, 18, 23, 28, 33, 38, 43, 48, 53, 58, 63, 68, 73];
/** Блок 5: лабильность / ригидность */
const BLOCK_LR = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75];

const SYSTEMIC_BLOCKS: Record<SystemicKey, number[]> = {
  sys_energy: [4, 9, 14],
  sys_result: [19, 24, 29],
  sys_quality: [34, 39, 44],
  sys_rules: [49, 54, 59],
  sys_delegation: [64, 69, 74],
};

/** Пары соседних секторов → психотип (NAVIGATOR §7.4) */
const PSYCHOTYPE_PAIRS: { code: PsychotypeCode; a: ScaleKey; b: ScaleKey }[] = [
  { code: "individualist", a: "aggression", b: "spontaneity" },
  { code: "innovator", a: "spontaneity", b: "extraversion" },
  { code: "influencer", a: "extraversion", b: "lability" },
  { code: "aesthete", a: "lability", b: "anxiety" },
  { code: "conservative", a: "anxiety", b: "sensitivity" },
  { code: "empath", a: "sensitivity", b: "introversion" },
  { code: "analyst", a: "introversion", b: "rigidity" },
  { code: "pragmatist", a: "rigidity", b: "aggression" },
];

const OPPOSITE_PAIRS: [ScaleKey, ScaleKey][] = [
  ["extraversion", "introversion"],
  ["anxiety", "aggression"],
  ["sensitivity", "spontaneity"],
  ["lability", "rigidity"],
];

const BLOCK_BY_PAIR: Record<string, number[]> = {
  "extraversion,introversion": BLOCK_EI,
  "anxiety,aggression": BLOCK_TA,
  "sensitivity,spontaneity": BLOCK_SS,
  "lability,rigidity": BLOCK_LR,
};

const QUESTION_COUNT = 75;
const FAST_ANSWER_SECONDS = 2;
const QUICK_TEST_SECONDS = 60;

function assertAnswers(answers: readonly number[]): void {
  if (answers.length !== QUESTION_COUNT) {
    throw new Error(`Expected ${QUESTION_COUNT} answers, got ${answers.length}`);
  }
  for (const value of answers) {
    if (!Number.isInteger(value) || value < -2 || value > 2) {
      throw new Error(`Invalid answer value: ${value}`);
    }
  }
}

function sumAnswers(answers: readonly number[], questionIds: readonly number[]): number {
  return questionIds.reduce((sum, id) => sum + answers[id - 1], 0);
}

/** Левое утверждение (−2…0) увеличивает «левую» шкалу, правое — «правую». */
function scaleFromBlock(
  answers: readonly number[],
  questionIds: readonly number[],
  pole: "left" | "right",
): number {
  const raw = sumAnswers(answers, questionIds);
  const signedRaw = pole === "left" ? -raw : raw;
  return (signedRaw + 30) / 2;
}

function systemicFromBlock(answers: readonly number[], questionIds: readonly number[]): number {
  const raw = sumAnswers(answers, questionIds);
  return (raw + 6) * 2.5;
}

export function calculate_scaled_scores(answers: readonly number[]): ScaledScores {
  assertAnswers(answers);

  return {
    extraversion: scaleFromBlock(answers, BLOCK_EI, "left"),
    introversion: scaleFromBlock(answers, BLOCK_EI, "right"),
    anxiety: scaleFromBlock(answers, BLOCK_TA, "left"),
    aggression: scaleFromBlock(answers, BLOCK_TA, "right"),
    sensitivity: scaleFromBlock(answers, BLOCK_SS, "left"),
    spontaneity: scaleFromBlock(answers, BLOCK_SS, "right"),
    lability: scaleFromBlock(answers, BLOCK_LR, "left"),
    rigidity: scaleFromBlock(answers, BLOCK_LR, "right"),
  };
}

export function calculate_systemic_scores(answers: readonly number[]): SystemicScores {
  assertAnswers(answers);

  return {
    sys_energy: systemicFromBlock(answers, SYSTEMIC_BLOCKS.sys_energy),
    sys_result: systemicFromBlock(answers, SYSTEMIC_BLOCKS.sys_result),
    sys_quality: systemicFromBlock(answers, SYSTEMIC_BLOCKS.sys_quality),
    sys_rules: systemicFromBlock(answers, SYSTEMIC_BLOCKS.sys_rules),
    sys_delegation: systemicFromBlock(answers, SYSTEMIC_BLOCKS.sys_delegation),
  };
}

function pairSum(scores: ScaledScores, code: PsychotypeCode): number {
  const pair = PSYCHOTYPE_PAIRS.find((item) => item.code === code);
  if (!pair) {
    throw new Error(`Unknown psychotype code: ${code}`);
  }
  return scores[pair.a] + scores[pair.b];
}

function areAdjacent(a: PsychotypeCode, b: PsychotypeCode): boolean {
  const indexA = PSYCHOTYPE_PAIRS.findIndex((item) => item.code === a);
  const indexB = PSYCHOTYPE_PAIRS.findIndex((item) => item.code === b);
  if (indexA < 0 || indexB < 0) {
    return false;
  }
  const diff = Math.abs(indexA - indexB);
  return diff === 1 || diff === PSYCHOTYPE_PAIRS.length - 1;
}

/** Средняя выраженность / avg_intensity: сумма 8 шкал ÷ 8 (ответ методолога 13.08.2026). */
export function calculate_avg_intensity(scaled_scores: ScaledScores): number {
  return (
    SCALE_KEYS.reduce((sum, key) => sum + scaled_scores[key], 0) / SCALE_KEYS.length
  );
}

function buildThresholdWarnings(scores: ScaledScores, avgIntensity: number): string[] {
  const warnings: string[] = [];
  const meanOf8 = avgIntensity;
  const values = SCALE_KEYS.map((key) => scores[key]);

  if (avgIntensity <= 7) {
    warnings.push(
      "Ведущие тенденции слабо выражены. Обратите внимание на человека, понаблюдайте за ним, данных не хватает",
    );
  } else if (avgIntensity <= 12) {
    warnings.push("Вероятность достоверного прогноза — выше средней");
  } else {
    warnings.push("Вероятность достоверного прогноза — высокая");
  }

  if (values.some((value) => value > 22)) {
    warnings.push("Возможно, человек находится в состоянии сильного стресса");
  }
  if (scores.sensitivity > 22 || scores.anxiety > 22) {
    warnings.push("Вероятно депрессивное состояние");
  }
  if (scores.extraversion > 22 || scores.lability > 22) {
    warnings.push("Вероятны эмоциональные проявления");
  }
  if (scores.introversion > 22 && scores.rigidity > 22) {
    warnings.push("Высокий риск выгорания");
  }
  if (scores.aggression > 22 && scores.spontaneity > 22) {
    warnings.push("Высокий риск конфликтов");
  }

  const aboveMean = values.filter((value) => value > meanOf8 * 1.3);
  if (aboveMean.length >= 1) {
    warnings.push("Высокая вероятность нервного срыва");
  }

  const top4 = [...values].sort((a, b) => b - a).slice(0, 4);
  if (
    top4.length === 4 &&
    avgIntensity > 0 &&
    top4.every((value) => Math.abs(value - avgIntensity) / avgIntensity < 0.1)
  ) {
    warnings.push("Высокая вероятность ошибки прогноза");
  }

  if (values.every((value) => value < 5)) {
    warnings.push("Высокая вероятность ошибки прогноза");
  }

  return [...new Set(warnings)];
}

export function determine_psychotype(scaled_scores: ScaledScores): PsychotypeResult {
  const ranked = PSYCHOTYPE_PAIRS.map((pair) => ({
    code: pair.code,
    sum: pairSum(scaled_scores, pair.code),
  })).sort((a, b) => b.sum - a.sum);

  const leading = ranked[0];
  const secondary = ranked[1];
  const avg_intensity = calculate_avg_intensity(scaled_scores);

  const leadingAhead =
    secondary.sum === 0
      ? leading.sum > 0
      : leading.sum > secondary.sum * 1.2;
  const adjacent = areAdjacent(leading.code, secondary.code);
  const is_dyad = !leadingAhead || !adjacent;

  return {
    psychotype_code: leading.code,
    secondary: is_dyad ? secondary.code : null,
    is_dyad,
    avg_intensity,
    warnings: buildThresholdWarnings(scaled_scores, avg_intensity),
  };
}

function countFastAnswers(timePerQuestion: readonly number[]): number {
  return timePerQuestion.filter((seconds) => seconds < FAST_ANSWER_SECONDS).length;
}

export function validate_answers(
  answers: readonly (number | null)[],
  time_per_question: readonly number[],
): string[] {
  if (answers.length !== QUESTION_COUNT) {
    throw new Error(`Expected ${QUESTION_COUNT} answers, got ${answers.length}`);
  }

  if (time_per_question.length !== QUESTION_COUNT) {
    throw new Error(
      `Expected ${QUESTION_COUNT} timing values, got ${time_per_question.length}`,
    );
  }

  const codes: string[] = [];
  const answered = answers.filter((value): value is number => value !== null);

  for (const value of answered) {
    if (!Number.isInteger(value) || value < -2 || value > 2) {
      throw new Error(`Invalid answer value: ${value}`);
    }
  }

  if (answered.length === QUESTION_COUNT) {
    const uniqueValues = new Set(answered);
    if (uniqueValues.size === 1) {
      codes.push("falsy_answers");
    }
  }

  const totalSeconds = time_per_question.reduce((sum, value) => sum + value, 0);
  if (totalSeconds < QUICK_TEST_SECONDS) {
    codes.push("quickly_answers");
  }

  if (countFastAnswers(time_per_question) / QUESTION_COUNT > 0.1) {
    codes.push("too_many_fast_answers");
  }

  for (const [left, right] of OPPOSITE_PAIRS) {
    const blockKey = `${left},${right}`;
    const blockQuestions = BLOCK_BY_PAIR[blockKey];
    const blockAnswers = blockQuestions.map((id) => answers[id - 1]);
    const unanswered = blockAnswers.filter((value) => value === null).length;
    const hasStrong = blockAnswers.some(
      (value) => value !== null && Math.abs(value) >= 1,
    );
    if (unanswered >= 3 && !hasStrong) {
      codes.push("incompletely_answered_block");
      break;
    }
  }

  if (answered.length === QUESTION_COUNT) {
    const scaled = calculate_scaled_scores(answers as number[]);
    for (const [left, right] of OPPOSITE_PAIRS) {
      if (scaled[left] > 15 && scaled[right] > 15) {
        codes.push("impossible_tendencies");
        break;
      }
    }
  }

  return [...new Set(codes)];
}

/** Удобная обёртка для API submit. */
export function calculate_result(answers: readonly number[], time_per_question: readonly number[]) {
  const scaled_scores = calculate_scaled_scores(answers);
  const scaled_systemic = calculate_systemic_scores(answers);
  const psychotype = determine_psychotype(scaled_scores);
  const validation_warnings = validate_answers(answers, time_per_question);

  return {
    scaled_scores,
    scaled_systemic,
    psychotype_code: psychotype.psychotype_code,
    psychotype_secondary: psychotype.secondary,
    avg_intensity: psychotype.avg_intensity,
    warnings: psychotype.warnings,
    validation_warnings,
  };
}

export function fillAnswers(value: number): number[] {
  return Array.from({ length: QUESTION_COUNT }, () => value);
}

export function fillTimings(seconds: number): number[] {
  return Array.from({ length: QUESTION_COUNT }, () => seconds);
}
