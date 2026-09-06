import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { fillAnswers } from "@/lib/calculations";
import {
  COMPENSATORY_PURE_GAP_MIN,
  evaluateCompensatoryCheck,
  isCompensatoryChecksEnabled,
  isFullCompensatoryMode,
  isPureProfileForCompensatory,
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
  delete process.env.TIOS_COMPENSATORY_FULL;
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

  it("tie-break uses methodologist priority scale", () => {
    const tied = {
      extraversion: 15,
      introversion: 0,
      anxiety: 0,
      aggression: 15,
      sensitivity: 0,
      spontaneity: 0,
      lability: 15,
      rigidity: 15,
    };
    expect(resolvePeakScale("pragmatist", tied)).toBe("aggression");
    expect(resolvePeakScale("influencer", tied)).toBe("lability");
    expect(resolvePeakScale("analyst", tied)).toBe("rigidity");
  });
});

describe("isPureProfileForCompensatory", () => {
  it("requires gap >= COMPENSATORY_PURE_GAP_MIN between 2nd and 3rd scales", () => {
    expect(
      isPureProfileForCompensatory({
        extraversion: 24,
        introversion: 3,
        anxiety: 17,
        aggression: 5,
        sensitivity: 8,
        spontaneity: 7,
        lability: 18,
        rigidity: 0,
      }),
    ).toBe(false);

    expect(
      isPureProfileForCompensatory({
        extraversion: 24,
        introversion: 3,
        anxiety: 10,
        aggression: 5,
        sensitivity: 8,
        spontaneity: 7,
        lability: 18,
        rigidity: 0,
      }),
    ).toBe(true);
    expect(COMPENSATORY_PURE_GAP_MIN).toBe(6);
  });
});

