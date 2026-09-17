import type { ScaledScores } from "@/lib/calculations";

const zeroScores = (): ScaledScores => ({
  extraversion: 0,
  introversion: 0,
  anxiety: 0,
  aggression: 0,
  sensitivity: 0,
  spontaneity: 0,
  lability: 0,
  rigidity: 0,
});

export type CascadeQaExpectation = {
  psychotype_code: string;
  profile_complexity: string | null;
  triad_variant: string | null;
  cascade_level_used: number | null;
  secondary_type?: string | null;
};

/** Векторы из source_sep_16th/ТЕСТ_КЕЙСЫ…v1_0.docx; ожидания — tc_26 + profile-cascade (не копия псевдокода из docx). */
export type CascadeQaCase = {
  id: string;
  title: string;
  scores: ScaledScores;
  expect: CascadeQaExpectation;
  /** Если в QA-доке другой ответ — одна строка для методиста/QA. */
  qa_doc_delta?: string;
};

function scores(partial: Partial<ScaledScores>): ScaledScores {
  return { ...zeroScores(), ...partial };
}

export const CASCADE_QA_SEP16_CASES: CascadeQaCase[] = [
  {
    id: "qa-01",
    title: "RIG(17), SEN(13), INT(10), ANX(9)",
    scores: scores({
      rigidity: 17,
      sensitivity: 13,
      introversion: 10,
      anxiety: 9,
    }),
    expect: {
      psychotype_code: "analyst",
      profile_complexity: "multidimensional",
      triad_variant: null,
      cascade_level_used: 3,
      secondary_type: "empath",
    },
    qa_doc_delta: "В docx: left + complexity triad (классическая триада INT+RIG); в коде — уровень 3, 2+ диады в top-4.",
  },
  {
    id: "qa-02",
    title: "ANX(18), EXT(17), LAB(13), SPO(12) — спецтриада Кастро",
    scores: scores({
      anxiety: 18,
      extraversion: 17,
      lability: 13,
      spontaneity: 12,
    }),
    expect: {
      psychotype_code: "influencer",
      profile_complexity: "triad",
      triad_variant: "detected",
      cascade_level_used: 2,
    },
    qa_doc_delta: "В docx: triad right у пары EXT+LAB; в коде — уровень 2, detected.",
  },
  {
    id: "qa-03",
    title: "SEN(13), EXT(11), LAB(9), AGG(9)",
    scores: scores({
      sensitivity: 13,
      extraversion: 11,
      lability: 9,
      aggression: 9,
    }),
    expect: {
      psychotype_code: "influencer",
      profile_complexity: "balanced",
      triad_variant: null,
      cascade_level_used: 5,
    },
    qa_doc_delta: "В docx: dual; в коде — уровень 5 balanced.",
  },
  {
    id: "qa-04",
    title: "AGG(11), LAB(9), EXT(6), SPO(6)",
    scores: scores({
      aggression: 11,
      lability: 9,
      extraversion: 6,
      spontaneity: 6,
    }),
    expect: {
      psychotype_code: "individualist",
      profile_complexity: "multidimensional",
      triad_variant: null,
      cascade_level_used: 3,
      secondary_type: "influencer",
    },
    qa_doc_delta: "В docx: dual AGG+SPO; в коде — multidimensional (≥2 диады в top-4).",
  },
  {
    id: "qa-05",
    title: "AGG(13), LAB(11), EXT(11), SPO(8)",
    scores: scores({
      aggression: 13,
      lability: 11,
      extraversion: 11,
      spontaneity: 8,
    }),
    expect: {
      psychotype_code: "influencer",
      profile_complexity: "multidimensional",
      triad_variant: null,
      cascade_level_used: 3,
      secondary_type: "individualist",
    },
    qa_doc_delta: "В docx: dual EXT+LAB; в коде — multidimensional.",
  },
  {
    id: "qa-06",
    title: "INT(13), SPO(10), AGG(9), RIG(9) — кластер",
    scores: scores({
      introversion: 13,
      spontaneity: 10,
      aggression: 9,
      rigidity: 9,
    }),
    expect: {
      psychotype_code: "analyst",
      profile_complexity: "multidimensional",
      triad_variant: null,
      cascade_level_used: 3,
      secondary_type: "individualist",
    },
    qa_doc_delta: "В docx: dual INT+RIG + AGG+SPO; в коде — multidimensional (3 диады).",
  },
  {
    id: "qa-07",
    title: "SPO(17), ANX(13), LAB(12), EXT(10)",
    scores: scores({
      spontaneity: 17,
      anxiety: 13,
      lability: 12,
      extraversion: 10,
    }),
    expect: {
      psychotype_code: "innovator",
      profile_complexity: "multidimensional",
      triad_variant: null,
      cascade_level_used: 3,
      secondary_type: "aesthete",
    },
    qa_doc_delta: "В docx: dual aesthete LAB+ANX; в коде — primary innovator (SPO+EXT).",
  },
  {
    id: "qa-08",
    title: "INT(18), AGG(16), SEN(13), RIG(7) — спецтриада empath",
    scores: scores({
      introversion: 18,
      aggression: 16,
      sensitivity: 13,
      rigidity: 7,
    }),
    expect: {
      psychotype_code: "empath",
      profile_complexity: "triad",
      triad_variant: "detected",
      cascade_level_used: 2,
    },
    qa_doc_delta: "В docx: left у SEN+INT; в коде — detected уровень 2.",
  },
  {
    id: "qa-09",
    title: "EXT(28), AGG(25), LAB(24), SPO(22) — многомерный",
    scores: scores({
      extraversion: 28,
      aggression: 25,
      lability: 24,
      spontaneity: 22,
    }),
    expect: {
      psychotype_code: "influencer",
      profile_complexity: "multidimensional",
      triad_variant: null,
      cascade_level_used: 3,
      secondary_type: "innovator",
    },
    qa_doc_delta:
      "В docx EXT+AGG+SPO→innovator; с 6-й триадой top-3 Бендер → вектор с LAB в top-3, primary influencer.",
  },
  {
    id: "qa-10",
    title: "LAB(9), SEN(9), EXT(7), AGG(7) — fallback",
    scores: scores({
      lability: 9,
      sensitivity: 9,
      extraversion: 7,
      aggression: 7,
    }),
    expect: {
      psychotype_code: "influencer",
      profile_complexity: "balanced",
      triad_variant: null,
      cascade_level_used: 5,
    },
    qa_doc_delta: "В docx: aesthete LAB+SEN; в коде — influencer, balanced L5.",
  },
  {
    id: "qa-11",
    title: "Все шкалы 0",
    scores: scores({}),
    expect: {
      psychotype_code: "complex",
      profile_complexity: null,
      triad_variant: null,
      cascade_level_used: null,
    },
    qa_doc_delta: "В docx: balanced flat; в коде — complex (каскад не сработал).",
  },
  {
    id: "qa-12",
    title: "Паритет EXT=INT=LAB=RIG=15",
    scores: scores({
      extraversion: 15,
      introversion: 15,
      lability: 15,
      rigidity: 15,
      anxiety: 4,
      aggression: 4,
      sensitivity: 4,
      spontaneity: 4,
    }),
    expect: {
      psychotype_code: "influencer",
      profile_complexity: "dual",
      triad_variant: null,
      cascade_level_used: 3,
      secondary_type: "analyst",
    },
    qa_doc_delta: "В docx: multidimensional; в коде — dual (2 диады в top-4).",
  },
  {
    id: "qa-13",
    title: "AGG=14, SPO=14, EXT=13, LAB=13",
    scores: scores({
      aggression: 14,
      spontaneity: 14,
      extraversion: 13,
      lability: 13,
    }),
    expect: {
      psychotype_code: "individualist",
      profile_complexity: "pure",
      triad_variant: null,
      cascade_level_used: 1,
    },
    qa_doc_delta: "В docx: dual при равных суммах; в коде — уровень 1 AGG+SPO (top1+top2 соседние).",
  },
  {
    id: "qa-14",
    title: "RIG=25, остальные ≤5",
    scores: scores({
      rigidity: 25,
      aggression: 5,
      introversion: 4,
      extraversion: 3,
      anxiety: 3,
      sensitivity: 3,
      spontaneity: 3,
      lability: 3,
    }),
    expect: {
      psychotype_code: "pragmatist",
      profile_complexity: "pure",
      triad_variant: null,
      cascade_level_used: 1,
    },
  },
];
