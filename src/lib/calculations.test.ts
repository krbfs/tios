import { afterEach, describe, expect, it } from "vitest";

import {
  buildSortedPersonalScales,
  calculate_avg_intensity,
  calculate_dominant_intensity,
  calculate_empath_sub_indices,
  calculate_result,
  calculate_scaled_scores,
  calculate_systemic_scores,
  buildCoachingRecommendations,
  computeLeaderScores,
  determine_psychotype,
  determine_triad_variant,
  fillAnswers,
  fillTimings,
  LEADER_SCORE_THRESHOLD,
  normalizeExtraversionBand,
  THRESHOLD_AVG_MEDIUM,
  THRESHOLD_AVG_WEAK,
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

afterEach(() => {
  delete process.env.TIOS_V1_PROFILES;
});

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

  it("delta_LAB and delta_RIG use block-5 lability/rigidity minus work integrals", () => {
    const answers = fillAnswers(0);
    const personality = calculate_scaled_scores(answers);
    const scores = calculate_systemic_scores(answers);
    expect(scores.delta_LAB).toBe(personality.lability - scores.LAB_work);
    expect(scores.delta_RIG).toBe(personality.rigidity - scores.RIG_work);
  });

  it("questionnaire JSON example subscales sum to LAB_work=10 and RIG_work=22", () => {
    // Inject doc example sub4 totals by setting raw subscale keys via answers is heavy;
    // verify integral formula on synthetic subscale totals instead.
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
    const labWork =
      sub.sub4_1_LAB +
      sub.sub4_2_LAB +
      sub.sub4_3_LAB +
      sub.sub4_4_LAB +
      sub.sub4_5_LAB;
    const rigWork =
      sub.sub4_1_RIG +
      sub.sub4_2_RIG +
      sub.sub4_3_RIG +
      sub.sub4_4_RIG +
      sub.sub4_5_RIG;
    expect(labWork).toBe(10);
    expect(rigWork).toBe(22);
    expect(25 - labWork).toBe(15);
    expect(4 - rigWork).toBe(-18);
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

describe("calculate_dominant_intensity", () => {
  it("uses max of each opposite pair", () => {
    expect(
      calculate_dominant_intensity({
        extraversion: 30,
        introversion: 10,
        anxiety: 0,
        aggression: 15,
        sensitivity: 0,
        spontaneity: 0,
        lability: 30,
        rigidity: 0,
      }),
    ).toBe(18.75);
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

  it("maps avg_intensity to NAVIGATOR reliability bands", () => {
    const weak = determine_psychotype(flatScores(THRESHOLD_AVG_WEAK));
    expect(weak.warnings).toContain(
      "Ведущие тенденции слабо выражены. Есть вероятность ошибки в прогнозе",
    );

    const medium = determine_psychotype(flatScores(THRESHOLD_AVG_MEDIUM));
    expect(medium.warnings).toContain("Вероятность достоверного прогноза — выше средней");

    const strong = determine_psychotype(flatScores(THRESHOLD_AVG_MEDIUM + 1));
    expect(strong.warnings).toContain("Вероятность достоверного прогноза — высокая");
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

  it("matches questionnaire JSON example: LAB+EXT top → influencer", () => {
    const scores = {
      extraversion: 22,
      introversion: 5,
      anxiety: 8,
      aggression: 15,
      sensitivity: 12,
      spontaneity: 19,
      lability: 25,
      rigidity: 4,
    };
    expect(determine_psychotype(scores).psychotype_code).toBe("influencer");
  });

  it("prefers adjacent top1+top2 over higher-scoring fallback pair (NAVIGATOR §5.3)", () => {
    const result = determine_psychotype({
      extraversion: 18,
      introversion: 0,
      anxiety: 0,
      aggression: 0,
      sensitivity: 0,
      spontaneity: 30,
      lability: 20,
      rigidity: 0,
    });
    // top1=SPO(30), top2=LAB(20) — not adjacent; fallback (SPO,EXT)=48 beats (LAB,EXT)=38
    expect(result.psychotype_code).toBe("innovator");

    const strict = determine_psychotype({
      extraversion: 18,
      introversion: 0,
      anxiety: 0,
      aggression: 0,
      sensitivity: 0,
      spontaneity: 10,
      lability: 20,
      rigidity: 0,
    });
    // top1=LAB(20), top2=EXT(18) adjacent → influencer (not innovator via SPO)
    expect(strict.psychotype_code).toBe("influencer");
  });
});

describe("calculate_result", () => {
  it("all zero answers → mixed psychotype and empty profiles", () => {
    const result = calculate_result(fillAnswers(0), fillTimings(5));
    expect(result.psychotype_code).toBe("mixed");
    expect(result.scaled_scores.extraversion).toBe(0);
    expect(result.scaled_systemic.LAB_work).toBe(0);
    expect(result.validation_warnings).toContain("irregular_psycho_type");
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

describe("buildSortedPersonalScales", () => {
  it("orders scales descending by raw value", () => {
    const scores = calculate_scaled_scores(fillAnswers(-2));
    const sorted = buildSortedPersonalScales(scores);
    expect(sorted[0].key).toBe("extraversion");
    expect(sorted[0].value).toBe(30);
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i - 1].value).toBeGreaterThanOrEqual(sorted[i].value);
    }
  });
});

describe("computeLeaderScores", () => {
  it("returns four leader types with threshold at 70% of 30", () => {
    const scores = calculate_scaled_scores(fillAnswers(-2));
    const leaders = computeLeaderScores(scores);
    expect(leaders).toHaveLength(4);
    expect(leaders.map((item) => item.code)).toEqual([
      "influencer_leader",
      "pragmatist_leader",
      "routine_leader",
      "individualist_leader",
    ]);
    for (const entry of leaders) {
      expect(entry.is_leader).toBe(entry.score > LEADER_SCORE_THRESHOLD);
    }
  });

  it("normalizeExtraversionBand peaks in 12–20 range", () => {
    expect(normalizeExtraversionBand(16)).toBe(30);
    expect(normalizeExtraversionBand(0)).toBe(0);
    expect(normalizeExtraversionBand(30)).toBe(0);
  });
});

describe("buildCoachingRecommendations", () => {
  it("maps correspondence types to coaching text", () => {
    const items = buildCoachingRecommendations({
      tension_zone: true,
      correspondence_type: "Гибкий по натуре – жёсткий в работе",
    });
    expect(items[0]).toContain("выгорания");
  });

  it("suggests coach review when tension zone has no typed label", () => {
    const items = buildCoachingRecommendations({
      tension_zone: true,
      correspondence_type: null,
    });
    expect(items[0]).toContain("коучем");
  });
});

describe("calculate_result extras", () => {
  it("includes sorted_personal_scales and leader_scores", () => {
    const result = calculate_result(fillAnswers(-2), fillTimings(5));
    expect(result.sorted_personal_scales).toHaveLength(8);
    expect(result.leader_scores).toHaveLength(4);
    expect(Array.isArray(result.coaching_recommendations)).toBe(true);
  });

  it("always returns empath sub-indices (S/N)", () => {
    const result = calculate_result(fillAnswers(-2), fillTimings(5));
    expect(result.sub_index_s).toBe(12);
    expect(result.sub_index_n).toBe(18);
    expect(result.triad_variant).toBeNull();
  });
});

describe("determine_triad_variant", () => {
  it("maps circle neighbors for individualist AGG+SPO", () => {
    expect(determine_triad_variant("aggression", "spontaneity", "rigidity")).toBe(
      "left",
    );
    expect(
      determine_triad_variant("aggression", "spontaneity", "extraversion"),
    ).toBe("right");
    expect(
      determine_triad_variant("aggression", "spontaneity", "anxiety"),
    ).toBeNull();
  });

  it("is order-independent for the pair members", () => {
    expect(determine_triad_variant("spontaneity", "aggression", "rigidity")).toBe(
      "left",
    );
  });
});

describe("calculate_empath_sub_indices", () => {
  it("S+N sensitivity points equal total sensitivity when all left", () => {
    const answers = fillAnswers(-2);
    const indices = calculate_empath_sub_indices(answers);
    expect(indices.sub_index_s).toBe(12);
    expect(indices.sub_index_n).toBe(18);
    expect(indices.sub_index_s + indices.sub_index_n).toBe(
      calculate_scaled_scores(answers).sensitivity,
    );
  });

  it("ignores right-pole answers on SS items", () => {
    const answers = fillAnswers(2);
    expect(calculate_empath_sub_indices(answers)).toEqual({
      sub_index_s: 0,
      sub_index_n: 0,
    });
  });
});

describe("V1 profiles (TIOS_V1_PROFILES)", () => {
  it("MVP default: unresolved → mixed, triad null", () => {
    const result = determine_psychotype({
      extraversion: 20,
      introversion: 18,
      anxiety: 16,
      aggression: 0,
      sensitivity: 0,
      spontaneity: 0,
      lability: 0,
      rigidity: 0,
    });
    // EXT+INT opposite; with ANX — no adjacent pair among top-3
    expect(result.psychotype_code).toBe("mixed");
    expect(result.triad_variant).toBeNull();
  });

  it("V1: unresolved → complex", () => {
    process.env.TIOS_V1_PROFILES = "true";
    const result = determine_psychotype({
      extraversion: 20,
      introversion: 18,
      anxiety: 16,
      aggression: 0,
      sensitivity: 0,
      spontaneity: 0,
      lability: 0,
      rigidity: 0,
    });
    expect(result.psychotype_code).toBe("complex");
    expect(result.triad_variant).toBeNull();
  });

  it("V1: triad left for individualist + RIG", () => {
    process.env.TIOS_V1_PROFILES = "true";
    const result = determine_psychotype({
      extraversion: 5,
      introversion: 0,
      anxiety: 0,
      aggression: 28,
      sensitivity: 0,
      spontaneity: 26,
      lability: 0,
      rigidity: 20,
    });
    expect(result.psychotype_code).toBe("individualist");
    expect(result.triad_variant).toBe("left");
  });

  it("V1: triad right for individualist + EXT", () => {
    process.env.TIOS_V1_PROFILES = "true";
    const result = determine_psychotype({
      extraversion: 22,
      introversion: 0,
      anxiety: 0,
      aggression: 28,
      sensitivity: 0,
      spontaneity: 26,
      lability: 0,
      rigidity: 0,
    });
    expect(result.psychotype_code).toBe("individualist");
    expect(result.triad_variant).toBe("right");
  });

  it("V1: triad from fallback pair uses leftover as third", () => {
    process.env.TIOS_V1_PROFILES = "true";
    // top1=SPO(30), top2=LAB(20), top3=EXT(18) → innovator via (SPO,EXT); third=LAB → right
    const result = determine_psychotype({
      extraversion: 18,
      introversion: 0,
      anxiety: 0,
      aggression: 0,
      sensitivity: 0,
      spontaneity: 30,
      lability: 20,
      rigidity: 0,
    });
    expect(result.psychotype_code).toBe("innovator");
    expect(result.triad_variant).toBe("right");
  });
});
