import { describe, expect, it } from "vitest";
import { getDemoAnswers } from "./encdata";
import {
  calculate_scaled_scores,
  calculate_systemic_scores,
  calculate_avg_intensity,
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

  it("all answers 0 → all scales 15", () => {
    const scores = calculate_scaled_scores(fillAnswers(0));
    for (const value of Object.values(scores)) {
      expect(value).toBe(15);
    }
  });

  it("mixed answers → correct calculation", () => {
    const answers = fillAnswers(0);
    // Блок 2: усиливаем агрессивность (+2 на все вопросы блока)
    for (const id of [2, 7, 12, 17, 22, 27, 32, 37, 42, 47, 52, 57, 62, 67, 72]) {
      answers[id - 1] = 2;
    }
    // Блок 3: усиливаем спонтанность
    for (const id of [3, 8, 13, 18, 23, 28, 33, 38, 43, 48, 53, 58, 63, 68, 73]) {
      answers[id - 1] = 2;
    }

    const scores = calculate_scaled_scores(answers);
    expect(scores.aggression).toBe(30);
    expect(scores.anxiety).toBe(0);
    expect(scores.spontaneity).toBe(30);
    expect(scores.sensitivity).toBe(0);
    expect(scores.extraversion).toBe(15);
  });
});

describe("calculate_systemic_scores", () => {
  it("all answers 0 → systemic subscales 15", () => {
    const scores = calculate_systemic_scores(fillAnswers(0));
    for (const value of Object.values(scores)) {
      expect(value).toBe(15);
    }
  });
});

describe("calculate_avg_intensity", () => {
  it("is sum of 8 scales divided by 8", () => {
    expect(
      calculate_avg_intensity({
        extraversion: 30,
        introversion: 0,
        anxiety: 7.5,
        aggression: 22.5,
        sensitivity: 15,
        spontaneity: 15,
        lability: 22.5,
        rigidity: 7.5,
      }),
    ).toBe(15);

    const demo = calculate_scaled_scores(getDemoAnswers());
    expect(calculate_avg_intensity(demo)).toBe(15);
  });
});

describe("determine_psychotype", () => {
  it("stores avg_intensity as mean of 8 scales", () => {
    const scores = calculate_scaled_scores(fillAnswers(0));
    const result = determine_psychotype(scores);
    expect(result.avg_intensity).toBe(15);
  });

  it("detects clear leader as individualist", () => {
    const answers = fillAnswers(0);
    for (const id of [2, 7, 12, 17, 22, 27, 32, 37, 42, 47, 52, 57, 62, 67, 72]) {
      answers[id - 1] = 2;
    }
    for (const id of [3, 8, 13, 18, 23, 28, 33, 38, 43, 48, 53, 58, 63, 68, 73]) {
      answers[id - 1] = 2;
    }

    const scores = calculate_scaled_scores(answers);
    const result = determine_psychotype(scores);

    expect(result.psychotype_code).toBe("individualist");
    expect(result.is_dyad).toBe(false);
    expect(result.secondary).toBeNull();
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
});
