import { describe, expect, it } from "vitest";

import {
  calculate_scaled_scores,
  calculate_systemic_scores,
  determine_psychotype,
  fillAnswers,
  normalizeAnswers,
  type PsychotypeCode,
  type ScaleKey,
} from "@/lib/calculations";

const LR_QUESTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75];
const BLOCK4_NON_INVERTED = [4, 9, 14, 49, 54, 59, 64, 69, 74];
const BLOCK4_INVERTED = [19, 24, 29, 34, 39, 44];

function setLabPers(answers: number[], points: number): void {
  let left = points;
  for (const id of LR_QUESTIONS) {
    if (left <= 0) {
      break;
    }
    const value = Math.min(2, left);
    answers[id - 1] = -value;
    left -= value;
  }
}

function setBlock4Rig(answers: number[], value: 2 | -2): void {
  for (const id of BLOCK4_NON_INVERTED) {
    answers[id - 1] = value;
  }
  for (const id of BLOCK4_INVERTED) {
    answers[id - 1] = -value;
  }
}

function dominantScores(
  dominant: Partial<Record<ScaleKey, number>>,
): Record<ScaleKey, number> {
  return {
    extraversion: 0,
    introversion: 0,
    anxiety: 0,
    aggression: 0,
    sensitivity: 0,
    spontaneity: 0,
    lability: 0,
    rigidity: 0,
    ...dominant,
  };
}

describe("TZ checklist §3 scoring", () => {
  it("personality and work subscale counters are non-negative", () => {
    for (const value of [-2, 0, 2] as const) {
      const answers = fillAnswers(value);
      const personality = calculate_scaled_scores(answers);
      const systemic = calculate_systemic_scores(answers);

      for (const score of Object.values(personality)) {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(30);
      }

      for (const key of [
        "sub4_1_LAB",
        "sub4_1_RIG",
        "sub4_2_LAB",
        "sub4_2_RIG",
        "sub4_3_LAB",
        "sub4_3_RIG",
        "sub4_4_LAB",
        "sub4_4_RIG",
        "sub4_5_LAB",
        "sub4_5_RIG",
        "LAB_work",
        "RIG_work",
      ] as const) {
        expect(systemic[key]).toBeGreaterThanOrEqual(0);
        expect(systemic[key]).toBeLessThanOrEqual(30);
      }
    }
  });

  it("rejects answers outside -2..+2", () => {
    const answers = fillAnswers(0);
    answers[0] = 3;
    expect(() => calculate_scaled_scores(answers)).toThrow(/Invalid answer/);
    expect(() => normalizeAnswers([3, ...fillAnswers(0).slice(1)])).toThrow(
      /Invalid answer/,
    );
  });

  it("Q4 +2 adds to RIG only (non-inverted block 4)", () => {
    const answers = fillAnswers(0);
    answers[3] = 2;
    const scores = calculate_systemic_scores(answers);
    expect(scores.sub4_1_LAB).toBe(0);
    expect(scores.sub4_1_RIG).toBe(2);
  });

  it("inversion applies only to questions 19,24,29 and 34,39,44", () => {
    const inverted = fillAnswers(0);
    for (const id of BLOCK4_INVERTED) {
      inverted[id - 1] = 2;
    }
    const invertedScores = calculate_systemic_scores(inverted);
    expect(invertedScores.sub4_2_LAB).toBe(6);
    expect(invertedScores.sub4_2_RIG).toBe(0);
    expect(invertedScores.sub4_3_LAB).toBe(6);
    expect(invertedScores.sub4_3_RIG).toBe(0);

    const direct = fillAnswers(0);
    for (const id of BLOCK4_NON_INVERTED) {
      direct[id - 1] = 2;
    }
    const directScores = calculate_systemic_scores(direct);
    expect(directScores.sub4_1_RIG).toBe(6);
    expect(directScores.sub4_1_LAB).toBe(0);
    expect(directScores.sub4_4_RIG).toBe(6);
    expect(directScores.sub4_5_RIG).toBe(6);
  });
});

