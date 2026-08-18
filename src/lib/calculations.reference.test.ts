/**
 * Independent reference implementation of doc algorithms (questionnaire v3.0 / TZ §3.1–3.4).
 * Cross-checks calculations.ts on random inputs and canonical doc examples.
 */
import { describe, expect, it } from "vitest";

import {
  calculate_scaled_scores,
  calculate_systemic_scores,
  determine_psychotype,
  type ScaleKey,
  type ScaledScores,
} from "./calculations";

const PERSONALITY_MAP: Record<number, { left: ScaleKey; right: ScaleKey }> = {};
const WORK_MAP: Record<
  number,
  { left: string; right: string }
> = {};

const BLOCK_EI = [1, 6, 11, 16, 21, 26, 31, 36, 41, 46, 51, 56, 61, 66, 71];
const BLOCK_TA = [2, 7, 12, 17, 22, 27, 32, 37, 42, 47, 52, 57, 62, 67, 72];
const BLOCK_SS = [3, 8, 13, 18, 23, 28, 33, 38, 43, 48, 53, 58, 63, 68, 73];
const BLOCK_LR = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75];

for (const id of BLOCK_EI) {
  PERSONALITY_MAP[id] = { left: "extraversion", right: "introversion" };
}
for (const id of BLOCK_TA) {
  PERSONALITY_MAP[id] = { left: "anxiety", right: "aggression" };
}
for (const id of BLOCK_SS) {
  PERSONALITY_MAP[id] = { left: "sensitivity", right: "spontaneity" };
}
for (const id of BLOCK_LR) {
  PERSONALITY_MAP[id] = { left: "lability", right: "rigidity" };
}

const BLOCK4 = [
  { ids: [4, 9, 14], left: "sub4_1_LAB", right: "sub4_1_RIG" },
  { ids: [19, 24, 29], left: "sub4_2_RIG", right: "sub4_2_LAB" },
  { ids: [34, 39, 44], left: "sub4_3_RIG", right: "sub4_3_LAB" },
  { ids: [49, 54, 59], left: "sub4_4_LAB", right: "sub4_4_RIG" },
  { ids: [64, 69, 74], left: "sub4_5_LAB", right: "sub4_5_RIG" },
];

for (const sub of BLOCK4) {
  for (const id of sub.ids) {
    WORK_MAP[id] = { left: sub.left, right: sub.right };
  }
}

function applySeparate(
  val: number,
  left: string,
  right: string,
  scores: Record<string, number>,
): void {
  if (val < 0) {
    scores[left] = (scores[left] ?? 0) + Math.abs(val);
  } else if (val > 0) {
    scores[right] = (scores[right] ?? 0) + val;
  }
}

function referencePersonality(answers: readonly number[]): ScaledScores {
  const scores: Record<string, number> = {
    extraversion: 0,
    introversion: 0,
    anxiety: 0,
    aggression: 0,
    sensitivity: 0,
    spontaneity: 0,
    lability: 0,
    rigidity: 0,
  };

  for (let q = 1; q <= 75; q += 1) {
    const mapping = PERSONALITY_MAP[q];
    if (!mapping) {
      continue;
    }
    applySeparate(answers[q - 1], mapping.left, mapping.right, scores);
  }

  return scores as ScaledScores;
}

