/**
 * Compensatory checks for 8 pure psychotypes (sep_5th docx + Отвечаю по пунктам.docx).
 * MVP: simplified table formulas; full comp-vs-aggrav model — V1.1 (eng-4, `TIOS_COMPENSATORY_FULL=1`).
 */

import {
  SCALE_KEYS,
  type PsychotypeCode,
  type ScaleKey,
  type ScaledScores,
} from "@/lib/calculations";
import {
  calculateSubfactorScores,
  isBlock42ProcessModerate,
  isBlock42ResultModerate,
  isSubfactorModerate,
  scoreAnxietyTriplet,
  scoreIntroversionTriplet,
  type SubfactorCode,
  type SubfactorScores,
} from "@/lib/subfactors";

export type CompensatoryOutcome = "resource" | "risk";

export type PurePsychotypeCode =
  | "individualist"
  | "innovator"
  | "influencer"
  | "aesthete"
  | "conservative"
  | "empath"
  | "analyst"
  | "pragmatist";

export const PURE_PSYCHOTYPE_CODES: readonly PurePsychotypeCode[] = [
  "individualist",
  "innovator",
  "influencer",
  "aesthete",
  "conservative",
  "empath",
  "analyst",
  "pragmatist",
];

const PSYCHOTYPE_SCALE_PAIRS: Record<PurePsychotypeCode, readonly [ScaleKey, ScaleKey]> = {
  individualist: ["aggression", "spontaneity"],
  innovator: ["spontaneity", "extraversion"],
  influencer: ["extraversion", "lability"],
  aesthete: ["lability", "anxiety"],
  conservative: ["anxiety", "sensitivity"],
  empath: ["sensitivity", "introversion"],
  analyst: ["introversion", "rigidity"],
  pragmatist: ["rigidity", "aggression"],
};

/** Methodologist Q1: tie-break peak within the type's diad. */
const PEAK_TIE_BREAK: Record<PurePsychotypeCode, ScaleKey> = {
  individualist: "aggression",
  innovator: "spontaneity",
  influencer: "lability",
  aesthete: "anxiety",
  conservative: "anxiety",
  empath: "sensitivity",
  analyst: "rigidity",
  pragmatist: "aggression",
};

/** Methodologist Q7: 2nd − 3rd scale score must be ≥ this for a «чистый» profile. */
export const COMPENSATORY_PURE_GAP_MIN = 6;

type CompensatoryProfile = {
  evaluateResource: (scores: SubfactorScores) => boolean;
  clauseCount: number;
  adaptive_text: string;
  risk_text: string;
  coaching_if_risk: string[];
};

