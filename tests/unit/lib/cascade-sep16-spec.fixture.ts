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

export type CascadeSpecExpectation = {
  psychotype_code: string;
  profile_complexity: string | null;
  triad_variant: string | null;
  cascade_level_used: number | null;
  primary_type?: string | null;
  secondary_type?: string | null;
};

export type CascadeSpecCase = {
  id: string;
  source: "ТОЧНЫЙ_ТЕКСТ" | "ТЕСТ_КЕЙСЫ";
  title: string;
  scores: ScaledScores;
  expect: CascadeSpecExpectation;
};

function scores(partial: Partial<ScaledScores>): ScaledScores {
  return { ...zeroScores(), ...partial };
}

/** Дополнение к QA docx: уровни 1–2 и все 5 спецтриад из ТОЧНЫЙ_ТЕКСТ (без 6-й Бендер). */
export const CASCADE_SEP16_SPEC_CASES: CascadeSpecCase[] = [
  {
    id: "spec-l1-pure-influencer",
    source: "ТОЧНЫЙ_ТЕКСТ",
    title: "Уровень 1: EXT+LAB, слабая 3-я",
    scores: scores({ extraversion: 22, lability: 20, anxiety: 5 }),
    expect: {
      psychotype_code: "influencer",
      profile_complexity: "pure",
      triad_variant: null,
      cascade_level_used: 1,
      primary_type: "influencer",
    },
  },
  {
    id: "spec-l1-pure-triad-right",
    source: "ТОЧНЫЙ_ТЕКСТ",
    title: "Уровень 1: AGG+SPO + EXT (right)",
    scores: scores({ aggression: 25, spontaneity: 24, extraversion: 20 }),
    expect: {
      psychotype_code: "individualist",
      profile_complexity: "pure",
      triad_variant: "right",
      cascade_level_used: 1,
    },
  },
  {
    id: "spec-l2-detected-influencer",
    source: "ТОЧНЫЙ_ТЕКСТ",
    title: "Спецтриада EXT+LAB+ANX → influencer",
    scores: scores({ anxiety: 18, extraversion: 17, lability: 13, spontaneity: 12 }),
    expect: {
      psychotype_code: "influencer",
      profile_complexity: "triad",
      triad_variant: "detected",
      cascade_level_used: 2,
      primary_type: "influencer",
    },
  },
  {
    id: "spec-l2-detected-empath",
    source: "ТОЧНЫЙ_ТЕКСТ",
    title: "Спецтриада SEN+INT+AGG → empath",
    scores: scores({ introversion: 18, aggression: 16, sensitivity: 13, rigidity: 7 }),
    expect: {
      psychotype_code: "empath",
      profile_complexity: "triad",
      triad_variant: "detected",
      cascade_level_used: 2,
    },
  },
  {
    id: "spec-l2-detected-innovator",
    source: "ТОЧНЫЙ_ТЕКСТ",
    title: "Спецтриада SPO+EXT+RIG → innovator",
    scores: scores({ spontaneity: 22, rigidity: 20, extraversion: 18, anxiety: 1 }),
    expect: {
      psychotype_code: "innovator",
      profile_complexity: "triad",
      triad_variant: "detected",
      cascade_level_used: 2,
    },
  },
  {
    id: "spec-l2-detected-conservative",
    source: "ТОЧНЫЙ_ТЕКСТ",
    title: "Спецтриада ANX+SEN+RIG → conservative",
    scores: scores({ anxiety: 22, rigidity: 20, sensitivity: 18, extraversion: 1 }),
    expect: {
      psychotype_code: "conservative",
      profile_complexity: "triad",
      triad_variant: "detected",
      cascade_level_used: 2,
    },
  },
  {
    id: "spec-l2-detected-analyst",
    source: "ТОЧНЫЙ_ТЕКСТ",
    title: "Спецтриада INT+RIG+SPO → analyst",
    scores: scores({ spontaneity: 22, introversion: 20, rigidity: 18, anxiety: 2 }),
    expect: {
      psychotype_code: "analyst",
      profile_complexity: "triad",
      triad_variant: "detected",
      cascade_level_used: 2,
    },
  },
  {
    id: "spec-l4-modifier-pragmatist",
    source: "ТОЧНЫЙ_ТЕКСТ",
    title: "Уровень 4: RIG доминанта, разрыв top1−top2 ≥ 4, одна диада в top-4",
    scores: scores({
      rigidity: 20,
      extraversion: 10,
      aggression: 7,
      anxiety: 7,
    }),
    expect: {
      psychotype_code: "pragmatist",
      profile_complexity: "modifier",
      triad_variant: null,
      cascade_level_used: 4,
      primary_type: "pragmatist",
    },
  },
  {
    id: "spec-l3-multidimensional",
    source: "ТЕСТ_КЕЙСЫ",
    title: "Уровень 3: ≥3 диад в top-4 (кейс 9)",
    scores: scores({
      extraversion: 28,
      aggression: 25,
      spontaneity: 24,
      lability: 22,
    }),
    expect: {
      psychotype_code: "innovator",
      profile_complexity: "multidimensional",
      triad_variant: null,
      cascade_level_used: 3,
      secondary_type: "influencer",
    },
  },
  {
    id: "spec-l5-balanced",
    source: "ТОЧНЫЙ_ТЕКСТ",
    title: "Уровень 5: все пики <10",
    scores: scores({ lability: 9, sensitivity: 9, extraversion: 7, aggression: 7 }),
    expect: {
      psychotype_code: "influencer",
      profile_complexity: "balanced",
      triad_variant: null,
      cascade_level_used: 5,
    },
  },
];
