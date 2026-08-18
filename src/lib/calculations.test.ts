import { describe, expect, it } from "vitest";

import {
  calculate_avg_intensity,
  calculate_result,
  calculate_scaled_scores,
  calculate_systemic_scores,
  determine_psychotype,
  fillAnswers,
  fillTimings,
  validate_answers,
} from "./calculations";

const LEFT_POLES = [
  "extraversion",
  "anxiety",
  "sensitivity",
  "lability",
] as const;

const RIGHT_POLES = [
  "introversion",
  "aggression",
  "spontaneity",
  "rigidity",
] as const;

const BLOCK_TA = [2, 7, 12, 17, 22, 27, 32, 37, 42, 47, 52, 57, 62, 67, 72];
const BLOCK_SS = [3, 8, 13, 18, 23, 28, 33, 38, 43, 48, 53, 58, 63, 68, 73];

describe("calculate_scaled_scores", () => {
  it("all answers -2 → left poles 30, right poles 0", () => {
    const scores = calculate_scaled_scores(fillAnswers(-2));
    for (const key of LEFT_POLES) {
      expect(scores[key]).toBe(30);
    }
    for (const key of RIGHT_POLES) {
      expect(scores[key]).toBe(0);
    }
  });

  it("all answers +2 → left poles 0, right poles 30", () => {
    const scores = calculate_scaled_scores(fillAnswers(2));
    for (const key of LEFT_POLES) {
      expect(scores[key]).toBe(0);
    }
    for (const key of RIGHT_POLES) {
      expect(scores[key]).toBe(30);
    }
  });

  it("all answers 0 → all scales 0", () => {
    const scores = calculate_scaled_scores(fillAnswers(0));
    for (const value of Object.values(scores)) {
      expect(value).toBe(0);
    }
  });

  it("mixed answers → separate counting per tendency", () => {
    const answers = fillAnswers(0);
    for (const id of BLOCK_TA) {
      answers[id - 1] = 2;
    }
    for (const id of BLOCK_SS) {
      answers[id - 1] = 2;
    }

    const scores = calculate_scaled_scores(answers);
    expect(scores.aggression).toBe(30);
    expect(scores.anxiety).toBe(0);
    expect(scores.spontaneity).toBe(30);
    expect(scores.sensitivity).toBe(0);
    expect(scores.extraversion).toBe(0);
  });

  it("EXT and INT are independent (both can be high)", () => {
    const answers = fillAnswers(0);
    for (const id of [1, 6, 11, 16, 21, 26, 31, 36, 41, 46, 51, 56, 61, 66, 71]) {
      answers[id - 1] = -2;
    }
    answers[0] = 2;

    const scores = calculate_scaled_scores(answers);
    expect(scores.extraversion).toBe(28);
    expect(scores.introversion).toBe(2);
  });
});

describe("calculate_systemic_scores", () => {
  it("all answers 0 → subscales and integrals are 0", () => {
    const scores = calculate_systemic_scores(fillAnswers(0));
    expect(scores.sys_energy).toBe(0);
    expect(scores.sys_result).toBe(0);
    expect(scores.sys_quality).toBe(0);
    expect(scores.sys_rules).toBe(0);
    expect(scores.sys_delegation).toBe(0);
    expect(scores.LAB_work).toBe(0);
    expect(scores.RIG_work).toBe(0);
    expect(scores.delta_LAB).toBe(0);
    expect(scores.delta_RIG).toBe(0);
    expect(scores.tension_zone).toBe(false);
  });

  it("Q19 +2 → sub4_2_LAB += 2, sub4_2_RIG += 0 (inverted block 4)", () => {
    const answers = fillAnswers(0);
    answers[18] = 2; // question 19
    const scores = calculate_systemic_scores(answers);
    expect(scores.sub4_2_LAB).toBe(2);
    expect(scores.sub4_2_RIG).toBe(0);
  });

  it("high LAB_pers vs low LAB_work triggers tension zone", () => {
    const answers = fillAnswers(0);
    for (const id of [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75]) {
      answers[id - 1] = -2;
    }
    for (const id of [4, 9, 14]) {
      answers[id - 1] = -2;
    }

    const personality = calculate_scaled_scores(answers);
    const scores = calculate_systemic_scores(answers);
    expect(personality.lability).toBe(30);
    expect(scores.LAB_work).toBe(6);
    expect(scores.delta_LAB).toBe(24);
    expect(scores.tension_zone).toBe(true);
  });
});