const PROFILES: Record<PurePsychotypeCode, CompensatoryProfile> = {
  individualist: {
    clauseCount: 2,
    evaluateResource: (s) =>
      isSubfactorModerate(s["3.3"]) && isSubfactorModerate(s["5.5"]),
    adaptive_text:
      "Ваша напористость и способность преодолевать препятствия сочетаются с умением анализировать последствия и действовать стратегически. Это делает вас эффективным кризис-менеджером и переговорщиком, который достигает целей, не разрушая отношения.",
    risk_text:
      "Ваша энергия и напористость могут приводить к импульсивным конфликтам и разрушению отношений, особенно если вы действуете без анализа последствий. Рекомендуется развивать паузу между импульсом и действием, а также учиться учитывать долгосрочные последствия своих решений.",
    coaching_if_risk: [
      "Развивать рефлексивность",
      "Учиться делегировать",
      "Работать над эмпатией",
    ],
  },
  innovator: {
    clauseCount: 2,
    evaluateResource: (s) =>
      s["3.2"] + s["3.4"] > 4 && isSubfactorModerate(s["5.5"]),
    adaptive_text:
      "Ваша способность генерировать идеи и увлекать людей сочетается с умением структурировать процесс и доводить проекты до конца. Это делает вас эффективным стартапером и инноватором, который не только придумывает, но и реализует.",
    risk_text:
      "Ваш энтузиазм и креативность могут приводить к тому, что вы начинаете много проектов, но редко доводите их до конца. Это может вызывать разочарование команды и потерю доверия. Рекомендуется учиться фокусироваться на 1–2 приоритетных проектах и делегировать рутину тем, кто умеет доводить дела до конца.",
    coaching_if_risk: [
      "Развивать нормативность",
      "Работать над систематичностью",
      "Использовать фокус на результат",
    ],
  },
  influencer: {
    clauseCount: 2,
    evaluateResource: (s) =>
      isSubfactorModerate(s["5.5"]) && isSubfactorModerate(s["3.4"]),
    adaptive_text:
      "Ваша харизма и способность влиять на людей сочетаются с внутренней устойчивостью и принципами. Вы умеете адаптировать сообщение под аудиторию, но не теряете своей сути. Это делает вас эффективным лидером мнений, который вдохновляет, не теряя себя.",
    risk_text:
      "Ваша зависимость от внешней оценки и признания может приводить к тому, что вы меняете позицию под давлением группы или избегаете непопулярных, но необходимых решений. Это может вызывать потерю доверия и внутренний конфликт. Рекомендуется развивать внутреннюю опору и учиться отделять свою ценность от мнения других.",
    coaching_if_risk: [
      "Развивать ригидность",
      "Работать над нормативностью",
      "Укреплять самооценку",
    ],
  },
  aesthete: {
    clauseCount: 2,
    evaluateResource: (s) =>
      isSubfactorModerate(s["5.5"]) && isSubfactorModerate(s["2.3"]),
    adaptive_text:
      "Ваша чувствительность к людям и атмосфере сочетается с внутренней устойчивостью и способностью отстаивать границы. Вы умеете создавать комфортную среду, не теряя себя и не становясь жертвой манипуляций. Это делает вас эффективным HR-специалистом или менеджером по клиентскому опыту.",
    risk_text:
      "Ваша высокая чувствительность к оценке и конфликтам может приводить к эмоциональному выгоранию, зависимости от мнения других и неспособности принимать жесткие решения. Вы можете стать жертвой манипуляторов или брать на себя слишком много чужих проблем. Рекомендуется учиться говорить «нет», устанавливать границы и делегировать конфликтные задачи.",
    coaching_if_risk: [
      "Развивать ригидность",
      "Работать над агрессивностью",
      "Учиться самоконтролю",
    ],
  },
  conservative: {
    clauseCount: 2,
    evaluateResource: (s) =>
      isSubfactorModerate(s["2.3"]) && isSubfactorModerate(s["5.3"]),
    adaptive_text:
      "Ваша внимательность к деталям и стремление к порядку сочетаются с способностью действовать даже в условиях неопределенности. Вы создаете надежные системы, но умеете адаптироваться к изменениям. Это делает вас эффективным контролером качества или администратором, который обеспечивает стабильность без сопротивления новому.",
    risk_text:
      "Ваш страх ошибки и потребность в идеальном порядке могут приводить к прокрастинации, сопротивлению изменениям и перфекционизму, который срывает сроки. Вы можете тратить слишком много времени на анализ и перепроверку, упуская возможности. Рекомендуется учиться принимать «достаточно хорошо» вместо «идеально», ставить жесткие рамки на анализ и делегировать задачи, требующие риска.",
    coaching_if_risk: [
      "Развивать агрессивность",
      "Работать над гибкостью",
      "Учиться принимать неопределенность",
    ],
  },
  empath: {
    clauseCount: 2,
    evaluateResource: (s) =>
      isSubfactorModerate(s["2.3"]) && isSubfactorModerate(s["1.2"]),
    adaptive_text:
      "Ваша глубина чувствования и эмпатия сочетаются с способностью защищать свои границы и действовать даже в сложных эмоциональных ситуациях. Вы умеете понимать людей, не теряя себя и не становясь «губкой» для чужих проблем. Это делает вас эффективным психологом, консультантом или творцом, который черпает вдохновение из глубины, но не истощается.",
    risk_text:
      "Ваша высокая чувствительность и склонность к переживаниям могут приводить к эмоциональному истощению, уходу в себя и неспособности принимать решения. Вы можете брать на себя слишком много чужих эмоций и проблем, что ведет к выгоранию. Рекомендуется учиться устанавливать границы, делегировать конфликтные задачи и развивать способность действовать вопреки страху.",
    coaching_if_risk: [
      "Развивать агрессивность",
      "Работать над гибкостью",
      "Учиться экстраверсии",
    ],
  },
  analyst: {
    clauseCount: 2,
    evaluateResource: (s) =>
      isSubfactorModerate(s["5.2"]) && isSubfactorModerate(s["5.3"]),
    adaptive_text:
      "Ваша способность к глубокому анализу и системному мышлению сочетается с гибкостью и способностью адаптироваться к изменениям. Вы создаете надежные системы, но умеете пересматривать их при необходимости. Это делает вас эффективным архитектором решений или исследователем, который обеспечивает фундаментальную прочность без сопротивления новому.",
    risk_text:
      "Ваша приверженность проверенным схемам и принципам может приводить к сопротивлению изменениям, перфекционизму и изоляции от команды. Вы можете тратить слишком много времени на анализ и упускать возможности из-за страха ошибки. Рекомендуется учиться принимать «достаточно хорошо», ставить жесткие рамки на анализ и делегировать коммуникацию.",
    coaching_if_risk: [
      "Развивать лабильность",
      "Работать над гибкостью",
      "Учиться делегировать коммуникацию",
    ],
  },
  pragmatist: {
    clauseCount: 2,
    evaluateResource: (s) =>
      isSubfactorModerate(s["5.1"]) && isSubfactorModerate(s["3.3"]),
    adaptive_text:
      "Ваша воля и способность наводить порядок сочетаются с гибкостью и умением учитывать человеческий фактор. Вы достигаете целей, не разрушая отношения и не теряя способности адаптироваться. Это делает вас эффективным кризис-менеджером или стратегом, который обеспечивает результат без тирании.",
    risk_text:
      "Ваша жесткость и стремление к контролю могут приводить к тирании, потере лояльности команды и разрушению отношений. Вы можете не замечать человеческого фактора и упускать альтернативы из-за догматизма. Рекомендуется учиться слушать других, делегировать контроль и развивать эмпатию.",
    coaching_if_risk: [
      "Развивать лабильность",
      "Работать над сензитивностью",
      "Учиться гибкости",
    ],
  },
};

