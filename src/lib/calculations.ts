/**
 * Расчёты по NAVIGATOR v10.0 + «Текст опросника и математика» (окончательно).
 * Принцип: каждая тенденция считается отдельно; сырой балл = итог; диапазон 0–30.
 * Маппинг вопрос→шкала (BLOCK_*) сверен 26.08.2026 с ключами в source_current — без изменений vs MVP.
 */

import {
  cascadeResultIsComplex,
  resolveProfileCascade,
} from "@/lib/profile-cascade";

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
  | "mixed"
  /** V1: no adjacent pair in top-3 (NAVIGATOR 10.0). */
  | "complex";

export type TriadVariant = "left" | "right" | "detected";

export type ProfileComplexity =
  | "pure"
  | "triad"
  | "dual"
  | "multidimensional"
  | "modifier"
  | "balanced";

export type TriadStatus = "stable" | "conflict" | "impossible" | "none";

export type ExpressionLevel = "expressed" | "moderate" | "weak" | "blurred";

export type PsychotypeResult = {
  psychotype_code: PsychotypeCode;
  secondary: PsychotypeCode | null;
  is_dyad: boolean;
  /** V1: left/right relative to the pure-type pair on the circle; null if absent. */
  triad_variant: TriadVariant | null;
  /** QA 2 / NAVIGATOR §2.5: stable | conflict | impossible | none (triad not formed). */
  triad_status: TriadStatus;
  avg_intensity: number;
  /** QA-решения §4: normalized top-2 scores → recommendation depth; null at complex. */
  expression_level: ExpressionLevel | null;
  warnings: string[];
  /** sep_16 cascade (V1): основной тип профиля. */
  primary_type: PsychotypeCode | null;
  secondary_type: PsychotypeCode | null;
  profile_complexity: ProfileComplexity | null;
  cascade_level_used: number | null;
  cluster_tendencies: ScaleKey[];
};

/** Max raw score per tendency (NAVIGATOR / questionnaire). */
export const SCALE_SCORE_MAX = 30;

/** QA-решения §3: 3rd tendency must be expressed (normalized ≥ 0.55). */
export const TRIAD_THIRD_NORMALIZED_MIN = 0.55;

export const EXPRESSION_EXPRESSED_MIN = 0.7;
export const EXPRESSION_MODERATE_MIN = 0.5;
/** Normalized gap top-2 vs top-3 below this → blurred profile. */
export const EXPRESSION_BLUR_TOP_GAP = 0.1;

/** Empath sub-indices (NAVIGATOR 10.0 §4.6): sensitivity-side points on SS subsets. */
export type EmpathSubIndices = {
  sub_index_s: number;
  sub_index_n: number;
};

/** When true: unresolved top-3 → `complex`; triad_variant is computed. Set via TIOS_V1_PROFILES. */
export function isV1ProfilesEnabled(): boolean {
  const value = process.env.TIOS_V1_PROFILES;
  return value === "true" || value === "1";
}

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
const COMPLEX_PSYCHOTYPE_LABEL = "complex";

/** Empath S — sensitivity-side points (0..12). */
const EMPATH_S_QUESTIONS = [33, 38, 43, 63, 68, 73] as const;
/** Empath N — sensitivity-side points on normative facet items (0..18). */
const EMPATH_N_QUESTIONS = [3, 8, 13, 18, 23, 28, 48, 53, 58] as const;

