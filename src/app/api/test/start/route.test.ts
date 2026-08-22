import { beforeEach, describe, expect, it } from "vitest";

import { resetTestAccessStateForTests, verifyTestToken } from "@/lib/test-access";
import { apiRequest, readJson } from "@/test/helpers/request";

import { POST } from "./route";

describe("POST /api/test/start", () => {
  beforeEach(() => {
    resetTestAccessStateForTests();
  });

  it("issues a test token", async () => {
    const response = await POST(
      apiRequest("/api/test/start", {
        method: "POST",
        json: { session_uuid: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" },
      }),
    );

    expect(response.status).toBe(200);
    const payload = await readJson<{ test_token: string; expires_in_hours: number }>(
      response,
    );
    expect(payload.expires_in_hours).toBe(4);
    expect(payload.test_token.length).toBeGreaterThan(20);
    expect(await verifyTestToken(payload.test_token)).toBe(true);
  });
});
