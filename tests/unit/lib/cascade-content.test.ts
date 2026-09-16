import { describe, expect, it } from "vitest";

import {
  applyCascadeContentPresentationRules,
  substituteCascadePlaceholders,
} from "@/lib/cascade-content";

describe("cascade content presentation", () => {
  it("hides base portrait when triad is detected", () => {
    const blocks = [
      { block_key: "description_main", content_text: "base" },
      { block_key: "triad_influencer_anx", content_text: "special" },
      { block_key: "triad_addition_left", content_text: "left" },
    ];
    const out = applyCascadeContentPresentationRules(blocks, {
      triadVariant: "detected",
    });
    expect(out.map((b) => b.block_key)).toEqual(["triad_influencer_anx"]);
  });

  it("substitutes primary and secondary labels in dual template", () => {
    const text = "Профиль: [Основной тип] и [Сопутствующий тип]";
    expect(
      substituteCascadePlaceholders(text, {
        primaryTypeCode: "innovator",
        secondaryTypeCode: "analyst",
      }),
    ).toContain("Инноватор");
    expect(
      substituteCascadePlaceholders(text, {
        primaryTypeCode: "innovator",
        secondaryTypeCode: "analyst",
      }),
    ).toContain("Аналитик");
  });

  it("keeps only matching cascade message block", () => {
    const blocks = [
      { block_key: "dual_profile_message", content_text: "dual" },
      { block_key: "modifier_profile_message", content_text: "mod" },
    ];
    const out = applyCascadeContentPresentationRules(blocks, {
      profileComplexity: "dual",
      primaryTypeCode: "innovator",
      secondaryTypeCode: "analyst",
    });
    expect(out).toHaveLength(1);
    expect(out[0]?.block_key).toBe("dual_profile_message");
  });
});