function referenceSystemic(answers: readonly number[]) {
  const sub: Record<string, number> = {
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

  for (let q = 1; q <= 75; q += 1) {
    const mapping = WORK_MAP[q];
    if (!mapping) {
      continue;
    }
    applySeparate(answers[q - 1], mapping.left, mapping.right, sub);
  }

  const LAB_work =
    sub.sub4_1_LAB +
    sub.sub4_2_LAB +
    sub.sub4_3_LAB +
    sub.sub4_4_LAB +
    sub.sub4_5_LAB;
  const RIG_work =
    sub.sub4_1_RIG +
    sub.sub4_2_RIG +
    sub.sub4_3_RIG +
    sub.sub4_4_RIG +
    sub.sub4_5_RIG;

  return { sub, LAB_work, RIG_work };
}

const CIRCLE: ScaleKey[] = [
  "aggression",
  "spontaneity",
  "extraversion",
  "lability",
  "anxiety",
  "sensitivity",
  "introversion",
  "rigidity",
];

const PAIR_TO_CODE: Record<string, string> = {
  "aggression,spontaneity": "individualist",
  "spontaneity,extraversion": "innovator",
  "extraversion,lability": "influencer",
  "lability,anxiety": "aesthete",
  "anxiety,sensitivity": "conservative",
  "sensitivity,introversion": "empath",
  "introversion,rigidity": "analyst",
  "rigidity,aggression": "pragmatist",
};

function areAdjacent(a: ScaleKey, b: ScaleKey): boolean {
  const i1 = CIRCLE.indexOf(a);
  const i2 = CIRCLE.indexOf(b);
  const diff = Math.abs(i1 - i2);
  return diff === 1 || diff === CIRCLE.length - 1;
}

function pairCode(a: ScaleKey, b: ScaleKey): string | null {
  return PAIR_TO_CODE[`${a},${b}`] ?? PAIR_TO_CODE[`${b},${a}`] ?? null;
}

function referencePsychotype(scores: ScaledScores): string {
  const ranked = (Object.keys(scores) as ScaleKey[])
    .map((key) => ({ key, score: scores[key] }))
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));

  const top1 = ranked[0]?.key;
  const top2 = ranked[1]?.key;
  const top3 = ranked[2]?.key;
  if (!top1 || !top2 || !top3) {
    return "mixed";
  }

  if (areAdjacent(top1, top2)) {
    return pairCode(top1, top2) ?? "mixed";
  }

  const fallbacks: [ScaleKey, ScaleKey][] = [
    [top1, top3],
    [top2, top3],
  ];
  const best = fallbacks
    .filter(([a, b]) => areAdjacent(a, b))
    .map(([a, b]) => ({ sum: scores[a] + scores[b], code: pairCode(a, b) }))
    .filter((item): item is { sum: number; code: string } => item.code !== null)
    .sort((a, b) => b.sum - a.sum)[0];

  return best?.code ?? "mixed";
}

function randomAnswers(seed: number): number[] {
  let s = seed;
  return Array.from({ length: 75 }, () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s % 5) - 2;
  });
}

