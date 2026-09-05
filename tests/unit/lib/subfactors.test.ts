import { describe, expect, it } from "vitest";

import { fillAnswers } from "@/lib/calculations";
import {
  calculateSubfactorScores,
  SUBFACTOR_MODERATE_MIN,
  SUBFACTOR_QUESTION_FACTOR_PREFIX,
  SUBFACTOR_TRIplet_MAX,
} from "@/lib/subfactors";

import questionsData from "../../../data/questions_aug26.json";

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
    const scores = calculateSubfactorScores(answers);
    expect(scores["3.3"]).toBe(SUBFACTOR_TRIplet_MAX);
  });

  it("right-pole triplet all +2 → score 6", () => {
    const answers = setAnswers(fillAnswers(0), [65, 70, 75], 2);
    const scores = calculateSubfactorScores(answers);
    expect(scores["5.5"]).toBe(SUBFACTOR_TRIplet_MAX);
  });

  it("neutral answers → all subfactors 0", () => {
    const scores = calculateSubfactorScores(fillAnswers(0));
    for (const value of Object.values(scores)) {
      expect(value).toBe(0);
    }
  });

  it("moderate threshold boundary: score 2 is not moderate", () => {
    const answers = setAnswers(fillAnswers(0), [33, 38, 43], -1);
    const scores = calculateSubfactorScores(answers);
    expect(scores["3.3"]).toBe(3);
    expect(scores["3.3"] > SUBFACTOR_MODERATE_MIN).toBe(true);
    const low = setAnswers(fillAnswers(0), [33], -1);
    expect(calculateSubfactorScores(low)["3.3"]).toBe(1);
  });
});

describe("SUBFACTOR_QUESTION_FACTOR_PREFIX vs questions_aug26.json", () => {
  it("question factors match subfactor registry", () => {
    const byId = new Map(
      questionsData.questions.map((question) => [question.id, question.factor]),
    );

    for (const [idRaw, prefix] of Object.entries(SUBFACTOR_QUESTION_FACTOR_PREFIX)) {
      const id = Number(idRaw);
      const factor = byId.get(id);
      expect(factor, `missing question ${id}`).toBeDefined();
      expect(factor!.startsWith(prefix), `${id}: ${factor} vs ${prefix}`).toBe(true);
    }
  });
});
