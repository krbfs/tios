import { afterEach, describe, expect, it } from "vitest";

import { fillAnswers } from "@/lib/calculations";
import {
  evaluateCompensatoryCheck,
  isCompensatoryChecksEnabled,
  isPurePsychotypeCode,
  resolvePeakScale,
} from "@/lib/compensatory-checks";

function setAnswers(
  base: number[],
  questionIds: number[],
  value: number,
): number[] {
  const next = [...base];
  for (const id of questionIds) {
    next[id - 1] = value;
  }
  return next;
}

afterEach(() => {
  delete process.env.TIOS_COMPENSATORY_CHECKS;
});

describe("isPurePsychotypeCode", () => {
  it("accepts 8 pure codes only", () => {
    expect(isPurePsychotypeCode("individualist")).toBe(true);
    expect(isPurePsychotypeCode("mixed")).toBe(false);
    expect(isPurePsychotypeCode("complex")).toBe(false);
  });
});

describe("resolvePeakScale", () => {
  it("returns higher score within pair", () => {
    const scores = {
      extraversion: 10,
      introversion: 0,
      anxiety: 0,
      aggression: 0,
      sensitivity: 0,
      spontaneity: 0,
      lability: 20,
      rigidity: 0,
    };
    expect(resolvePeakScale("influencer", scores)).toBe("lability");
  });

  it("tie-break prefers first scale in pair", () => {
    const scores = {
      extraversion: 15,
      introversion: 0,
      anxiety: 0,
      aggression: 15,
      sensitivity: 0,
      spontaneity: 0,
      lability: 0,
      rigidity: 15,
    };
    expect(resolvePeakScale("pragmatist", scores)).toBe("rigidity");
  });
});

describe("evaluateCompensatoryCheck", () => {
  it("returns null for mixed", () => {
    const scores = {
      extraversion: 10,
      introversion: 10,
      anxiety: 10,
      aggression: 10,
      sensitivity: 10,
      spontaneity: 10,
      lability: 10,
      rigidity: 10,
    };
    expect(
      evaluateCompensatoryCheck("mixed", scores, fillAnswers(0)),
    ).toBeNull();
  });

  it("individualist resource when 3.3 and 5.5 pass", () => {
    let answers = fillAnswers(0);
    answers = setAnswers(answers, [33, 38, 43], -2);
    answers = setAnswers(answers, [65, 70, 75], 2);
    const scores = {
      extraversion: 0,
      introversion: 0,
      anxiety: 0,
      aggression: 25,
      sensitivity: 0,
      spontaneity: 20,
      lability: 0,
      rigidity: 0,
    };
    const result = evaluateCompensatoryCheck("individualist", scores, answers);
    expect(result?.outcome).toBe("resource");
    expect(result?.balance_index).toBe(100);
    expect(result?.coaching_recommendations).toEqual([]);
  });

  it("individualist risk when compensators fail", () => {
    const scores = {
      extraversion: 0,
      introversion: 0,
      anxiety: 0,
      aggression: 25,
      sensitivity: 0,
      spontaneity: 20,
      lability: 0,
      rigidity: 0,
    };
    const result = evaluateCompensatoryCheck(
      "individualist",
      scores,
      fillAnswers(0),
    );
    expect(result?.outcome).toBe("risk");
    expect(result?.balance_index).toBe(0);
    expect(result?.coaching_recommendations.length).toBeGreaterThan(0);
    expect(result?.active_text).toBe(result?.risk_text);
    for (const line of result?.coaching_recommendations ?? []) {
      expect(line).not.toMatch(/вопрос/i);
      expect(line).not.toMatch(/подфактор|блок\s+\d/i);
      expect(line).not.toMatch(/\(\d/);
    }
  });

  it("isCompensatoryChecksEnabled reads env", () => {
    expect(isCompensatoryChecksEnabled()).toBe(false);
    process.env.TIOS_COMPENSATORY_CHECKS = "1";
    expect(isCompensatoryChecksEnabled()).toBe(true);
  });
});