describe("reference implementation vs calculations.ts", () => {
  it("matches personality scores on 2000 pseudo-random answer vectors", () => {
    for (let seed = 0; seed < 2000; seed += 1) {
      const answers = randomAnswers(seed);
      const expected = referencePersonality(answers);
      const actual = calculate_scaled_scores(answers);
      expect(actual).toEqual(expected);
    }
  });

  it("matches block-4 / integrals on 2000 pseudo-random answer vectors", () => {
    for (let seed = 0; seed < 2000; seed += 1) {
      const answers = randomAnswers(seed);
      const expected = referenceSystemic(answers);
      const actual = calculate_systemic_scores(answers);
      expect(actual.sub4_1_LAB).toBe(expected.sub.sub4_1_LAB);
      expect(actual.sub4_1_RIG).toBe(expected.sub.sub4_1_RIG);
      expect(actual.sub4_2_LAB).toBe(expected.sub.sub4_2_LAB);
      expect(actual.sub4_2_RIG).toBe(expected.sub.sub4_2_RIG);
      expect(actual.sub4_3_LAB).toBe(expected.sub.sub4_3_LAB);
      expect(actual.sub4_3_RIG).toBe(expected.sub.sub4_3_RIG);
      expect(actual.sub4_4_LAB).toBe(expected.sub.sub4_4_LAB);
      expect(actual.sub4_4_RIG).toBe(expected.sub.sub4_4_RIG);
      expect(actual.sub4_5_LAB).toBe(expected.sub.sub4_5_LAB);
      expect(actual.sub4_5_RIG).toBe(expected.sub.sub4_5_RIG);
      expect(actual.LAB_work).toBe(expected.LAB_work);
      expect(actual.RIG_work).toBe(expected.RIG_work);
    }
  });

  it("matches psychotype algorithm on 2000 pseudo-random personality profiles", () => {
    for (let seed = 0; seed < 2000; seed += 1) {
      const answers = randomAnswers(seed);
      const scores = calculate_scaled_scores(answers);
      expect(determine_psychotype(scores).psychotype_code).toBe(
        referencePsychotype(scores),
      );
    }
  });

  it("matches questionnaire JSON example (§8) psychotype and delta formulas", () => {
    const personality = {
      extraversion: 22,
      introversion: 5,
      anxiety: 8,
      aggression: 15,
      sensitivity: 12,
      spontaneity: 19,
      lability: 25,
      rigidity: 4,
    };
    expect(determine_psychotype(personality).psychotype_code).toBe("influencer");

    const delta_LAB = personality.lability - 10;
    const delta_RIG = personality.rigidity - 22;
    expect(delta_LAB).toBe(15);
    expect(delta_RIG).toBe(-18);
    expect(Math.abs(delta_LAB) > 10 || Math.abs(delta_RIG) > 10).toBe(true);
  });

  it("doc example §8 integrals are internally consistent", () => {
    const sub = {
      sub4_1_LAB: 5,
      sub4_1_RIG: 1,
      sub4_2_LAB: 3,
      sub4_2_RIG: 4,
      sub4_3_LAB: 2,
      sub4_3_RIG: 6,
      sub4_4_LAB: 0,
      sub4_4_RIG: 6,
      sub4_5_LAB: 0,
      sub4_5_RIG: 5,
    };
    const LAB_work =
      sub.sub4_1_LAB +
      sub.sub4_2_LAB +
      sub.sub4_3_LAB +
      sub.sub4_4_LAB +
      sub.sub4_5_LAB;
    const RIG_work =
      sub.sub4_1_RIG +
      sub.sub4_2_RIG +
      sub.sub4_3_RIG +
      sub.sub4_4_RIG +
      sub.sub4_5_RIG;
    expect(LAB_work).toBe(10);
    expect(RIG_work).toBe(22);
    expect(25 - LAB_work).toBe(15);
    expect(4 - RIG_work).toBe(-18);
  });

  it("classifies correspondence types per TZ §3.4 / questionnaire §6", () => {
    const block5 = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75];
    const block4 = [4, 9, 14, 19, 24, 29, 34, 39, 44, 49, 54, 59, 64, 69, 74];

    const flexNatureRigidWork = Array<number>(75).fill(0);
    for (const id of block5) {
      flexNatureRigidWork[id - 1] = -2;
    }
    for (const id of block4) {
      flexNatureRigidWork[id - 1] = 2;
    }
    const flex = calculate_systemic_scores(flexNatureRigidWork);
    expect(flex.delta_LAB).toBeGreaterThan(10);
    expect(flex.delta_RIG).toBeLessThan(-10);
    expect(flex.tension_zone).toBe(true);
    expect(flex.correspondence_type).toBe("Гибкий по натуре – жёсткий в работе");

    const rigidNatureFlexWork = Array<number>(75).fill(0);
    for (const id of block5) {
      rigidNatureFlexWork[id - 1] = 2;
    }
    for (const id of block4) {
      rigidNatureFlexWork[id - 1] = -2;
    }
    const rigid = calculate_systemic_scores(rigidNatureFlexWork);
    expect(rigid.delta_LAB).toBeLessThan(-10);
    expect(rigid.delta_RIG).toBeGreaterThan(10);
    expect(rigid.correspondence_type).toBe("Жёсткий по натуре – гибкий в работе");

    const match = calculate_systemic_scores(Array(75).fill(0));
    expect(match.correspondence_type).toBe("Соответствие");
    expect(match.tension_zone).toBe(false);
  });
});
