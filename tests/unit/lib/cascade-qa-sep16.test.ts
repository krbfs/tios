import { describe, expect, it, beforeEach } from "vitest";

import { determine_psychotype } from "@/lib/calculations";
import { CASCADE_QA_COVERAGE_CASES } from "./cascade-qa-coverage.fixture";
import { CASCADE_QA_SEP16_CASES, type CascadeQaCase } from "./cascade-qa-sep16.fixture";

function runCascadeQaCases(label: string, cases: CascadeQaCase[]) {
  describe(label, () => {
    beforeEach(() => {
      process.env.TIOS_V1_PROFILES = "true";
    });

    for (const qaCase of cases) {
      it(`${qaCase.id}: ${qaCase.title}`, () => {
        const result = determine_psychotype(qaCase.scores);

        expect(result.psychotype_code).toBe(qaCase.expect.psychotype_code);
        expect(result.profile_complexity).toBe(qaCase.expect.profile_complexity);
        expect(result.triad_variant).toBe(qaCase.expect.triad_variant);
        expect(result.cascade_level_used).toBe(qaCase.expect.cascade_level_used);

        if (qaCase.expect.secondary_type !== undefined) {
          expect(result.secondary_type).toBe(qaCase.expect.secondary_type);
        }
      });
    }
  });
}

runCascadeQaCases("cascade QA vectors (source_sep_16th ТЕСТ_КЕЙСЫ v1.0)", CASCADE_QA_SEP16_CASES);
runCascadeQaCases(
  "cascade QA coverage (8 типов + L1 left/right + 5 спецтриад)",
  CASCADE_QA_COVERAGE_CASES,
);
