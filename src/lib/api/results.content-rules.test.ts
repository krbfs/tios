import { describe, expect, it } from "vitest";

import {
  applyV1ContentDisplayRules,
  COMPLEX_PROFILE_BLOCK_KEY,
} from "./results";

describe("applyV1ContentDisplayRules", () => {
  const sample = [
    { block_key: "description_main" },
    { block_key: COMPLEX_PROFILE_BLOCK_KEY },
    { block_key: "triad_addition_left" },
  ];

  it("keeps all blocks for pure psychotypes", () => {
    expect(applyV1ContentDisplayRules("influencer", sample)).toEqual(sample);
  });

  it("keeps only complex_profile_message for complex", () => {
    expect(applyV1ContentDisplayRules("complex", sample)).toEqual([
      { block_key: COMPLEX_PROFILE_BLOCK_KEY },
    ]);
  });
});
