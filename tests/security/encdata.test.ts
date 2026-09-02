import { describe, expect, it } from "vitest";

import { fillAnswers } from "@/lib/calculations";
import {
  computeFromEncdata,
  decodeAnswers,
  encodeAnswers,
  encodeAnswersUnsignedForTests,
  buildResultUrl,
  buildEncdataUrl,
  DEMO_THRESHOLD_WARNINGS,
  getDemoAnswers,
  getDemoEncdata,
  isDemoEncdata,
  isSignedEncdata,
  assertPublicEncdata,
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

  it("uses compact signed packing for neutral answers", () => {
    const answers = fillAnswers(0);
    const encoded = encodeAnswers(answers);
    expect(encoded.length).toBeLessThan(90);
    expect(isSignedEncdata(encoded)).toBe(true);
    expect(decodeAnswers(encoded)).toEqual(answers);
  });

  it("still decodes legacy JSON encdata", () => {
    const answers = fillAnswers(0);
    const legacy = Buffer.from(JSON.stringify(answers), "utf8").toString("base64");
    expect(decodeAnswers(legacy)).toEqual(answers);
    expect(isSignedEncdata(legacy)).toBe(false);
  });

  it("still decodes unsigned v1 packing", () => {
    const answers = fillAnswers(0);
    const unsigned = encodeAnswersUnsignedForTests(answers);
    expect(decodeAnswers(unsigned)).toEqual(answers);
    expect(isSignedEncdata(unsigned)).toBe(false);
    expect(() => assertPublicEncdata(unsigned)).toThrow(/unsigned/i);
  });

  it("allows unsigned encdata only for the fixed demo profile", () => {
    const unsignedDemo = encodeAnswersUnsignedForTests(getDemoAnswers());
    expect(() => assertPublicEncdata(unsignedDemo)).not.toThrow();
    expect(isDemoEncdata(unsignedDemo)).toBe(true);
  });

  it("getDemoEncdata falls back without JWT_SECRET in production", () => {
    const prevNode = process.env.NODE_ENV;
    const prevSecret = process.env.JWT_SECRET;
    process.env.NODE_ENV = "production";
    delete process.env.JWT_SECRET;
    try {
      const encdata = getDemoEncdata();
      expect(isSignedEncdata(encdata)).toBe(false);
      expect(isDemoEncdata(encdata)).toBe(true);
      expect(() => assertPublicEncdata(encdata)).not.toThrow();
    } finally {
      process.env.NODE_ENV = prevNode;
      if (prevSecret === undefined) {
        delete process.env.JWT_SECRET;
      } else {
        process.env.JWT_SECRET = prevSecret;
      }
    }
  });

  it("rejects tampered signed encdata", () => {
    const encoded = encodeAnswers(fillAnswers(0));
    const buf = Buffer.from(
      encoded.replace(/-/g, "+").replace(/_/g, "/") + "==",
      "base64",
    );
    buf[5] ^= 0xff;
    const tampered = buf.toString("base64");
    expect(isSignedEncdata(tampered)).toBe(false);
    expect(() => decodeAnswers(tampered)).toThrow(/signature|encoding/i);
  });

  it("roundtrips varied answers through signed encoding", () => {
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
    expect(isSignedEncdata(demo)).toBe(false);
    expect(() => assertPublicEncdata(demo)).not.toThrow();
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

  it("demo encdata shows influencer triad right when V1 profiles enabled", () => {
    const prev = process.env.TIOS_V1_PROFILES;
    process.env.TIOS_V1_PROFILES = "true";
    try {
      const result = computeFromEncdata(getDemoEncdata());
      expect(result.psychotype_code).toBe("influencer");
      expect(result.triad_variant).toBe("right");
      expect(result.triad_status).toBe("stable");
    } finally {
      if (prev === undefined) delete process.env.TIOS_V1_PROFILES;
      else process.env.TIOS_V1_PROFILES = prev;
    }
  });

  it("keeps legacy prod demo encdata on the allowlist", () => {
    const legacy =
      "AUgUJAqSBQmDZEGyIFGQKNgUbAm2BJuybdg2bBsA";
    expect(isDemoEncdata(legacy)).toBe(true);
    expect(() => assertPublicEncdata(legacy)).not.toThrow();
  });

  it("accepts demo signed with a foreign JWT secret", () => {
    const prev = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "foreign-secret-for-test";
    let foreignSigned: string;
    try {
      foreignSigned = encodeAnswers(getDemoAnswers());
    } finally {
      if (prev === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = prev;
    }
    expect(isSignedEncdata(foreignSigned)).toBe(false);
    expect(isDemoEncdata(foreignSigned)).toBe(true);
    expect(() => assertPublicEncdata(foreignSigned)).not.toThrow();
  });

  it("getDemoEncdata is stable without JWT_SECRET in production", () => {
    const prevNode = process.env.NODE_ENV;
    const prevSecret = process.env.JWT_SECRET;
    process.env.NODE_ENV = "production";
    delete process.env.JWT_SECRET;
    try {
      const encdata = getDemoEncdata();
      expect(isSignedEncdata(encdata)).toBe(false);
      expect(isDemoEncdata(encdata)).toBe(true);
      expect(() => assertPublicEncdata(encdata)).not.toThrow();
    } finally {
      process.env.NODE_ENV = prevNode;
      if (prevSecret === undefined) {
        delete process.env.JWT_SECRET;
      } else {
        process.env.JWT_SECRET = prevSecret;
      }
    }
  });
});
