import { describe, expect, it } from "vitest";

import {
  buildCongruenceAnalysis,
  buildRawScores,
  buildTzSortedPersonalScales,
  buildWorkProfile,
  calculate_result,
  calculate_scaled_scores,
  calculate_systemic_scores,
  determine_psychotype,
  fillAnswers,
  fillTimings,
  normalizeAnswers,
  type ScaledScores,
  type SystemicScores,
} from "@/lib/calculations";
import { primaryTypeLabel } from "@/lib/psychotypes";

const SECTION8_PERSONALITY: ScaledScores = {
  extraversion: 22,
  introversion: 5,
  anxiety: 8,
  aggression: 15,
  sensitivity: 12,
  spontaneity: 19,
  lability: 25,
  rigidity: 4,
};

function section8Systemic(): SystemicScores {
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
  const LAB_work = 10;
  const RIG_work = 22;
  const delta_LAB = SECTION8_PERSONALITY.lability - LAB_work;
  const delta_RIG = SECTION8_PERSONALITY.rigidity - RIG_work;
  return {
    sys_energy: sub.sub4_1_LAB + sub.sub4_1_RIG,
    sys_result: sub.sub4_2_LAB + sub.sub4_2_RIG,
    sys_quality: sub.sub4_3_LAB + sub.sub4_3_RIG,
    sys_rules: sub.sub4_4_LAB + sub.sub4_4_RIG,
    sys_delegation: sub.sub4_5_LAB + sub.sub4_5_RIG,
    ...sub,
    LAB_work,
    RIG_work,
    delta_LAB,
    delta_RIG,
    tension_zone: Math.abs(delta_LAB) > 10 || Math.abs(delta_RIG) > 10,
    correspondence_type: "Гибкий по натуре – жёсткий в работе",
  };
}

describe("TZ §8 output format", () => {
  it("raw_scores contains all 20 indicators from the doc example", () => {
    const systemic = section8Systemic();
    const raw = buildRawScores(SECTION8_PERSONALITY, systemic);

    expect(raw).toEqual({
      EXT: 22,
      INT: 5,
      ANX: 8,
      AGG: 15,
      SEN: 12,
      SPO: 19,
      LAB_pers: 25,
      RIG_pers: 4,
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
      LAB_work: 10,
      RIG_work: 22,
    });
    expect(Object.keys(raw)).toHaveLength(20);
  });

  it("matches §8 sorted scales, primary_type, work_profile, congruence_analysis", () => {
    const systemic = section8Systemic();
    const sorted = buildTzSortedPersonalScales(SECTION8_PERSONALITY);

    expect(sorted.slice(0, 3)).toEqual([
      { scale: "LAB_pers", score: 25 },
      { scale: "EXT", score: 22 },
      { scale: "SPO", score: 19 },
    ]);
    expect(determine_psychotype(SECTION8_PERSONALITY).psychotype_code).toBe(
      "influencer",
    );
    expect(primaryTypeLabel("influencer")).toBe("Лидер мнений");

    expect(buildWorkProfile(systemic)).toEqual({
      energy_efficiency: "LAB",
      focus: "RIG",
      quality_control: "RIG",
      rules: "RIG",
      responsibility: "RIG",
    });

    const congruence = buildCongruenceAnalysis(systemic);
    expect(congruence).toEqual({
      delta_LAB: 15,
      delta_RIG: -18,
      tension_zone: true,
      misalignment_type: "Гибкий по натуре – жёсткий в работе",
      recommendations: [
        "Снизить количество регламентов и согласований.",
        "Делегировать часть контрольных функций.",
      ],
    });
  });

  it("calculate_result exposes §8 fields on the API payload", () => {
    const block5 = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75];
    const block4 = [4, 9, 14, 19, 24, 29, 34, 39, 44, 49, 54, 59, 64, 69, 74];
    const answers = fillAnswers(0);
    for (const id of block5) {
      answers[id - 1] = -2;
    }
    for (const id of block4) {
      answers[id - 1] = 2;
    }

    const result = calculate_result(answers, fillTimings(5));
    expect(result.raw_scores).toBeDefined();
    expect(Object.keys(result.raw_scores)).toHaveLength(20);
    expect(result.work_profile).toBeDefined();
    expect(result.congruence_analysis.misalignment_type).toBe(
      "Гибкий по натуре – жёсткий в работе",
    );
    expect(result.congruence_analysis.recommendations.length).toBeGreaterThan(0);
    expect(result.tz_sorted_personal_scales[0]?.scale).toMatch(/_pers|^[A-Z]{3}$/);
  });

  it("treats null answers as 0 (TZ §9)", () => {
    const nulls = Array<number | null>(75).fill(null);
    expect(normalizeAnswers(nulls)).toEqual(fillAnswers(0));
    expect(calculate_scaled_scores(nulls)).toEqual(calculate_scaled_scores(fillAnswers(0)));
    expect(calculate_systemic_scores(nulls)).toEqual(
      calculate_systemic_scores(fillAnswers(0)),
    );
    expect(calculate_result(nulls, fillTimings(5)).psychotype_code).toBe("mixed");
  });
});
