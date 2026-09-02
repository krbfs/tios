import { beforeEach, describe, expect, it } from "vitest";

import {
  issueStartChallenge,
  resetTestAccessStateForTests,
  START_MIN_DWELL_MS,
  verifyTestToken,
} from "@/lib/test-access";
import { apiRequest, readJson } from "@/test/helpers/request";

import { POST } from "@/app/api/test/start/route";

describe("POST /api/test/start", () => {
  beforeEach(() => {
    resetTestAccessStateForTests();
  });

  it("issues a test token when challenge is aged enough", async () => {
    const { challenge } = await issueStartChallenge({
      ageMs: START_MIN_DWELL_MS + 500,
    });

    const response = await POST(
      apiRequest("/api/test/start", {
        method: "POST",
        json: {
          session_uuid: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          challenge,
          website: "",
        },
      }),
    );

    expect(response.status).toBe(200);
    const payload = await readJson<{
      test_token: string;
      questions_key: string;
      expires_in_hours: number;
    }>(response);
    expect(payload.expires_in_hours).toBe(4);
    expect(payload.test_token.length).toBeGreaterThan(20);
    expect(payload.test_token).not.toBe("invalid");
    expect(payload.questions_key.length).toBeGreaterThan(20);
    expect(await verifyTestToken(payload.test_token)).toBe(true);
  });

  it("rejects start without challenge", async () => {
    const response = await POST(
      apiRequest("/api/test/start", {
        method: "POST",
        json: { session_uuid: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" },
      }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects fresh challenge before dwell time", async () => {
    const { challenge } = await issueStartChallenge({ ageMs: 0 });
    const response = await POST(
      apiRequest("/api/test/start", {
        method: "POST",
        json: { challenge, website: "" },
      }),
    );
    expect(response.status).toBe(429);
  });

  it("rejects reused challenge", async () => {
    const { challenge } = await issueStartChallenge({
      ageMs: START_MIN_DWELL_MS + 500,
    });
    const first = await POST(
      apiRequest("/api/test/start", {
        method: "POST",
        json: { challenge, website: "" },
      }),
    );
    expect(first.status).toBe(200);

    const second = await POST(
      apiRequest("/api/test/start", {
        method: "POST",
        json: { challenge, website: "" },
      }),
    );
    expect(second.status).toBe(401);
  });

  it("soft-fails when honeypot is filled", async () => {
    const { challenge } = await issueStartChallenge({
      ageMs: START_MIN_DWELL_MS + 500,
    });
    const response = await POST(
      apiRequest("/api/test/start", {
        method: "POST",
        json: { challenge, website: "https://spam.example" },
      }),
    );
    expect(response.status).toBe(200);
    const payload = await readJson<{ test_token: string }>(response);
    expect(payload.test_token).toBe("invalid");
    expect(await verifyTestToken(payload.test_token)).toBe(false);
  });
});