type FactorRule =
  | { kind: "subfactor_high"; code: SubfactorCode; weight?: number }
  | { kind: "subfactor_low"; code: SubfactorCode; weight?: number }
  | { kind: "normativity_high"; weight?: number }
  | { kind: "normativity_low"; weight?: number }
  | { kind: "block42_result_high"; weight?: number }
  | { kind: "block42_process_high"; weight?: number }
  | { kind: "anxiety_high"; weight?: number }
  | { kind: "introversion_high"; weight?: number };

type FullFactorSet = {
  compensators: FactorRule[];
  aggravators: FactorRule[];
};

/** Full model (docx tables): weighted count of active compensators vs aggravators. */
const FULL_FACTOR_SETS: Record<PurePsychotypeCode, FullFactorSet> = {
  individualist: {
    compensators: [
      { kind: "subfactor_high", code: "3.3" },
      { kind: "subfactor_high", code: "5.5" },
      { kind: "block42_result_high" },
      { kind: "normativity_high" },
    ],
    aggravators: [
      { kind: "subfactor_low", code: "3.3" },
      { kind: "subfactor_high", code: "5.3" },
      { kind: "block42_process_high" },
      { kind: "normativity_low" },
    ],
  },
  innovator: {
    compensators: [
      { kind: "normativity_high" },
      { kind: "subfactor_high", code: "5.5" },
      { kind: "block42_result_high" },
      { kind: "subfactor_high", code: "3.4" },
    ],
    aggravators: [
      { kind: "normativity_low" },
      { kind: "subfactor_high", code: "5.1" },
      { kind: "block42_process_high" },
      { kind: "subfactor_low", code: "3.4" },
    ],
  },
  influencer: {
    compensators: [
      { kind: "subfactor_high", code: "5.5" },
      { kind: "subfactor_high", code: "3.4" },
      { kind: "subfactor_high", code: "3.3" },
      { kind: "block42_result_high" },
    ],
    aggravators: [
      { kind: "subfactor_high", code: "5.1" },
      { kind: "subfactor_low", code: "3.4" },
      { kind: "subfactor_low", code: "3.3" },
      { kind: "block42_process_high" },
    ],
  },
  aesthete: {
    compensators: [
      { kind: "subfactor_high", code: "5.5" },
      { kind: "subfactor_high", code: "3.4" },
      { kind: "subfactor_high", code: "2.3" },
      { kind: "block42_result_high" },
    ],
    aggravators: [
      { kind: "subfactor_high", code: "5.1" },
      { kind: "subfactor_low", code: "3.4" },
      { kind: "subfactor_low", code: "2.3" },
      { kind: "block42_process_high" },
    ],
  },
  conservative: {
    compensators: [
      { kind: "subfactor_high", code: "2.3" },
      { kind: "subfactor_high", code: "5.3" },
      { kind: "subfactor_high", code: "5.1" },
      { kind: "block42_result_high" },
    ],
    aggravators: [
      { kind: "subfactor_low", code: "2.3" },
      { kind: "subfactor_high", code: "5.5" },
      { kind: "block42_process_high" },
    ],
  },
  empath: {
    compensators: [
      { kind: "subfactor_high", code: "2.3" },
      { kind: "subfactor_high", code: "5.3" },
      { kind: "subfactor_high", code: "1.2" },
      { kind: "block42_result_high" },
    ],
    aggravators: [
      { kind: "subfactor_low", code: "2.3" },
      { kind: "anxiety_high" },
      { kind: "introversion_high" },
      { kind: "block42_process_high" },
    ],
  },
  analyst: {
    compensators: [
      { kind: "subfactor_high", code: "5.1" },
      { kind: "subfactor_high", code: "5.3" },
      { kind: "subfactor_high", code: "2.3" },
      { kind: "block42_result_high" },
    ],
    aggravators: [
      { kind: "subfactor_low", code: "5.1" },
      { kind: "anxiety_high" },
      { kind: "subfactor_low", code: "2.3" },
      { kind: "block42_process_high" },
    ],
  },
  pragmatist: {
    compensators: [
      { kind: "subfactor_high", code: "5.1" },
      { kind: "subfactor_high", code: "3.3" },
      { kind: "subfactor_high", code: "5.3" },
      { kind: "block42_process_high" },
    ],
    aggravators: [
      { kind: "subfactor_low", code: "5.1" },
      { kind: "subfactor_low", code: "3.3" },
      { kind: "subfactor_high", code: "5.5" },
      { kind: "block42_result_high" },
    ],
  },
};

