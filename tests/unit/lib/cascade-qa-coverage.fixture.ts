import type { ScaledScores } from "@/lib/calculations";
import type { CascadeQaCase, CascadeQaExpectation } from "./cascade-qa-sep16.fixture";

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

function scores(partial: Partial<ScaledScores>): ScaledScores {
  return { ...zeroScores(), ...partial };
}

function l1PureCase(
  id: string,
  title: string,
  psychotype: string,
  partial: Partial<ScaledScores>,
): CascadeQaCase {
  const expect: CascadeQaExpectation = {
    psychotype_code: psychotype,
    profile_complexity: "pure",
    triad_variant: null,
    cascade_level_used: 1,
  };
  return { id, title, scores: scores(partial), expect };
}

function l1TriadCase(
  id: string,
  title: string,
  psychotype: string,
  variant: "left" | "right",
  partial: Partial<ScaledScores>,
): CascadeQaCase {
  return {
    id,
    title,
    scores: scores(partial),
    expect: {
      psychotype_code: psychotype,
      profile_complexity: "pure",
      triad_variant: variant,
      cascade_level_used: 1,
    },
  };
}

function l2DetectedCase(
  id: string,
  title: string,
  psychotype: string,
  partial: Partial<ScaledScores>,
): CascadeQaCase {
  return {
    id,
    title,
    scores: scores(partial),
    expect: {
      psychotype_code: psychotype,
      profile_complexity: "triad",
      triad_variant: "detected",
      cascade_level_used: 2,
    },
  };
}

/**
 * Доп. векторы к qa-01…14 (docx v1.0): явное покрытие 8 психотипов и триад
 * (L1 pure, L1 left/right, L2 detected — 6 спецтриад).
 */
