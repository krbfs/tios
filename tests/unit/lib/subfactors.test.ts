import { describe, expect, it } from "vitest";

import { fillAnswers } from "@/lib/calculations";
import {
  calculateBlock42TripletScores,
  calculateSubfactorScores,
  isBlock42ResultModerate,
  SUBFACTOR_MODERATE_MIN,
  SUBFACTOR_QUESTION_FACTOR_PREFIX,
  SUBFACTOR_TRIplet_MAX,
} from "@/lib/subfactors";

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

describe("calculateSubfactorScores", () => {
  it("left-pole triplet all -2 → score 6", () => {
    const answers = setAnswers(fillAnswers(0), [33, 38, 43], -2);
    expect(calculateSubfactorScores(answers)["3.3"]).toBe(SUBFACTOR_TRIplet_MAX);
  });

  it("right-pole triplet all +2 → score 6", () => {
    const answers = setAnswers(fillAnswers(0), [65, 70, 75], 2);
    expect(calculateSubfactorScores(answers)["5.5"]).toBe(SUBFACTOR_TRIplet_MAX);
  });

  it("maps question ids to factor prefixes", () => {
    expect(SUBFACTOR_QUESTION_FACTOR_PREFIX[35]).toBe("5.3");
    expect(SUBFACTOR_QUESTION_FACTOR_PREFIX[63]).toBe("3.5");
  });
});

describe("block 4.2 triplet", () => {
  it("inverted answers: negative → result pole", () => {
    const answers = setAnswers(fillAnswers(0), [19, 24, 29], -2);
    const scores = calculateBlock42TripletScores(answers);
    expect(scores.result).toBe(SUBFACTOR_TRIplet_MAX);
    expect(scores.process).toBe(0);
    expect(isBlock42ResultModerate(answers)).toBe(true);
  });

  it("moderate threshold uses SUBFACTOR_MODERATE_MIN", () => {
    expect(SUBFACTOR_MODERATE_MIN).toBe(2);
  });
});