type FactorContext = {
  subfactors: SubfactorScores;
  answers: readonly (number | null)[];
};

function isNormativityCombinedModerate(subfactors: SubfactorScores): boolean {
  return subfactors["3.2"] + subfactors["3.4"] > 4;
}

function evaluateFactorRule(rule: FactorRule, ctx: FactorContext): boolean {
  const { subfactors, answers } = ctx;
  switch (rule.kind) {
    case "subfactor_high":
      return isSubfactorModerate(subfactors[rule.code]);
    case "subfactor_low":
      return !isSubfactorModerate(subfactors[rule.code]);
    case "normativity_high":
      return isNormativityCombinedModerate(subfactors);
    case "normativity_low":
      return !isNormativityCombinedModerate(subfactors);
    case "block42_result_high":
      return isBlock42ResultModerate(answers);
    case "block42_process_high":
      return isBlock42ProcessModerate(answers);
    case "anxiety_high":
      return isSubfactorModerate(scoreAnxietyTriplet(answers));
    case "introversion_high":
      return isSubfactorModerate(scoreIntroversionTriplet(answers));
    default:
      return false;
  }
}

function evaluateFullBalance(
  psychotype: PurePsychotypeCode,
  subfactors: SubfactorScores,
  answers: readonly (number | null)[],
): { compWeight: number; aggWeight: number; balanceIndex: number } {
  const ctx: FactorContext = { subfactors, answers };
  const set = FULL_FACTOR_SETS[psychotype];
  let compWeight = 0;
  let aggWeight = 0;

  for (const rule of set.compensators) {
    if (evaluateFactorRule(rule, ctx)) {
      compWeight += rule.weight ?? 1;
    }
  }
  for (const rule of set.aggravators) {
    if (evaluateFactorRule(rule, ctx)) {
      aggWeight += rule.weight ?? 1;
    }
  }

  const total = compWeight + aggWeight;
  const balanceIndex = total > 0 ? Math.round((compWeight / total) * 100) : 0;
  return { compWeight, aggWeight, balanceIndex };
}