export const CASCADE_QA_COVERAGE_CASES: CascadeQaCase[] = [
  // —— L1 pure: по одной соседней диаде на тип (сырые баллы 0–30, как в QA docx) ——
  l1PureCase("cov-l1-pure-aesthete", "LAB(22)+ANX(20) → aesthete", "aesthete", {
    lability: 22,
    anxiety: 20,
    extraversion: 5,
  }),
  l1PureCase("cov-l1-pure-conservative", "ANX(22)+SEN(20) → conservative", "conservative", {
    anxiety: 22,
    sensitivity: 20,
    extraversion: 5,
  }),
  l1PureCase("cov-l1-pure-empath", "SEN(22)+INT(20) → empath", "empath", {
    sensitivity: 22,
    introversion: 20,
    extraversion: 5,
  }),
  l1PureCase("cov-l1-pure-analyst", "INT(22)+RIG(20) → analyst", "analyst", {
    introversion: 22,
    rigidity: 20,
    extraversion: 5,
  }),
  l1PureCase("cov-l1-pure-innovator", "SPO(22)+EXT(20) → innovator", "innovator", {
    spontaneity: 22,
    extraversion: 20,
    anxiety: 5,
  }),
  l1PureCase("cov-l1-pure-influencer", "EXT(22)+LAB(20) → influencer", "influencer", {
    extraversion: 22,
    lability: 20,
    anxiety: 5,
  }),
  l1PureCase("cov-l1-pure-individualist", "AGG(22)+SPO(20) → individualist", "individualist", {
    aggression: 22,
    spontaneity: 20,
    extraversion: 5,
  }),
  l1PureCase("cov-l1-pure-pragmatist", "RIG(22)+AGG(20) → pragmatist", "pragmatist", {
    rigidity: 22,
    aggression: 20,
    extraversion: 5,
  }),

  // —— L1 triad left/right: 3-я тенденция соседствует с парой (круг AGG→…→RIG) ——
  l1TriadCase(
    "cov-l1-triad-aesthete-left",
    "aesthete LAB+ANX, 3-я EXT (left)",
    "aesthete",
    "left",
    { lability: 25, anxiety: 24, extraversion: 20 },
  ),
  l1TriadCase(
    "cov-l1-triad-aesthete-right",
    "aesthete LAB+ANX, 3-я SEN (right)",
    "aesthete",
    "right",
    { lability: 25, anxiety: 24, sensitivity: 20 },
  ),
  l1TriadCase(
    "cov-l1-triad-conservative-left",
    "conservative ANX+SEN, 3-я LAB (left)",
    "conservative",
    "left",
    { anxiety: 25, sensitivity: 24, lability: 20 },
  ),
  l1TriadCase(
    "cov-l1-triad-conservative-right",
    "conservative ANX+SEN, 3-я INT (right)",
    "conservative",
    "right",
    { anxiety: 25, sensitivity: 24, introversion: 20 },
  ),
  l1TriadCase(
    "cov-l1-triad-empath-left",
    "empath SEN+INT, 3-я ANX (left)",
    "empath",
    "left",
    { sensitivity: 25, introversion: 24, anxiety: 20 },
  ),
  l1TriadCase(
    "cov-l1-triad-empath-right",
    "empath SEN+INT, 3-я RIG (right)",
    "empath",
    "right",
    { sensitivity: 25, introversion: 24, rigidity: 20 },
  ),
  l1TriadCase(
    "cov-l1-triad-analyst-left",
    "analyst INT+RIG, 3-я SEN (left)",
    "analyst",
    "left",
    { introversion: 25, rigidity: 24, sensitivity: 20 },
  ),
  l1TriadCase(
    "cov-l1-triad-analyst-right",
    "analyst INT+RIG, 3-я AGG (right)",
    "analyst",
    "right",
    { introversion: 25, rigidity: 24, aggression: 20 },
  ),
  l1TriadCase(
    "cov-l1-triad-innovator-left",
    "innovator SPO+EXT, 3-я AGG (left)",
    "innovator",
    "left",
    { spontaneity: 25, extraversion: 24, aggression: 20 },
  ),
  l1TriadCase(
    "cov-l1-triad-innovator-right",
    "innovator SPO+EXT, 3-я LAB (right)",
    "innovator",
    "right",
    { spontaneity: 25, extraversion: 24, lability: 20 },
  ),
  l1TriadCase(
    "cov-l1-triad-influencer-left",
    "influencer EXT+LAB, 3-я SPO (left)",
    "influencer",
    "left",
    { extraversion: 25, lability: 24, spontaneity: 20 },
  ),
  l1TriadCase(
    "cov-l1-triad-influencer-right",
    "influencer EXT+LAB, 3-я ANX (right)",
    "influencer",
    "right",
    { extraversion: 25, lability: 24, anxiety: 20 },
  ),
  l1TriadCase(
    "cov-l1-triad-individualist-left",
    "individualist AGG+SPO, 3-я RIG (left)",
    "individualist",
    "left",
    { aggression: 25, spontaneity: 24, rigidity: 20 },
  ),
  l1TriadCase(
    "cov-l1-triad-individualist-right",
    "individualist AGG+SPO, 3-я EXT (right)",
    "individualist",
    "right",
    { aggression: 25, spontaneity: 24, extraversion: 20 },
  ),
  l1TriadCase(
    "cov-l1-triad-pragmatist-left",
    "pragmatist RIG+AGG, 3-я INT (left)",
    "pragmatist",
    "left",
    { rigidity: 25, aggression: 24, introversion: 20 },
  ),
  l1TriadCase(
    "cov-l1-triad-pragmatist-right",
    "pragmatist RIG+AGG, 3-я SPO (right)",
    "pragmatist",
    "right",
    { rigidity: 25, aggression: 24, spontaneity: 20 },
  ),

  // —— L2 detected: 5 утверждённых спецтриад (qa-02/08 уже покрывают influencer/empath) ——
  l2DetectedCase(
    "cov-l2-detected-individualist-bender",
    "Спецтриада AGG+SPO+EXT → individualist (Остап Бендер)",
    "individualist",
    { extraversion: 22, aggression: 20, spontaneity: 18, rigidity: 1 },
  ),
  l2DetectedCase(
    "cov-l2-detected-innovator",
    "Спецтриада SPO+EXT+RIG → innovator",
    "innovator",
    { spontaneity: 22, rigidity: 20, extraversion: 18, anxiety: 1 },
  ),
  l2DetectedCase(
    "cov-l2-detected-analyst",
    "Спецтриада INT+RIG+SPO → analyst",
    "analyst",
    { spontaneity: 22, introversion: 20, rigidity: 18, anxiety: 2 },
  ),
  l2DetectedCase(
    "cov-l2-detected-conservative",
    "Спецтриада ANX+SEN+RIG → conservative",
    "conservative",
    { anxiety: 22, rigidity: 20, sensitivity: 18, extraversion: 1 },
  ),
  l2DetectedCase(
    "cov-l2-detected-influencer",
    "Спецтриада EXT+LAB+ANX → influencer (дубль qa-02)",
    "influencer",
    { anxiety: 18, extraversion: 17, lability: 13, spontaneity: 12 },
  ),
  l2DetectedCase(
    "cov-l2-detected-empath",
    "Спецтриада SEN+INT+AGG → empath (дубль qa-08)",
    "empath",
    { introversion: 18, aggression: 16, sensitivity: 13, rigidity: 7 },
  ),
];
