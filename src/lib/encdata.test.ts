import { describe, expect, it } from "vitest";

import { fillAnswers } from "@/lib/calculations";
import {
  computeFromEncdata,
  decodeAnswers,
  encodeAnswers,
  buildResultUrl,
  buildEncdataUrl,
  DEMO_THRESHOLD_WARNINGS,
  getDemoEncdata,
  isDemoEncdata,
} from "@/lib/encdata";

describe("encdata", () => {
  it("builds production-style quiz result URLs", () => {
    const answers = fillAnswers(0);
    expect(buildEncdataUrl(answers, "https://example.com")).toMatch(
      /^https:\/\/example.com\/quiz\/result\?encdata=/,
    );
    expect(buildResultUrl(encodeAnswers(answers), "https://example.com")).toMatch(
      /^https:\/\/example.com\/quiz\/result\?encdata=/,
    );
  });
  it("uses compact binary packing (~40 base64 chars for neutral answers)", () => {
    const answers = fillAnswers(0);
    const encoded = encodeAnswers(answers);
    expect(encoded.length).toBeLessThan(60);
    expect(decodeAnswers(encoded)).toEqual(answers);
  });

  it("still decodes legacy JSON encdata", () => {
    const answers = fillAnswers(0);
    const legacy = Buffer.from(JSON.stringify(answers), "utf8").toString("base64");
    expect(decodeAnswers(legacy)).toEqual(answers);
  });

  it("roundtrips varied answers through compact encoding", () => {
    const answers = fillAnswers(0);
    answers[0] = -2;
    answers[74] = 2;

    const encoded = encodeAnswers(answers);
    expect(decodeAnswers(encoded)).toEqual(answers);
  });

  it("rejects legacy nested payloads", () => {
    const legacy = Buffer.from(
      "[[0,0,0,1,6],[1,-2,4,2,3],[-5,4,2,0,-3],[-1,4,1,-2,-4],[0,1,1,0,0]]",
      "utf8",
    ).toString("base64");

    expect(() => decodeAnswers(legacy)).toThrow(/Invalid encdata|75 answers/);
  });

  it("demo encdata resolves to influencer with curated sample warnings", () => {
    const demo = getDemoEncdata();
    expect(isDemoEncdata(demo)).toBe(true);
    const result = computeFromEncdata(demo);
    expect(result.psychotype_code).toBe("influencer");
    expect(result.warnings).toEqual([...DEMO_THRESHOLD_WARNINGS]);
    expect(result.scaled_scores?.extraversion).toBeGreaterThan(15);
    expect(result.scaled_scores?.lability).toBeGreaterThan(15);
    const nonZeroScales = Object.values(result.scaled_scores ?? {}).filter(
      (v) => v > 0,
    ).length;
    expect(nonZeroScales).toBeGreaterThanOrEqual(6);
  });
});
