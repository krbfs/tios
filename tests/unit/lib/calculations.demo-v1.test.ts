import { describe, expect, it } from "vitest";

import { fillTimings, calculate_result } from "@/lib/calculations";
import {
  DEMO_V1_PROFILE_EXPECTATION,
  getDemoAnswers,
  getDemoEncdata,
  computeFromEncdata,
} from "@/lib/encdata";

describe("marketing demo encdata (sep_16 V1 cascade)", () => {
  it("getDemoAnswers + calculate_result matches cascade contract", () => {
    process.env.TIOS_V1_PROFILES = "true";
    const result = calculate_result(getDemoAnswers(), fillTimings(5));
    expect(result.psychotype_code).toBe(
      DEMO_V1_PROFILE_EXPECTATION.psychotype_code,
    );
    expect(result.profile_complexity).toBe(
      DEMO_V1_PROFILE_EXPECTATION.profile_complexity,
    );
    expect(result.cascade_level_used).toBe(
      DEMO_V1_PROFILE_EXPECTATION.cascade_level_used,
    );
    expect(result.triad_variant).toBe(DEMO_V1_PROFILE_EXPECTATION.triad_variant);
    expect(result.triad_status).toBe(DEMO_V1_PROFILE_EXPECTATION.triad_status);
    expect(result.primary_type).toBe(DEMO_V1_PROFILE_EXPECTATION.primary_type);
    expect(result.secondary_type).toBe(
      DEMO_V1_PROFILE_EXPECTATION.secondary_type,
    );
  });

  it("computeFromEncdata matches the same contract", () => {
    process.env.TIOS_V1_PROFILES = "true";
    const result = computeFromEncdata(getDemoEncdata());
    expect(result.psychotype_code).toBe(
      DEMO_V1_PROFILE_EXPECTATION.psychotype_code,
    );
    expect(result.profile_complexity).toBe(
      DEMO_V1_PROFILE_EXPECTATION.profile_complexity,
    );
    expect(result.cascade_level_used).toBe(
      DEMO_V1_PROFILE_EXPECTATION.cascade_level_used,
    );
  });
});
