/**
 * Расчёты по NAVIGATOR v9.0 + «Текст опросника и математика финал» v3.0.
 * Принцип: каждая тенденция считается отдельно; сырой балл = итог; диапазон 0–30.
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

/** Legacy bar keys (0–12 per subscale: LAB + RIG) + block 4 detail. */
export const SYSTEMIC_KEYS = [
  "sys_energy",
  "sys_result",
  "sys_quality",
  "sys_rules",
  "sys_delegation",
] as const;

export type SystemicKey = (typeof SYSTEMIC_KEYS)[number];

export type WorkSubscaleKey =
  | "sub4_1_LAB"
  | "sub4_1_RIG"
  | "sub4_2_LAB"
  | "sub4_2_RIG"
  | "sub4_3_LAB"
  | "sub4_3_RIG"
  | "sub4_4_LAB"
  | "sub4_4_RIG"
  | "sub4_5_LAB"
  | "sub4_5_RIG";

export type SystemicScores = Record<SystemicKey, number> &
  Record<WorkSubscaleKey, number> & {
    LAB_work: number;
    RIG_work: number;
    delta_LAB: number;
    delta_RIG: number;
    tension_zone: boolean;
    correspondence_type: string | null;
  };

export type PsychotypeCode =
  | "individualist"
  | "innovator"
  | "influencer"
  | "aesthete"
  | "conservative"
  | "empath"
  | "analyst"
  | "pragmatist"
  | "mixed";

export type PsychotypeResult = {
  psychotype_code: PsychotypeCode;
  secondary: PsychotypeCode | null;
  is_dyad: boolean;
  avg_intensity: number;
  warnings: string[];
};

const BLOCK_EI = [1, 6, 11, 16, 21, 26, 31, 36, 41, 46, 51, 56, 61, 66, 71];
const BLOCK_TA = [2, 7, 12, 17, 22, 27, 32, 37, 42, 47, 52, 57, 62, 67, 72];
const BLOCK_SS = [3, 8, 13, 18, 23, 28, 33, 38, 43, 48, 53, 58, 63, 68, 73];
const BLOCK_LR = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75];

const PERSONALITY_BLOCKS: { questions: number[]; left: ScaleKey; right: ScaleKey }[] = [
  { questions: BLOCK_EI, left: "extraversion", right: "introversion" },
  { questions: BLOCK_TA, left: "anxiety", right: "aggression" },
  { questions: BLOCK_SS, left: "sensitivity", right: "spontaneity" },
  { questions: BLOCK_LR, left: "lability", right: "rigidity" },
];

const BLOCK4_SUBSCALES: {
  questions: number[];
  labKey: WorkSubscaleKey;
  rigKey: WorkSubscaleKey;
  inverted: boolean;
}[] = [
  {
    questions: [4, 9, 14],
    labKey: "sub4_1_LAB",
    rigKey: "sub4_1_RIG",
    inverted: false,
  },
  {
    questions: [19, 24, 29],
    labKey: "sub4_2_LAB",
    rigKey: "sub4_2_RIG",
    inverted: true,
  },
  {
    questions: [34, 39, 44],
    labKey: "sub4_3_LAB",
    rigKey: "sub4_3_RIG",
    inverted: true,
  },
  {
    questions: [49, 54, 59],
    labKey: "sub4_4_LAB",
    rigKey: "sub4_4_RIG",
    inverted: false,
  },
  {
    questions: [64, 69, 74],
    labKey: "sub4_5_LAB",
    rigKey: "sub4_5_RIG",
    inverted: false,
  },
];

const SYS_KEY_BY_SUBSCALE: Record<number, SystemicKey> = {
  1: "sys_energy",
  2: "sys_result",
  3: "sys_quality",
  4: "sys_rules",
  5: "sys_delegation",
};

/** Круг тенденций NAVIGATOR §4.6 (коды → ScaleKey). */
const TENDENCY_CIRCLE: ScaleKey[] = [
  "aggression",
  "spontaneity",
  "extraversion",
  "lability",
  "anxiety",
  "sensitivity",
  "introversion",
  "rigidity",
];