export type CompensatoryCheckResult = {
  psychotype_code: PurePsychotypeCode;
  outcome: CompensatoryOutcome;
  peak_scale: ScaleKey;
  /** Share of formula clauses passed (0–100). Full comp-vs-aggrav model — later. */
  balance_index: number;
  adaptive_text: string;
  risk_text: string;
  active_text: string;
  coaching_recommendations: string[];
  subfactor_scores: SubfactorScores;
};

/** Same block for user and admin views (no internal subfactor dump). */
export type CompensatoryCheckPublic = Omit<
  CompensatoryCheckResult,
  "subfactor_scores"
>;

export function toPublicCompensatoryCheck(
  result: CompensatoryCheckResult | null,
): CompensatoryCheckPublic | null {
  if (!result) {
    return null;
  }
  const { subfactor_scores: _scores, ...rest } = result;
  return rest;
}

export function buildCompensatoryCheck(
  psychotypeCode: PsychotypeCode,
  scaledScores: ScaledScores,
  answers: readonly (number | null)[],
  options?: { force?: boolean },
): CompensatoryCheckPublic | null {
  if (!isCompensatoryChecksEnabled() && !options?.force) {
    return null;
  }
  return toPublicCompensatoryCheck(
    evaluateCompensatoryCheck(psychotypeCode, scaledScores, answers, {
      ignorePureGap: options?.force,
    }),
  );
}

export function isPurePsychotypeCode(
  code: PsychotypeCode,
): code is PurePsychotypeCode {
  return (PURE_PSYCHOTYPE_CODES as readonly string[]).includes(code);
}

export function isCompensatoryChecksEnabled(): boolean {
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  const value = process.env.TIOS_COMPENSATORY_CHECKS;
  return value === "true" || value === "1";
}

/** V1.1 full model: weighted compensators vs aggravators (docx tables + block 4.2). */
export function isFullCompensatoryMode(): boolean {
  const value = process.env.TIOS_COMPENSATORY_FULL;
  return value === "true" || value === "1";
}

/** Methodologist Q7: gap between 2nd and 3rd personal scales (absolute scores). */
export function isPureProfileForCompensatory(scaledScores: ScaledScores): boolean {
  const ranked = SCALE_KEYS.map((key) => ({
    key,
    score: scaledScores[key],
  })).sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));

  if (ranked.length < 3) {
    return false;
  }

  return ranked[1].score - ranked[2].score >= COMPENSATORY_PURE_GAP_MIN;
}