describe("TZ checklist §5 correspondence", () => {
  it("tension zone is false at |Δ|=10 and true at |Δ|=11", () => {
    const atTen = fillAnswers(0);
    setLabPers(atTen, 10);
    const ten = calculate_systemic_scores(atTen);
    expect(ten.delta_LAB).toBe(10);
    expect(ten.tension_zone).toBe(false);
    expect(ten.correspondence_type).toBe("Соответствие");

    const atEleven = fillAnswers(0);
    setLabPers(atEleven, 11);
    const eleven = calculate_systemic_scores(atEleven);
    expect(eleven.delta_LAB).toBe(11);
    expect(eleven.tension_zone).toBe(true);
  });

  it("reproduces all 5 correspondence types on crafted answers", () => {
    const match = fillAnswers(0);
    expect(calculate_systemic_scores(match).correspondence_type).toBe(
      "Соответствие",
    );

    const flexibleNature = fillAnswers(0);
    setLabPers(flexibleNature, 30);
    setBlock4Rig(flexibleNature, 2);
    const flexScores = calculate_systemic_scores(flexibleNature);
    expect(flexScores.delta_LAB).toBeGreaterThan(10);
    expect(flexScores.delta_RIG).toBeLessThan(-10);
    expect(flexScores.correspondence_type).toBe(
      "Гибкий по натуре – жёсткий в работе",
    );

    const rigidNature = fillAnswers(0);
    for (const id of LR_QUESTIONS) {
      rigidNature[id - 1] = 2;
    }
    setBlock4Rig(rigidNature, -2);
    const rigidScores = calculate_systemic_scores(rigidNature);
    expect(rigidScores.delta_LAB).toBeLessThan(-10);
    expect(rigidScores.delta_RIG).toBeGreaterThan(10);
    expect(rigidScores.correspondence_type).toBe(
      "Жёсткий по натуре – гибкий в работе",
    );

    const bothPersonal = fillAnswers(0);
    for (let index = 0; index < LR_QUESTIONS.length; index += 1) {
      bothPersonal[LR_QUESTIONS[index] - 1] = index < 8 ? -2 : 2;
    }
    const bothPersonalScores = calculate_systemic_scores(bothPersonal);
    expect(bothPersonalScores.delta_LAB).toBeGreaterThan(10);
    expect(bothPersonalScores.delta_RIG).toBeGreaterThan(10);
    expect(bothPersonalScores.correspondence_type).toBe(
      "Обе шкалы выше в личности",
    );

    const bothWork = fillAnswers(0);
    const bothWorkPattern: Record<number, -2 | 2> = {
      4: -2,
      9: -2,
      14: 2,
      19: -2,
      24: -2,
      29: 2,
      34: -2,
      39: -2,
      44: 2,
      49: -2,
      54: -2,
      59: 2,
      64: -2,
      69: -2,
      74: 2,
    };
    for (const [id, value] of Object.entries(bothWorkPattern)) {
      bothWork[Number(id) - 1] = value;
    }
    const bothWorkScores = calculate_systemic_scores(bothWork);
    expect(bothWorkScores.LAB_work).toBeGreaterThan(10);
    expect(bothWorkScores.RIG_work).toBeGreaterThan(10);
    expect(bothWorkScores.delta_LAB).toBeLessThan(-10);
    expect(bothWorkScores.delta_RIG).toBeLessThan(-10);
    expect(bothWorkScores.correspondence_type).toBe(
      "Обе шкалы выше в работе",
    );
  });

  it("delta_LAB and delta_RIG stay within -30..+30", () => {
    const answers = fillAnswers(-2);
    setBlock4Rig(answers, 2);
    const scores = calculate_systemic_scores(answers);
    expect(scores.delta_LAB).toBeGreaterThanOrEqual(-30);
    expect(scores.delta_LAB).toBeLessThanOrEqual(30);
    expect(scores.delta_RIG).toBeGreaterThanOrEqual(-30);
    expect(scores.delta_RIG).toBeLessThanOrEqual(30);
  });
});

describe("TZ checklist §5 psychotype pairs", () => {
  const pairs: [ScaleKey, ScaleKey, PsychotypeCode][] = [
    ["aggression", "spontaneity", "individualist"],
    ["spontaneity", "extraversion", "innovator"],
    ["extraversion", "lability", "influencer"],
    ["lability", "anxiety", "aesthete"],
    ["anxiety", "sensitivity", "conservative"],
    ["sensitivity", "introversion", "empath"],
    ["introversion", "rigidity", "analyst"],
    ["rigidity", "aggression", "pragmatist"],
  ];

  it("maps all 8 adjacent circle pairs from §5.3", () => {
    for (const [left, right, code] of pairs) {
      const scores = dominantScores({ [left]: 28, [right]: 26 });
      expect(determine_psychotype(scores).psychotype_code).toBe(code);
    }
  });

  it("uses top1+top3 fallback when top1 and top2 are not adjacent", () => {
    const result = determine_psychotype(
      dominantScores({
        spontaneity: 30,
        lability: 20,
        extraversion: 18,
      }),
    );
    expect(result.psychotype_code).toBe("mixed");
    expect(result.secondary).toBe("innovator");
  });
});
