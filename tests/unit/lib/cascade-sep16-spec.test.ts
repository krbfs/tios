import { beforeEach, describe, expect, it } from "vitest";

import { determine_psychotype } from "@/lib/calculations";
import { CASCADE_SEP16_SPEC_CASES } from "./cascade-sep16-spec.fixture";

describe("cascade spec (source_sep_16th ТОЧНЫЙ_ТЕКСТ + ТЕСТ_КЕЙСЫ)", () => {
  beforeEach(() => {
    process.env.TIOS_V1_PROFILES = "true";
  });

  for (const spec of CASCADE_SEP16_SPEC_CASES) {
    it(`${spec.id} [${spec.source}] ${spec.title}`, () => {
      const result = determine_psychotype(spec.scores);
      expect(result.psychotype_code).toBe(spec.expect.psychotype_code);
      expect(result.profile_complexity).toBe(spec.expect.profile_complexity);
      expect(result.triad_variant).toBe(spec.expect.triad_variant);
      expect(result.cascade_level_used).toBe(spec.expect.cascade_level_used);
      if (spec.expect.primary_type !== undefined) {
        expect(result.primary_type).toBe(spec.expect.primary_type);
      }
      if (spec.expect.secondary_type !== undefined) {
        expect(result.secondary_type).toBe(spec.expect.secondary_type);
      }
    });
  }
});