/** Methodologist Q1: max within the type's scale pair; fixed tie-break per diad. */
export function resolvePeakScale(
  psychotype: PurePsychotypeCode,
  scores: ScaledScores,
): ScaleKey {
  const [first, second] = PSYCHOTYPE_SCALE_PAIRS[psychotype];
  const firstScore = scores[first];
  const secondScore = scores[second];
  if (firstScore > secondScore) {
    return first;
  }
  if (secondScore > firstScore) {
    return second;
  }
  return PEAK_TIE_BREAK[psychotype];
}

function countPassedClauses(
  psychotype: PurePsychotypeCode,
  subfactors: SubfactorScores,
): number {
  const profile = PROFILES[psychotype];
  if (profile.clauseCount === 2) {
    if (psychotype === "individualist") {
      return (
        Number(isSubfactorModerate(subfactors["3.3"])) +
        Number(isSubfactorModerate(subfactors["5.5"]))
      );
    }
    if (psychotype === "innovator") {
      return (
        Number(subfactors["3.2"] + subfactors["3.4"] > 4) +
        Number(isSubfactorModerate(subfactors["5.5"]))
      );
    }
    if (psychotype === "influencer") {
      return (
        Number(isSubfactorModerate(subfactors["5.5"])) +
        Number(isSubfactorModerate(subfactors["3.4"]))
      );
    }
    if (psychotype === "aesthete") {
      return (
        Number(isSubfactorModerate(subfactors["5.5"])) +
        Number(isSubfactorModerate(subfactors["2.3"]))
      );
    }
    if (psychotype === "conservative") {
      return (
        Number(isSubfactorModerate(subfactors["2.3"])) +
        Number(isSubfactorModerate(subfactors["5.3"]))
      );
    }
    if (psychotype === "empath") {
      return (
        Number(isSubfactorModerate(subfactors["2.3"])) +
        Number(isSubfactorModerate(subfactors["1.2"]))
      );
    }
    if (psychotype === "analyst") {
      return (
        Number(isSubfactorModerate(subfactors["5.2"])) +
        Number(isSubfactorModerate(subfactors["5.3"]))
      );
    }
    if (psychotype === "pragmatist") {
      return (
        Number(isSubfactorModerate(subfactors["5.1"])) +
        Number(isSubfactorModerate(subfactors["3.3"]))
      );
    }
  }
  return profile.evaluateResource(subfactors) ? profile.clauseCount : 0;
}

export function evaluateCompensatoryCheck(
  psychotypeCode: PsychotypeCode,
  scaledScores: ScaledScores,
  answers: readonly (number | null)[],
  options?: { ignorePureGap?: boolean },
): CompensatoryCheckResult | null {
  if (!isPurePsychotypeCode(psychotypeCode)) {
    return null;
  }

  if (!options?.ignorePureGap && !isPureProfileForCompensatory(scaledScores)) {
    return null;
  }

  const subfactor_scores = calculateSubfactorScores(answers);
  const profile = PROFILES[psychotypeCode];

  let isResource: boolean;
  let balance_index: number;

  if (isFullCompensatoryMode()) {
    const full = evaluateFullBalance(psychotypeCode, subfactor_scores, answers);
    isResource = full.compWeight > full.aggWeight;
    balance_index = full.balanceIndex;
  } else {
    isResource = profile.evaluateResource(subfactor_scores);
    const passed = countPassedClauses(psychotypeCode, subfactor_scores);
    balance_index = Math.round((passed / profile.clauseCount) * 100);
  }

  const outcome: CompensatoryOutcome = isResource ? "resource" : "risk";

  return {
    psychotype_code: psychotypeCode,
    outcome,
    peak_scale: resolvePeakScale(psychotypeCode, scaledScores),
    balance_index,
    adaptive_text: profile.adaptive_text,
    risk_text: profile.risk_text,
    active_text: isResource ? profile.adaptive_text : profile.risk_text,
    coaching_recommendations: isResource ? [] : profile.coaching_if_risk,
    subfactor_scores,
  };
}