describe("evaluateCompensatoryCheck", () => {
  it("returns null when profile is not pure enough (Q7 gap)", () => {
    const scores = {
      extraversion: 24,
      introversion: 3,
      anxiety: 17,
      aggression: 5,
      sensitivity: 8,
      spontaneity: 7,
      lability: 18,
      rigidity: 0,
    };
    expect(
      evaluateCompensatoryCheck("influencer", scores, fillAnswers(0)),
    ).toBeNull();
    expect(
      evaluateCompensatoryCheck("influencer", scores, fillAnswers(0), {
        ignorePureGap: true,
      })?.psychotype_code,
    ).toBe("influencer");
  });

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

describe("full compensatory mode (eng-4)", () => {
  const individualistScores = {
    extraversion: 0,
    introversion: 0,
    anxiety: 0,
    aggression: 25,
    sensitivity: 0,
    spontaneity: 20,
    lability: 0,
    rigidity: 0,
  };

  beforeEach(() => {
    process.env.TIOS_COMPENSATORY_FULL = "1";
  });

  it("isFullCompensatoryMode reads env", () => {
    delete process.env.TIOS_COMPENSATORY_FULL;
    expect(isFullCompensatoryMode()).toBe(false);
    process.env.TIOS_COMPENSATORY_FULL = "1";
    expect(isFullCompensatoryMode()).toBe(true);
  });

  it("resource when compensator weight exceeds aggravators", () => {
    let answers = fillAnswers(0);
    answers = setAnswers(answers, [33, 38, 43], -2);
    answers = setAnswers(answers, [65, 70, 75], 2);
    answers = setAnswers(answers, [19, 24, 29], -2);
    answers = setAnswers(answers, [18, 23, 28], -2);
    answers = setAnswers(answers, [48, 53, 58], -2);

    const result = evaluateCompensatoryCheck(
      "individualist",
      individualistScores,
      answers,
    );
    expect(result?.outcome).toBe("resource");
    expect(result?.balance_index).toBe(100);
  });

  it("tie goes to risk; balance_index is compensator share", () => {
    let answers = fillAnswers(0);
    answers = setAnswers(answers, [33, 38, 43], -2);

    const result = evaluateCompensatoryCheck(
      "individualist",
      individualistScores,
      answers,
    );
    expect(result?.outcome).toBe("risk");
    expect(result?.balance_index).toBe(50);
  });

  it("pragmatist uses block42 process as compensator", () => {
    let answers = fillAnswers(0);
    answers = setAnswers(answers, [5, 10, 15], -2);
    answers = setAnswers(answers, [33, 38, 43], -2);
    answers = setAnswers(answers, [35, 40, 45], -2);
    answers = setAnswers(answers, [19, 24, 29], 2);

    const scores = {
      extraversion: 0,
      introversion: 0,
      anxiety: 0,
      aggression: 20,
      sensitivity: 0,
      spontaneity: 0,
      lability: 0,
      rigidity: 25,
    };
    const result = evaluateCompensatoryCheck("pragmatist", scores, answers);
    expect(result?.outcome).toBe("resource");
    expect(result?.balance_index).toBe(100);
  });
});

const PURE_GAP_SCALES = {
  extraversion: 5,
  introversion: 5,
  anxiety: 5,
  aggression: 5,
  sensitivity: 5,
  spontaneity: 5,
  lability: 5,
  rigidity: 5,
};

type Fixture = {
  code:
    | "individualist"
    | "innovator"
    | "influencer"
    | "aesthete"
    | "conservative"
    | "empath"
    | "analyst"
    | "pragmatist";
  scales: typeof PURE_GAP_SCALES;
  resourceQuestions: number[];
  resourceValue: number;
  extraResource?: { ids: number[]; value: number }[];
};

const EIGHT_TYPE_FIXTURES: Fixture[] = [
  {
    code: "individualist",
    scales: { ...PURE_GAP_SCALES, aggression: 25, spontaneity: 20 },
    resourceQuestions: [33, 38, 43, 65, 70, 75],
    resourceValue: -2,
    extraResource: [{ ids: [65, 70, 75], value: 2 }],
  },
  {
    code: "innovator",
    scales: { ...PURE_GAP_SCALES, spontaneity: 25, extraversion: 20 },
    resourceQuestions: [18, 23, 28, 48, 53, 58, 65, 70, 75],
    resourceValue: -2,
    extraResource: [{ ids: [65, 70, 75], value: 2 }],
  },
  {
    code: "influencer",
    scales: { ...PURE_GAP_SCALES, extraversion: 25, lability: 20 },
    resourceQuestions: [48, 53, 58, 65, 70, 75],
    resourceValue: -2,
    extraResource: [{ ids: [65, 70, 75], value: 2 }],
  },
  {
    code: "aesthete",
    scales: { ...PURE_GAP_SCALES, lability: 25, anxiety: 20 },
    resourceQuestions: [32, 37, 42, 65, 70, 75],
    resourceValue: 2,
    extraResource: [{ ids: [65, 70, 75], value: 2 }],
  },
  {
    code: "conservative",
    scales: { ...PURE_GAP_SCALES, anxiety: 25, sensitivity: 20 },
    resourceQuestions: [32, 37, 42, 35, 40, 45],
    resourceValue: 2,
    extraResource: [{ ids: [35, 40, 45], value: -2 }],
  },
  {
    code: "empath",
    scales: { ...PURE_GAP_SCALES, sensitivity: 25, introversion: 20 },
    resourceQuestions: [32, 37, 42, 16, 21, 26],
    resourceValue: 2,
    extraResource: [{ ids: [16, 21, 26], value: -2 }],
  },
  {
    code: "analyst",
    scales: { ...PURE_GAP_SCALES, introversion: 25, rigidity: 20 },
    resourceQuestions: [20, 25, 30, 35, 40, 45],
    resourceValue: -2,
  },
  {
    code: "pragmatist",
    scales: { ...PURE_GAP_SCALES, rigidity: 25, aggression: 20 },
    resourceQuestions: [5, 10, 15, 33, 38, 43],
    resourceValue: -2,
  },
];

function buildResourceAnswers(fixture: Fixture): number[] {
  let answers = fillAnswers(0);
  const baseIds = fixture.resourceQuestions.filter(
    (id) => !(fixture.extraResource ?? []).some((x) => x.ids.includes(id)),
  );
  answers = setAnswers(answers, baseIds, fixture.resourceValue);
  for (const extra of fixture.extraResource ?? []) {
    answers = setAnswers(answers, extra.ids, extra.value);
  }
  return answers;
}

describe("8 psychotypes acceptance (checklist)", () => {
  it.each(EIGHT_TYPE_FIXTURES)("$code → resource when MVP compensators pass", (fixture) => {
    const result = evaluateCompensatoryCheck(
      fixture.code,
      fixture.scales,
      buildResourceAnswers(fixture),
      { ignorePureGap: true },
    );
    expect(result?.outcome).toBe("resource");
    expect(result?.active_text).toBe(result?.adaptive_text);
  });

  it.each(EIGHT_TYPE_FIXTURES)("$code → risk when compensators absent", (fixture) => {
    const result = evaluateCompensatoryCheck(
      fixture.code,
      fixture.scales,
      fillAnswers(0),
      { ignorePureGap: true },
    );
    expect(result?.outcome).toBe("risk");
    expect(result?.coaching_recommendations.length).toBeGreaterThan(0);
  });
});

describe("threshold and 3.3 semantics", () => {
  it("subfactor score 2 is below moderate threshold (>2)", () => {
    let answers = fillAnswers(0);
    answers = setAnswers(answers, [33, 38], -1);
    answers = setAnswers(answers, [43], 0);
    const scores = {
      ...PURE_GAP_SCALES,
      aggression: 25,
      spontaneity: 20,
    };
    expect(
      evaluateCompensatoryCheck("individualist", scores, answers, {
        ignorePureGap: true,
      })?.outcome,
    ).toBe("risk");
  });

  it("subfactor score 3 passes moderate threshold", () => {
    let answers = fillAnswers(0);
    answers = setAnswers(answers, [33], -2);
    answers = setAnswers(answers, [38], -1);
    answers = setAnswers(answers, [43, 65, 70, 75], 0);
    answers = setAnswers(answers, [65, 70, 75], 2);
    const scores = {
      ...PURE_GAP_SCALES,
      aggression: 25,
      spontaneity: 20,
    };
    expect(
      evaluateCompensatoryCheck("individualist", scores, answers, {
        ignorePureGap: true,
      })?.outcome,
    ).toBe("resource");
  });

  it("code 3.3 uses the same triplet for individualist and pragmatist", () => {
    let answers = fillAnswers(0);
    answers = setAnswers(answers, [33, 38, 43], -2);
    answers = setAnswers(answers, [5, 10, 15], -2);
    answers = setAnswers(answers, [65, 70, 75], 2);

    const individualist = evaluateCompensatoryCheck(
      "individualist",
      { ...PURE_GAP_SCALES, aggression: 25, spontaneity: 20 },
      answers,
      { ignorePureGap: true },
    );
    const pragmatist = evaluateCompensatoryCheck(
      "pragmatist",
      { ...PURE_GAP_SCALES, rigidity: 25, aggression: 20 },
      answers,
      { ignorePureGap: true },
    );
    expect(individualist?.outcome).toBe("resource");
    expect(pragmatist?.outcome).toBe("resource");
  });
});
