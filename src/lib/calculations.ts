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
    return "Обе шкалы выше в личности";
  }
  if (deltaLab < -TENSION_THRESHOLD && deltaRig < -TENSION_THRESHOLD) {
    return "Обе шкалы выше в работе";
  }
  return null;
}

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

/** Интерпретационные рекомендации для коучинга (NAVIGATOR §4.7 / опросник §7). */
export function buildCoachingRecommendations(
  systemic: Pick<SystemicScores, "tension_zone" | "correspondence_type">,
): string[] {
  const items: string[] = [];
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

/** Средняя выраженность по 4 парам: max(LAB-side, RIG-side) на блок — для относительных порогов. */
export function calculate_dominant_intensity(scaled_scores: ScaledScores): number {
  return (
    OPPOSITE_PAIRS.reduce(
      (sum, [left, right]) => sum + Math.max(scaled_scores[left], scaled_scores[right]),
      0,
    ) / OPPOSITE_PAIRS.length
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

  let psychotype_code: PsychotypeCode = MIXED_PSYCHOTYPE_LABEL;

  // NAVIGATOR §4.6 / опросник §5.3: сначала top1+top2, иначе fallback top1+top3 / top2+top3.
  if (areScalesAdjacent(top1, top2)) {
    psychotype_code = psychotypeForPair(top1, top2) ?? MIXED_PSYCHOTYPE_LABEL;
  } else {
    const fallbackPairs: [ScaleKey, ScaleKey][] = [
      [top1, top3],
      [top2, top3],
    ];
    const bestFallback = fallbackPairs
      .filter(([a, b]) => areScalesAdjacent(a, b))
      .map(([a, b]) => ({
        sum: scaled_scores[a] + scaled_scores[b],
        code: psychotypeForPair(a, b),
      }))
      .filter((item): item is { sum: number; code: PsychotypeCode } => item.code !== null)
      .sort((left, right) => right.sum - left.sum)[0];

    if (bestFallback) {
      psychotype_code = bestFallback.code;
    }
  }

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
export function calculate_result(answers: readonly number[], time_per_question: readonly number[]) {
  const scaled_scores = calculate_scaled_scores(answers);
  const scaled_systemic = calculate_systemic_scores(answers);
  const psychotype = determine_psychotype(scaled_scores, scaled_systemic);
  const validation_warnings = validate_answers(answers, time_per_question);

  if (psychotype.psychotype_code === MIXED_PSYCHOTYPE_LABEL) {
    validation_warnings.push("irregular_psycho_type");
  }

  return {
    scaled_scores,
    scaled_systemic,
    psychotype_code: psychotype.psychotype_code,
    psychotype_secondary: psychotype.secondary,
    avg_intensity: psychotype.avg_intensity,
    warnings: psychotype.warnings,
    validation_warnings: [...new Set(validation_warnings)],
    sorted_personal_scales: buildSortedPersonalScales(scaled_scores),
    leader_scores: computeLeaderScores(scaled_scores),
    coaching_recommendations: buildCoachingRecommendations(scaled_systemic),
  };
}

export function fillAnswers(value: number): number[] {
  return Array.from({ length: QUESTION_COUNT }, () => value);
}

export function fillTimings(seconds: number): number[] {
  return Array.from({ length: QUESTION_COUNT }, () => seconds);
}