const ADJACENT_PSYCHOTYPES: { a: ScaleKey; b: ScaleKey; code: PsychotypeCode }[] = [
  { a: "aggression", b: "spontaneity", code: "individualist" },
  { a: "spontaneity", b: "extraversion", code: "innovator" },
  { a: "extraversion", b: "lability", code: "influencer" },
  { a: "lability", b: "anxiety", code: "aesthete" },
  { a: "anxiety", b: "sensitivity", code: "conservative" },
  { a: "sensitivity", b: "introversion", code: "empath" },
  { a: "introversion", b: "rigidity", code: "analyst" },
  { a: "rigidity", b: "aggression", code: "pragmatist" },
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
const TENSION_THRESHOLD = 10;

const MIXED_PSYCHOTYPE_LABEL = "mixed";

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

function applySeparateAnswer(
  val: number,
  leftKey: ScaleKey | WorkSubscaleKey,
  rightKey: ScaleKey | WorkSubscaleKey,
  scores: Record<string, number>,
): void {
  if (val < 0) {
    scores[leftKey] += Math.abs(val);
  } else if (val > 0) {
    scores[rightKey] += val;
  }
}

function applyBlock4Answer(
  val: number,
  inverted: boolean,
  labKey: WorkSubscaleKey,
  rigKey: WorkSubscaleKey,
  scores: Record<string, number>,
): void {
  if (inverted) {
    applySeparateAnswer(val, rigKey, labKey, scores);
  } else {
    applySeparateAnswer(val, labKey, rigKey, scores);
  }
}

function emptyScaledScores(): ScaledScores {
  return {
    extraversion: 0,
    introversion: 0,
    anxiety: 0,
    aggression: 0,
    sensitivity: 0,
    spontaneity: 0,
    lability: 0,
    rigidity: 0,
  };
}

function emptyWorkSubscales(): Record<WorkSubscaleKey, number> {
  return {
    sub4_1_LAB: 0,
    sub4_1_RIG: 0,
    sub4_2_LAB: 0,
    sub4_2_RIG: 0,
    sub4_3_LAB: 0,
    sub4_3_RIG: 0,
    sub4_4_LAB: 0,
    sub4_4_RIG: 0,
    sub4_5_LAB: 0,
    sub4_5_RIG: 0,
  };
}

export function calculate_scaled_scores(answers: readonly number[]): ScaledScores {
  assertAnswers(answers);
  const scores = emptyScaledScores();

  for (const block of PERSONALITY_BLOCKS) {
    for (const questionId of block.questions) {
      applySeparateAnswer(
        answers[questionId - 1],
        block.left,
        block.right,
        scores,
      );
    }
  }

  return scores;
}

function classifyCorrespondence(deltaLab: number, deltaRig: number): string | null {
  if (Math.abs(deltaLab) <= TENSION_THRESHOLD && Math.abs(deltaRig) <= TENSION_THRESHOLD) {
    return "Соответствие";
  }
  if (deltaLab > TENSION_THRESHOLD && deltaRig < -TENSION_THRESHOLD) {
    return "Гибкий по натуре – жёсткий в работе";
  }
  if (deltaLab < -TENSION_THRESHOLD && deltaRig > TENSION_THRESHOLD) {
    return "Жёсткий по натуре – гибкий в работе";
  }
  if (deltaLab > TENSION_THRESHOLD && deltaRig > TENSION_THRESHOLD) {
    return "Обе выше в личности";
  }
  if (deltaLab < -TENSION_THRESHOLD && deltaRig < -TENSION_THRESHOLD) {
    return "Обе выше в работе";
  }
  return null;
}

export function calculate_systemic_scores(answers: readonly number[]): SystemicScores {
  assertAnswers(answers);

  const subscales = emptyWorkSubscales();
  const legacyBars: Record<SystemicKey, number> = {
    sys_energy: 0,
    sys_result: 0,
    sys_quality: 0,
    sys_rules: 0,
    sys_delegation: 0,
  };

  BLOCK4_SUBSCALES.forEach((subscale, index) => {
    for (const questionId of subscale.questions) {
      applyBlock4Answer(
        answers[questionId - 1],
        subscale.inverted,
        subscale.labKey,
        subscale.rigKey,
        subscales,
      );
    }
    const lab = subscales[subscale.labKey];
    const rig = subscales[subscale.rigKey];
    legacyBars[SYS_KEY_BY_SUBSCALE[index + 1]] = lab + rig;
  });

  const LAB_work =
    subscales.sub4_1_LAB +
    subscales.sub4_2_LAB +
    subscales.sub4_3_LAB +
    subscales.sub4_4_LAB +
    subscales.sub4_5_LAB;
  const RIG_work =
    subscales.sub4_1_RIG +
    subscales.sub4_2_RIG +
    subscales.sub4_3_RIG +
    subscales.sub4_4_RIG +
    subscales.sub4_5_RIG;

  const personality = calculate_scaled_scores(answers);
  const delta_LAB = personality.lability - LAB_work;
  const delta_RIG = personality.rigidity - RIG_work;
  const tension_zone =
    Math.abs(delta_LAB) > TENSION_THRESHOLD || Math.abs(delta_RIG) > TENSION_THRESHOLD;

  return {
    ...legacyBars,
    ...subscales,
    LAB_work,
    RIG_work,
    delta_LAB,
    delta_RIG,
    tension_zone,
    correspondence_type: classifyCorrespondence(delta_LAB, delta_RIG),
  };
}

export function calculate_avg_intensity(scaled_scores: ScaledScores): number {
  return (
    SCALE_KEYS.reduce((sum, key) => sum + scaled_scores[key], 0) / SCALE_KEYS.length
  );
}

function areScalesAdjacent(a: ScaleKey, b: ScaleKey): boolean {
  const indexA = TENDENCY_CIRCLE.indexOf(a);
  const indexB = TENDENCY_CIRCLE.indexOf(b);
  if (indexA < 0 || indexB < 0) {
    return false;
  }
  const diff = Math.abs(indexA - indexB);
  return diff === 1 || diff === TENDENCY_CIRCLE.length - 1;
}

function psychotypeForPair(a: ScaleKey, b: ScaleKey): PsychotypeCode | null {
  const match = ADJACENT_PSYCHOTYPES.find(
    (pair) =>
      (pair.a === a && pair.b === b) || (pair.a === b && pair.b === a),
  );
  return match?.code ?? null;
}


function hasNonAdjacentHighPair(scores: ScaledScores, mean: number): boolean {
  const threshold = mean * 1.3;
  const high = SCALE_KEYS.filter((key) => scores[key] > threshold);
  if (high.length < 2) {
    return false;
  }

  for (let i = 0; i < high.length; i += 1) {
    for (let j = i + 1; j < high.length; j += 1) {
      if (!areScalesAdjacent(high[i], high[j])) {
        return true;
      }
    }
  }

  return false;
}

function hasContradictoryOppositePair(scores: ScaledScores): boolean {
  for (const [left, right] of OPPOSITE_PAIRS) {
    const a = scores[left];
    const b = scores[right];
    if (a > 8 && b > 8) {
      const max = Math.max(a, b);
      if (Math.abs(a - b) / max < 0.15) {
        return true;
      }
    }
  }

  return false;
}

function buildThresholdWarnings(
  scores: ScaledScores,
  avgIntensity: number,
  systemic?: Pick<SystemicScores, "tension_zone" | "correspondence_type">,
): string[] {
  const warnings: string[] = [];
  const meanOf8 = avgIntensity;
  const values = SCALE_KEYS.map((key) => scores[key]);

  if (avgIntensity <= 7) {
    warnings.push(
      "Ведущие тенденции слабо выражены. Есть вероятность ошибки в прогнозе",
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

  const highAboveMean = SCALE_KEYS.filter((key) => scores[key] > meanOf8 * 1.3);
  if (highAboveMean.length >= 1) {
    warnings.push("Высокая вероятность нервного срыва");
  }
  if (hasNonAdjacentHighPair(scores, meanOf8)) {
    warnings.push("Высокая вероятность сильного выгорания");
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

  if (hasContradictoryOppositePair(scores)) {
    warnings.push("Высокая вероятность непредсказуемого поведения");
  }

  if (systemic?.tension_zone) {
    warnings.push("Выявлена зона напряжения между личным и рабочим профилем");
  }

  return [...new Set(warnings)];
}

export function determine_psychotype(
  scaled_scores: ScaledScores,
  systemic?: Pick<SystemicScores, "tension_zone" | "correspondence_type">,
): PsychotypeResult {
  const ranked = SCALE_KEYS.map((key) => ({
    key,
    score: scaled_scores[key],
  })).sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));

  const top1 = ranked[0]?.key;
  const top2 = ranked[1]?.key;
  const top3 = ranked[2]?.key;
  const avg_intensity = calculate_avg_intensity(scaled_scores);

  if (!top1 || !top2 || !top3) {
    return {
      psychotype_code: MIXED_PSYCHOTYPE_LABEL,
      secondary: null,
      is_dyad: false,
      avg_intensity,
      warnings: buildThresholdWarnings(scaled_scores, avg_intensity, systemic),
    };
  }

  const candidatePairs: [ScaleKey, ScaleKey][] = [
    [top1, top2],
    [top1, top3],
    [top2, top3],
  ];

  const adjacentCandidates = candidatePairs
    .filter(([a, b]) => areScalesAdjacent(a, b))
    .map(([a, b]) => ({
      a,
      b,
      sum: scaled_scores[a] + scaled_scores[b],
      code: psychotypeForPair(a, b),
    }))
    .filter((item): item is typeof item & { code: PsychotypeCode } => item.code !== null)
    .sort((left, right) => right.sum - left.sum);

  const psychotype_code =
    adjacentCandidates[0]?.code ?? (MIXED_PSYCHOTYPE_LABEL as PsychotypeCode);

  return {
    psychotype_code,
    secondary: null,
    is_dyad: false,
    avg_intensity,
    warnings: buildThresholdWarnings(scaled_scores, avg_intensity, systemic),
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

  return [...new Set(codes)];
}

/** Удобная обёртка для API submit. */
export function calculate_result(answers: readonly number[], time_per_question: readonly number[]) {
  const scaled_scores = calculate_scaled_scores(answers);
  const scaled_systemic = calculate_systemic_scores(answers);
  const psychotype = determine_psychotype(scaled_scores, scaled_systemic);
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