/** TZ §9: null → 0; values must be integers in −2..+2. */
export function normalizeAnswers(answers: readonly (number | null)[]): number[] {
  if (answers.length !== QUESTION_COUNT) {
    throw new Error(`Expected ${QUESTION_COUNT} answers, got ${answers.length}`);
  }
  return answers.map((value) => {
    if (value === null) {
      return 0;
    }
    if (!Number.isInteger(value) || value < -2 || value > 2) {
      throw new Error(`Invalid answer value: ${value}`);
    }
    return value;
  });
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

export function calculate_scaled_scores(
  answers: readonly (number | null)[],
): ScaledScores {
  const normalized = normalizeAnswers(answers);
  const scores = emptyScaledScores();

  for (const block of PERSONALITY_BLOCKS) {
    for (const questionId of block.questions) {
      applySeparateAnswer(
        normalized[questionId - 1],
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
    return "Обе шкалы выше в личности";
  }
  if (deltaLab < -TENSION_THRESHOLD && deltaRig < -TENSION_THRESHOLD) {
    return "Обе шкалы выше в работе";
  }
  return null;
}

const EXPRESSION_COACHING: Record<ExpressionLevel, string> = {
  expressed:
    "Профиль выраженный — рекомендации ниже максимально привязаны к вашим ведущим тенденциям.",
  moderate:
    "Профиль умеренный — используйте рекомендации как ориентир и адаптируйте под ситуацию.",
  weak:
    "Ведущие тенденции выражены слабо — опирайтесь на универсальные практики и наблюдайте за собой дольше.",
  blurred:
    "Профиль смазанный — несколько тенденций близки по силе; начните с универсальных техник.",
};

/** QA 2 A4.11: coaching when triad_status = conflict (replaces expression-level prefix). */
const TRIAD_CONFLICT_COACHING = [
  "Ваш профиль сочетает разные тенденции. Сначала сосредоточимся на снижении общего напряжения.",
  "Практикуйте дыхание и заземление; персонализацию по триаде добавим, когда напряжение снизится.",
] as const;

const CORRESPONDENCE_COACHING: Record<string, string> = {
  Соответствие:
    "Роль соответствует личности. Поддерживайте текущий баланс между рабочими требованиями и естественным стилем.",
  "Гибкий по натуре – жёсткий в работе":
    "Риск выгорания от подавления природы. Обсудите с коучем или руководителем, где можно проявлять естественную гибкость без потери результата.",
  "Жёсткий по натуре – гибкий в работе":
    "Большие энергозатраты на перестройку. Структурируйте задачи и заранее планируйте «рамки», чтобы снизить постоянную адаптацию.",
  "Обе шкалы выше в личности":
    "Работа может быть слишком или недостаточно структурирована относительно вашего стиля. Уточните ожидания к лабильности и ригидности в роли.",
  "Обе шкалы выше в работе":
    "Риск перегрузки: рабочий профиль требует больше, чем свойственно личности. Планируйте восстановление и делегирование.",
};

export function normalizeTendencyScore(score: number): number {
  return score / SCALE_SCORE_MAX;
}

export function determine_expression_level(scaled_scores: ScaledScores): ExpressionLevel {
  const ranked = SCALE_KEYS.map((key) => ({
    key,
    score: scaled_scores[key],
  })).sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));

  const n2 = normalizeTendencyScore(ranked[1]?.score ?? 0);
  const n3 = normalizeTendencyScore(ranked[2]?.score ?? 0);
  const n1 = normalizeTendencyScore(ranked[0]?.score ?? 0);

  if (n2 - n3 < EXPRESSION_BLUR_TOP_GAP) {
    return "blurred";
  }
  if (n1 >= EXPRESSION_EXPRESSED_MIN && n2 >= EXPRESSION_EXPRESSED_MIN) {
    return "expressed";
  }
  if (n1 >= EXPRESSION_MODERATE_MIN && n2 >= EXPRESSION_MODERATE_MIN) {
    return "moderate";
  }
  return "weak";
}

function computeSecondaryPsychotype(
  ranked: { key: ScaleKey; score: number }[],
): PsychotypeCode | null {
  const top1 = ranked[0]?.key;
  const top2 = ranked[1]?.key;
  const top3 = ranked[2]?.key;
  if (!top1 || !top2 || !top3) {
    return null;
  }

  const scoreByKey = Object.fromEntries(
    ranked.map((item) => [item.key, item.score]),
  ) as Record<ScaleKey, number>;

  const fallbackPairs: [ScaleKey, ScaleKey][] = [
    [top1, top3],
    [top2, top3],
  ];

  const bestFallback = fallbackPairs
    .filter(([a, b]) => areScalesAdjacent(a, b))
    .map(([a, b]) => ({
      sum: scoreByKey[a] + scoreByKey[b],
      code: psychotypeForPair(a, b),
    }))
    .filter(
      (item): item is { sum: number; code: PsychotypeCode } => item.code !== null,
    )
    .sort((left, right) => right.sum - left.sum)[0];

  return bestFallback?.code ?? null;
}

/** Circle positions 1–8 (QA 2): AGG SPO EXT LAB ANX SEN INT RIG — same order as TENDENCY_CIRCLE. */
export const TRIAD_ANTAGONISTIC_POSITION_PAIRS: ReadonlyArray<
  readonly [number, number]
> = [
  [1, 5],
  [1, 6],
  [2, 8],
  [3, 7],
  [4, 8],
] as const;

const IMPOSSIBLE_TRIAD_POSITION_SETS: ReadonlyArray<readonly [number, number, number]> =
  [
    [1, 5, 6],
    [2, 4, 8],
  ] as const;

export function tendencyCirclePosition(key: ScaleKey): number {
  const index = TENDENCY_CIRCLE.indexOf(key);
  return index >= 0 ? index + 1 : -1;
}

function isImpossibleTriadPositions(positions: number[]): boolean {
  const sorted = [...positions].sort((left, right) => left - right);
  return IMPOSSIBLE_TRIAD_POSITION_SETS.some(
    (set) =>
      set[0] === sorted[0] && set[1] === sorted[1] && set[2] === sorted[2],
  );
}

function countAntagonisticPairsInTop3(
  top3Keys: ScaleKey[],
  scores: ScaledScores,
): { presenceCount: number; qualifyingConflictCount: number } {
  const positions = new Set(top3Keys.map(tendencyCirclePosition));
  let presenceCount = 0;
  let qualifyingConflictCount = 0;

  for (const [leftPosition, rightPosition] of TRIAD_ANTAGONISTIC_POSITION_PAIRS) {
    if (!positions.has(leftPosition) || !positions.has(rightPosition)) {
      continue;
    }
    presenceCount++;
    const leftKey = TENDENCY_CIRCLE[leftPosition - 1];
    const rightKey = TENDENCY_CIRCLE[rightPosition - 1];
    if (
      leftKey &&
      rightKey &&
      normalizeTendencyScore(scores[leftKey]) >= TRIAD_THIRD_NORMALIZED_MIN &&
      normalizeTendencyScore(scores[rightKey]) >= TRIAD_THIRD_NORMALIZED_MIN
    ) {
      qualifyingConflictCount++;
    }
  }

  return { presenceCount, qualifyingConflictCount };
}

/**
 * QA 2 A3: classify top-3 tendency set (any order).
 * `none` — stable triad not formed (3rd normalized &lt; 0.55); impossible/conflict override.
 */
export function classifyTriad(
  top3Keys: ScaleKey[],
  scores: ScaledScores,
): TriadStatus {
  if (top3Keys.length < 3) {
    return "none";
  }

  const positions = top3Keys.map(tendencyCirclePosition);
  if (isImpossibleTriadPositions(positions)) {
    return "impossible";
  }

  const thirdKey = top3Keys[2];
  const thirdNormalized =
    thirdKey !== undefined ? normalizeTendencyScore(scores[thirdKey]) : 0;
  const triadFormed = thirdNormalized >= TRIAD_THIRD_NORMALIZED_MIN;

  const { presenceCount, qualifyingConflictCount } = countAntagonisticPairsInTop3(
    top3Keys,
    scores,
  );

  if (presenceCount === 1 && qualifyingConflictCount === 1) {
    return "conflict";
  }

  if (!triadFormed) {
    return "none";
  }

  return "stable";
}

/** UI disclaimer when triad block is shown at triad_status = conflict (QA 2 A4.11). */
export const TRIAD_CONFLICT_DISCLAIMER = TRIAD_CONFLICT_COACHING[0];

/** Интерпретационные рекомендации для коучинга (NAVIGATOR §4.7 / опросник §7). */
export function buildCoachingRecommendations(
  systemic: Pick<SystemicScores, "tension_zone" | "correspondence_type">,
  expressionLevel?: ExpressionLevel | null,
  options?: {
    triadStatus?: TriadStatus;
    psychotypeCode?: PsychotypeCode;
  },
): string[] {
  if (options?.psychotypeCode === "complex") {
    return [];
  }

  if (options?.triadStatus === "conflict") {
    return [...TRIAD_CONFLICT_COACHING];
  }

  const items: string[] = [];

  if (expressionLevel && EXPRESSION_COACHING[expressionLevel]) {
    items.push(EXPRESSION_COACHING[expressionLevel]);
  }

  const type = systemic.correspondence_type?.trim();

  if (type && CORRESPONDENCE_COACHING[type]) {
    items.push(CORRESPONDENCE_COACHING[type]);
  } else if (type) {
    items.push(type);
  }

  if (systemic.tension_zone && !type) {
    items.push(
      "Выявлена зона напряжения между личным и рабочим профилем. Рекомендуется разбор расхождения LAB/RIG с коучем или наставником.",
    );
  }

  return items;
}

export function calculate_systemic_scores(
  answers: readonly (number | null)[],
): SystemicScores {
  const normalized = normalizeAnswers(answers);

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
        normalized[questionId - 1],
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

  const personality = calculate_scaled_scores(normalized);
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

/** Средняя выраженность по 4 парам: max(LAB-side, RIG-side) на блок — для относительных порогов. */
export function calculate_dominant_intensity(scaled_scores: ScaledScores): number {
  return (
    OPPOSITE_PAIRS.reduce(
      (sum, [left, right]) => sum + Math.max(scaled_scores[left], scaled_scores[right]),
      0,
    ) / OPPOSITE_PAIRS.length
  );
}

export function areScalesAdjacent(a: ScaleKey, b: ScaleKey): boolean {
  const indexA = TENDENCY_CIRCLE.indexOf(a);
  const indexB = TENDENCY_CIRCLE.indexOf(b);
  if (indexA < 0 || indexB < 0) {
    return false;
  }
  const diff = Math.abs(indexA - indexB);
  return diff === 1 || diff === TENDENCY_CIRCLE.length - 1;
}

export function psychotypeForPair(a: ScaleKey, b: ScaleKey): PsychotypeCode | null {
  const match = ADJACENT_PSYCHOTYPES.find(
    (pair) =>
      (pair.a === a && pair.b === b) || (pair.a === b && pair.b === a),
  );
  return match?.code ?? null;
}

/** Order an adjacent pair clockwise on the tendency circle: [left, right]. */
function orderPairClockwise(a: ScaleKey, b: ScaleKey): [ScaleKey, ScaleKey] {
  const indexA = TENDENCY_CIRCLE.indexOf(a);
  const indexB = TENDENCY_CIRCLE.indexOf(b);
  const n = TENDENCY_CIRCLE.length;
  if ((indexA + 1) % n === indexB) {
    return [a, b];
  }
  return [b, a];
}

function neighborCounterClockwise(key: ScaleKey): ScaleKey {
  const index = TENDENCY_CIRCLE.indexOf(key);
  const n = TENDENCY_CIRCLE.length;
  return TENDENCY_CIRCLE[(index - 1 + n) % n];
}

function neighborClockwise(key: ScaleKey): ScaleKey {
  const index = TENDENCY_CIRCLE.indexOf(key);
  return TENDENCY_CIRCLE[(index + 1) % TENDENCY_CIRCLE.length];
}

/**
 * NAVIGATOR §4.7.1: third tendency relative to the pure-type pair on the circle.
 * left = neighbor before the clockwise-first member; right = after the second.
 */
export function determine_triad_variant(
  pairA: ScaleKey,
  pairB: ScaleKey,
  third: ScaleKey,
): TriadVariant | null {
  if (!areScalesAdjacent(pairA, pairB)) {
    return null;
  }
  const [left, right] = orderPairClockwise(pairA, pairB);
  if (third === neighborCounterClockwise(left)) {
    return "left";
  }
  if (third === neighborClockwise(right)) {
    return "right";
  }
  return null;
}

function leftSidePoints(val: number): number {
  return val < 0 ? Math.abs(val) : 0;
}

/** Empath S/N — always computed (MVP metrics; V1 subtypes later). */
export function calculate_empath_sub_indices(
  answers: readonly (number | null)[],
): EmpathSubIndices {
  const normalized = normalizeAnswers(answers);
  let sub_index_s = 0;
  let sub_index_n = 0;
  for (const questionId of EMPATH_S_QUESTIONS) {
    sub_index_s += leftSidePoints(normalized[questionId - 1]);
  }
  for (const questionId of EMPATH_N_QUESTIONS) {
    sub_index_n += leftSidePoints(normalized[questionId - 1]);
  }
  return { sub_index_s, sub_index_n };
}

export const EMPATH_S_INDEX_MAX = 12;
export const EMPATH_N_INDEX_MAX = 18;
export const EMPATH_SUB_INDEX_HIGH_RATIO = 0.7;

export type EmpathSubtypeCode = "guardian" | "creator" | "systematic";

export const EMPATH_SUBTYPE_BLOCK_KEYS: Record<EmpathSubtypeCode, string> = {
  guardian: "empath_subtype_guardian",
  creator: "empath_subtype_creator",
  systematic: "empath_subtype_systematic",
};

export const EMPATH_SUBTYPE_LABELS: Record<EmpathSubtypeCode, string> = {
  guardian: "Чуткий Хранитель",
  creator: "Вдохновенный Творец",
  systematic: "Сдержанный Систематик",
};

function empathSubIndexHighThreshold(max: number): number {
  return Math.ceil(max * EMPATH_SUB_INDEX_HIGH_RATIO);
}

/** §2.6 sep_2nd: high/low S and N → one of three subtypes, else null. */
export function determine_empath_subtype(
  sub_index_s: number,
  sub_index_n: number,
): EmpathSubtypeCode | null {
  const sHigh = sub_index_s >= empathSubIndexHighThreshold(EMPATH_S_INDEX_MAX);
  const nHigh = sub_index_n >= empathSubIndexHighThreshold(EMPATH_N_INDEX_MAX);

  if (sHigh && nHigh) {
    return "guardian";
  }
  if (sHigh && !nHigh) {
    return "creator";
  }
  if (!sHigh && nHigh) {
    return "systematic";
  }
  return null;
}

export function empathSubtypeBlockKey(
  subtype: EmpathSubtypeCode | null,
): string | null {
  return subtype ? EMPATH_SUBTYPE_BLOCK_KEYS[subtype] : null;
}

function unresolvedPsychotypeCode(): PsychotypeCode {
  return isV1ProfilesEnabled()
    ? COMPLEX_PSYCHOTYPE_LABEL
    : MIXED_PSYCHOTYPE_LABEL;
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
    if (a > THRESHOLD_OPPOSITE_BOTH_HIGH && b > THRESHOLD_OPPOSITE_BOTH_HIGH) {
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
  const dominantMean = calculate_dominant_intensity(scores);
  const values = SCALE_KEYS.map((key) => scores[key]);

  if (avgIntensity <= THRESHOLD_AVG_WEAK) {
    warnings.push(
      "Ведущие тенденции слабо выражены. Есть вероятность ошибки в прогнозе",
    );
  } else if (avgIntensity <= THRESHOLD_AVG_MEDIUM) {
    warnings.push("Вероятность достоверного прогноза — выше средней");
  } else {
    warnings.push("Вероятность достоверного прогноза — высокая");
  }

  if (values.some((value) => value > THRESHOLD_SCALE_HIGH)) {
    warnings.push("Возможно, человек находится в состоянии сильного стресса");
  }
  if (scores.sensitivity > THRESHOLD_SCALE_HIGH || scores.anxiety > THRESHOLD_SCALE_HIGH) {
    warnings.push("Вероятно депрессивное состояние");
  }
  if (scores.extraversion > THRESHOLD_SCALE_HIGH || scores.lability > THRESHOLD_SCALE_HIGH) {
    warnings.push("Вероятны эмоциональные проявления");
  }
  if (scores.introversion > THRESHOLD_SCALE_HIGH && scores.rigidity > THRESHOLD_SCALE_HIGH) {
    warnings.push("Высокий риск выгорания");
  }
  if (scores.aggression > THRESHOLD_SCALE_HIGH && scores.spontaneity > THRESHOLD_SCALE_HIGH) {
    warnings.push("Высокий риск конфликтов");
  }

  const highAboveDominant = SCALE_KEYS.filter(
    (key) => scores[key] > dominantMean * THRESHOLD_ABOVE_MEAN_RATIO,
  );
  if (highAboveDominant.length >= 1) {
    warnings.push("Высокая вероятность нервного срыва");
  }
  if (hasNonAdjacentHighPair(scores, dominantMean)) {
    warnings.push("Высокая вероятность сильного выгорания");
  }

  const top4 = [...values].sort((a, b) => b - a).slice(0, 4);
  if (
    top4.length === 4 &&
    dominantMean > 0 &&
    top4.every((value) => Math.abs(value - dominantMean) / dominantMean < 0.1)
  ) {
    warnings.push("Высокая вероятность ошибки прогноза");
  }

  if (values.every((value) => value <= THRESHOLD_FLAT_SCALE)) {
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

const EMPTY_CASCADE_FIELDS = {
  primary_type: null,
  secondary_type: null,
  profile_complexity: null,
  cascade_level_used: null,
  cluster_tendencies: [] as ScaleKey[],
};

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
  const warnings = buildThresholdWarnings(scaled_scores, avg_intensity, systemic);
  const v1 = isV1ProfilesEnabled();

  if (!top1 || !top2 || !top3) {
    return {
      psychotype_code: unresolvedPsychotypeCode(),
      secondary: null,
      is_dyad: false,
      triad_variant: null,
      triad_status: "none",
      avg_intensity,
      expression_level:
        unresolvedPsychotypeCode() === COMPLEX_PSYCHOTYPE_LABEL
          ? null
          : determine_expression_level(scaled_scores),
      warnings,
      ...EMPTY_CASCADE_FIELDS,
    };
  }

  const triad_status = classifyTriad([top1, top2, top3], scaled_scores);

  if (v1) {
    const cascade = resolveProfileCascade(ranked, scaled_scores, {
      allowTriadVariant: true,
      triadStatusImpossible: triad_status === "impossible",
    });
    const psychotype_code = cascadeResultIsComplex(cascade)
      ? COMPLEX_PSYCHOTYPE_LABEL
      : cascade.psychotype_code;
    const expression_level =
      psychotype_code === COMPLEX_PSYCHOTYPE_LABEL
        ? null
        : determine_expression_level(scaled_scores);

    return {
      psychotype_code,
      secondary: cascade.secondary,
      is_dyad: false,
      triad_variant: cascade.triad_variant,
      triad_status,
      avg_intensity,
      expression_level,
      warnings,
      primary_type: cascadeResultIsComplex(cascade) ? null : cascade.primary_type,
      secondary_type: cascadeResultIsComplex(cascade) ? null : cascade.secondary_type,
      profile_complexity: cascadeResultIsComplex(cascade)
        ? null
        : cascade.profile_complexity,
      cascade_level_used: cascadeResultIsComplex(cascade) ? null : cascade.cascade_level_used,
      cluster_tendencies: cascade.cluster_tendencies,
    };
  }

  let psychotype_code: PsychotypeCode = unresolvedPsychotypeCode();
  let secondary: PsychotypeCode | null = null;
  let pair: [ScaleKey, ScaleKey] | null = null;

  if (areScalesAdjacent(top1, top2)) {
    const code = psychotypeForPair(top1, top2);
    if (code) {
      psychotype_code = code;
      pair = [top1, top2];
    }
  } else {
    psychotype_code = unresolvedPsychotypeCode();
    secondary = computeSecondaryPsychotype(ranked);
  }

  let triad_variant: TriadVariant | null = null;

  const expression_level =
    psychotype_code === COMPLEX_PSYCHOTYPE_LABEL
      ? null
      : determine_expression_level(scaled_scores);

  return {
    psychotype_code,
    secondary,
    is_dyad: false,
    triad_variant,
    triad_status,
    avg_intensity,
    expression_level,
    warnings,
    ...EMPTY_CASCADE_FIELDS,
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

/** TZ §8: 8 personality + 10 subscales + LAB_work + RIG_work (20 indicators). */
export type RawScores = {
  EXT: number;
  INT: number;
  ANX: number;
  AGG: number;
  SEN: number;
  SPO: number;
  LAB_pers: number;
  RIG_pers: number;
  sub4_1_LAB: number;
  sub4_1_RIG: number;
  sub4_2_LAB: number;
  sub4_2_RIG: number;
  sub4_3_LAB: number;
  sub4_3_RIG: number;
  sub4_4_LAB: number;
  sub4_4_RIG: number;
  sub4_5_LAB: number;
  sub4_5_RIG: number;
  LAB_work: number;
  RIG_work: number;
};

export type WorkProfile = {
  energy_efficiency: "LAB" | "RIG";
  focus: "LAB" | "RIG";
  quality_control: "LAB" | "RIG";
  rules: "LAB" | "RIG";
  responsibility: "LAB" | "RIG";
};

export type CongruenceAnalysis = {
  delta_LAB: number;
  delta_RIG: number;
  tension_zone: boolean;
  misalignment_type: string | null;
  recommendations: string[];
};

export type TzSortedPersonalScale = {
  scale: string;
  score: number;
};

const TZ_PERSONAL_SCALE_CODES: Record<ScaleKey, string> = {
  extraversion: "EXT",
  introversion: "INT",
  anxiety: "ANX",
  aggression: "AGG",
  sensitivity: "SEN",
  spontaneity: "SPO",
  lability: "LAB_pers",
  rigidity: "RIG_pers",
};

/** TZ §7 / §8: bullet recommendations per misalignment type. */
const CORRESPONDENCE_TZ_RECOMMENDATIONS: Record<string, string[]> = {
  Соответствие: [
    "Поддерживайте текущий баланс между рабочими требованиями и естественным стилем.",
  ],
  "Гибкий по натуре – жёсткий в работе": [
    "Снизить количество регламентов и согласований.",
    "Делегировать часть контрольных функций.",
  ],
  "Жёсткий по натуре – гибкий в работе": [
    "Структурируйте задачи и заранее планируйте рамки, чтобы снизить постоянную адаптацию.",
    "Согласуйте с руководителем ожидания к гибкости в роли.",
  ],
  "Обе шкалы выше в личности": [
    "Уточните ожидания к лабильности и ригидности в роли.",
    "Проверьте, не слишком ли жёстко или слишком свободно устроена рабочая среда.",
  ],
  "Обе шкалы выше в работе": [
    "Планируйте восстановление и делегирование.",
    "Снизьте перегрузку от требований среды, которые выше вашего личного профиля.",
  ],
};

function dominantWorkPole(lab: number, rig: number): "LAB" | "RIG" {
  return lab >= rig ? "LAB" : "RIG";
}

export function buildRawScores(
  scaled_scores: ScaledScores,
  systemic: SystemicScores,
): RawScores {
  return {
    EXT: scaled_scores.extraversion,
    INT: scaled_scores.introversion,
    ANX: scaled_scores.anxiety,
    AGG: scaled_scores.aggression,
    SEN: scaled_scores.sensitivity,
    SPO: scaled_scores.spontaneity,
    LAB_pers: scaled_scores.lability,
    RIG_pers: scaled_scores.rigidity,
    sub4_1_LAB: systemic.sub4_1_LAB,
    sub4_1_RIG: systemic.sub4_1_RIG,
    sub4_2_LAB: systemic.sub4_2_LAB,
    sub4_2_RIG: systemic.sub4_2_RIG,
    sub4_3_LAB: systemic.sub4_3_LAB,
    sub4_3_RIG: systemic.sub4_3_RIG,
    sub4_4_LAB: systemic.sub4_4_LAB,
    sub4_4_RIG: systemic.sub4_4_RIG,
    sub4_5_LAB: systemic.sub4_5_LAB,
    sub4_5_RIG: systemic.sub4_5_RIG,
    LAB_work: systemic.LAB_work,
    RIG_work: systemic.RIG_work,
  };
}

export function buildWorkProfile(systemic: SystemicScores): WorkProfile {
  return {
    energy_efficiency: dominantWorkPole(
      systemic.sub4_1_LAB,
      systemic.sub4_1_RIG,
    ),
    focus: dominantWorkPole(systemic.sub4_2_LAB, systemic.sub4_2_RIG),
    quality_control: dominantWorkPole(
      systemic.sub4_3_LAB,
      systemic.sub4_3_RIG,
    ),
    rules: dominantWorkPole(systemic.sub4_4_LAB, systemic.sub4_4_RIG),
    responsibility: dominantWorkPole(
      systemic.sub4_5_LAB,
      systemic.sub4_5_RIG,
    ),
  };
}

export function buildCongruenceRecommendations(
  correspondence_type: string | null,
): string[] {
  if (!correspondence_type) {
    return [];
  }
  return CORRESPONDENCE_TZ_RECOMMENDATIONS[correspondence_type] ?? [];
}

export function buildCongruenceAnalysis(
  systemic: SystemicScores,
): CongruenceAnalysis {
  return {
    delta_LAB: systemic.delta_LAB,
    delta_RIG: systemic.delta_RIG,
    tension_zone: systemic.tension_zone,
    misalignment_type: systemic.correspondence_type,
    recommendations: buildCongruenceRecommendations(systemic.correspondence_type),
  };
}

export function buildTzSortedPersonalScales(
  scores: ScaledScores,
): TzSortedPersonalScale[] {
  return SCALE_KEYS.map((key) => ({
    scale: TZ_PERSONAL_SCALE_CODES[key],
    score: scores[key],
  })).sort(
    (left, right) =>
      right.score - left.score || left.scale.localeCompare(right.scale),
  );
}

export type SortedPersonalScale = {
  key: ScaleKey;
  value: number;
};

/** ТЗ JSON: 8 личностных тенденций по убыванию. */
export function buildSortedPersonalScales(scores: ScaledScores): SortedPersonalScale[] {
  return SCALE_KEYS.map((key) => ({ key, value: scores[key] })).sort(
    (left, right) => right.value - left.value,
  );
}

export type LeaderTypeCode =
  | "influencer_leader"
  | "pragmatist_leader"
  | "routine_leader"
  | "individualist_leader";

export type LeaderScore = {
  code: LeaderTypeCode;
  label: string;
  score: number;
  is_leader: boolean;
};

/** 70% от теоретического максимума 30 (NAVIGATOR §4.8 / ТЗ §3.5). */
export const LEADER_SCORE_THRESHOLD = 21;

/** NAVIGATOR §7.5 — пороги на шкале 0–30 (раздельный подсчёт). */
export const THRESHOLD_AVG_WEAK = 7;
export const THRESHOLD_AVG_MEDIUM = 12;
export const THRESHOLD_SCALE_HIGH = 22;
export const THRESHOLD_OPPOSITE_BOTH_HIGH = 12;
export const THRESHOLD_FLAT_SCALE = 6;
export const THRESHOLD_ABOVE_MEAN_RATIO = 1.3;

/** E в «комfortной» зоне 12–20 → 30; иначе линейный спад к краям 0–30. */
export function normalizeExtraversionBand(extraversion: number): number {
  if (extraversion >= 12 && extraversion <= 20) {
    return 30;
  }
  if (extraversion < 12) {
    return (extraversion / 12) * 30;
  }
  return ((30 - extraversion) / (30 - 20)) * 30;
}

/** Четыре типа лидерства по взвешенным тенденциям (0–30). */
export function computeLeaderScores(scores: ScaledScores): LeaderScore[] {
  const influencer =
    0.4 * scores.extraversion +
    0.3 * scores.lability +
    0.2 * (30 - scores.introversion) +
    0.1 * (30 - scores.anxiety);

  const pragmatist =
    0.4 * scores.aggression +
    0.3 * scores.rigidity +
    0.2 * (30 - scores.spontaneity) +
    0.1 * (30 - scores.anxiety);

  const routine =
    0.3 * normalizeExtraversionBand(scores.extraversion) +
    0.3 * scores.sensitivity +
    0.2 * scores.rigidity +
    0.2 * (30 - scores.anxiety);

  const individualist =
    0.3 * scores.aggression +
    0.4 * scores.spontaneity +
    0.2 * (30 - scores.rigidity) +
    0.1 * (30 - scores.anxiety);

  const entries: Omit<LeaderScore, "is_leader">[] = [
    { code: "influencer_leader", label: "Лидер мнений", score: influencer },
    {
      code: "pragmatist_leader",
      label: "Прагматик (кризисный)",
      score: pragmatist,
    },
    { code: "routine_leader", label: "Рутинный лидер", score: routine },
    {
      code: "individualist_leader",
      label: "Индивидуалист (спасатель)",
      score: individualist,
    },
  ];

  return entries.map((entry) => {
    const score = Math.round(entry.score * 10) / 10;
    return {
      ...entry,
      score,
      is_leader: score > LEADER_SCORE_THRESHOLD,
    };
  });
}

/** Удобная обёртка для API submit. */
export function calculate_result(
  answers: readonly (number | null)[],
  time_per_question: readonly number[],
) {
  const normalized_answers = normalizeAnswers(answers);
  const scaled_scores = calculate_scaled_scores(normalized_answers);
  const scaled_systemic = calculate_systemic_scores(normalized_answers);
  const psychotype = determine_psychotype(scaled_scores, scaled_systemic);
  const empath_sub_indices = calculate_empath_sub_indices(normalized_answers);
  const validation_warnings = validate_answers(answers, time_per_question);
  const congruence_analysis = buildCongruenceAnalysis(scaled_systemic);
  const raw_scores = buildRawScores(scaled_scores, scaled_systemic);

  if (psychotype.psychotype_code === MIXED_PSYCHOTYPE_LABEL) {
    validation_warnings.push("irregular_psycho_type");
  }

  return {
    scaled_scores,
    scaled_systemic,
    raw_scores,
    work_profile: buildWorkProfile(scaled_systemic),
    congruence_analysis,
    psychotype_code: psychotype.psychotype_code,
    psychotype_secondary: psychotype.secondary,
    triad_variant: psychotype.triad_variant,
    sub_index_s: empath_sub_indices.sub_index_s,
    sub_index_n: empath_sub_indices.sub_index_n,
    avg_intensity: psychotype.avg_intensity,
    warnings: psychotype.warnings,
    validation_warnings: [...new Set(validation_warnings)],
    sorted_personal_scales: buildSortedPersonalScales(scaled_scores),
    tz_sorted_personal_scales: buildTzSortedPersonalScales(scaled_scores),
    leader_scores: computeLeaderScores(scaled_scores),
    expression_level: psychotype.expression_level,
    triad_status: psychotype.triad_status,
    coaching_recommendations: buildCoachingRecommendations(
      scaled_systemic,
      psychotype.expression_level,
      {
        triadStatus: psychotype.triad_status,
        psychotypeCode: psychotype.psychotype_code,
      },
    ),
  };
}

export function fillAnswers(value: number): number[] {
  return Array.from({ length: QUESTION_COUNT }, () => value);
}

export function fillTimings(seconds: number): number[] {
  return Array.from({ length: QUESTION_COUNT }, () => seconds);
}
