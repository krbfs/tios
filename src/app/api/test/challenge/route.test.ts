import { beforeEach, describe, expect, it } from "vitest";

import { resetTestAccessStateForTests } from "@/lib/test-access";
import { apiRequest, readJson } from "@/test/helpers/request";

import { GET } from "./route";

describe("GET /api/test/challenge", () => {
  beforeEach(() => {
    resetTestAccessStateForTests();
  });

  it("issues a challenge payload", async () => {
    const response = await GET(apiRequest("/api/test/challenge"));
    expect(response.status).toBe(200);
    const payload = await readJson<{
      challenge: string;
      issued_at_ms: number;
      min_wait_ms: number;
    }>(response);
    expect(payload.challenge.length).toBeGreaterThan(20);
    expect(payload.min_wait_ms).toBe(2000);
    expect(payload.issued_at_ms).toBeGreaterThan(0);
  });
});