describe("calculate_avg_intensity", () => {
  it("is sum of 8 scales divided by 8", () => {
    expect(
      calculate_avg_intensity({
        extraversion: 30,
        introversion: 0,
        anxiety: 0,
        aggression: 30,
        sensitivity: 0,
        spontaneity: 0,
        lability: 0,
        rigidity: 0,
      }),
    ).toBe(7.5);
  });
});

describe("determine_psychotype", () => {
  const flatScores = (value: number) => ({
    extraversion: value,
    introversion: value,
    anxiety: value,
    aggression: value,
    sensitivity: value,
    spontaneity: value,
    lability: value,
    rigidity: value,
  });

  it("all zero answers → mixed type", () => {
    const scores = calculate_scaled_scores(fillAnswers(0));
    const result = determine_psychotype(scores);
    expect(result.psychotype_code).toBe("mixed");
    expect(result.is_dyad).toBe(false);
    expect(result.secondary).toBeNull();
    expect(result.avg_intensity).toBe(0);
  });

  it("flags nervous breakdown when any scale exceeds mean by 30%", () => {
    const scores = flatScores(15);
    scores.anxiety = 22;
    const result = determine_psychotype(scores);
    expect(result.warnings).toContain("Высокая вероятность нервного срыва");
  });

  it("flags contradictory opposite pair when both are high and close", () => {
    const scores = flatScores(15);
    scores.extraversion = 20;
    scores.introversion = 19;
    const result = determine_psychotype(scores);
    expect(result.warnings).toContain("Высокая вероятность непредсказуемого поведения");
  });

  it("detects individualist when AGG and SPO dominate", () => {
    const answers = fillAnswers(0);
    for (const id of BLOCK_TA) {
      answers[id - 1] = 2;
    }
    for (const id of BLOCK_SS) {
      answers[id - 1] = 2;
    }

    const scores = calculate_scaled_scores(answers);
    const result = determine_psychotype(scores);

    expect(result.psychotype_code).toBe("individualist");
    expect(result.is_dyad).toBe(false);
    expect(result.secondary).toBeNull();
  });
});

describe("calculate_result", () => {
  it("all zero answers → mixed psychotype and empty profiles", () => {
    const result = calculate_result(fillAnswers(0), fillTimings(5));
    expect(result.psychotype_code).toBe("mixed");
    expect(result.scaled_scores.extraversion).toBe(0);
    expect(result.scaled_systemic.LAB_work).toBe(0);
  });
});

describe("validate_answers", () => {
  it("flags falsy_answers when all answers are identical", () => {
    const codes = validate_answers(fillAnswers(1), fillTimings(5));
    expect(codes).toContain("falsy_answers");
  });

  it("flags quickly_answers when total time is under 1 minute", () => {
    const codes = validate_answers(fillAnswers(0), fillTimings(0.5));
    expect(codes).toContain("quickly_answers");
  });

  it("does not flag impossible_tendencies for high EXT and INT together", () => {
    const answers = fillAnswers(0);
    for (const id of [1, 6, 11, 16, 21, 26, 31, 36, 41, 46, 51, 56, 61, 66, 71]) {
      answers[id - 1] = 2;
    }
    const codes = validate_answers(answers, fillTimings(5));
    expect(codes).not.toContain("impossible_tendencies");
  });
});
