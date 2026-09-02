import { beforeEach, describe, expect, it, vi } from "vitest";

import { signAccessToken } from "@/lib/api/auth";
import { fillAnswers } from "@/lib/calculations";
import { encodeAnswers } from "@/lib/encdata";
import { apiRequest, readJson, withBearer } from "@/test/helpers/request";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    testResult: { findMany: mocks.findMany },
  },
}));

import { GET } from "@/app/api/results/history/route";

describe("GET /api/results/history", () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
  });

  it("returns 401 without auth", async () => {
    const response = await GET(apiRequest("/api/results/history"));
    expect(response.status).toBe(401);
    expect(await readJson(response)).toEqual({ error: "Unauthorized" });
  });

  it("returns user history", async () => {
    const answers = fillAnswers(0);
    mocks.findMany.mockResolvedValue([
      {
        id: "result-1",
        createdAt: new Date("2026-08-14T10:00:00.000Z"),
        answers,
        psychotypeCode: "influencer",
        psychotypeSecondary: null,
        mode: "leader_resource",
        avgIntensity: 1.3,
      },
    ]);

    const token = await signAccessToken({
      id: "user-1",
      email: "user@test.local",
      role: "user",
    });

    const response = await GET(
      withBearer(token, apiRequest("/api/results/history")),
    );

    expect(response.status).toBe(200);
    const payload = await readJson<
      Array<{
        id: string;
        psychotype_code: string;
        encdata: string;
        result_url: string;
      }>
    >(response);

    expect(payload).toHaveLength(1);
    expect(payload[0]?.id).toBe("result-1");
    expect(payload[0]?.psychotype_code).toBe("influencer");
    expect(payload[0]?.encdata).toBe(encodeAnswers(answers));
    expect(payload[0]?.result_url).toContain("/quiz/result?encdata=");

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { session: { userId: "user-1" } },
      }),
    );
  });
});
