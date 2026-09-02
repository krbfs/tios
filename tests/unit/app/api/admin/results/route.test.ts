import { beforeEach, describe, expect, it, vi } from "vitest";

import { signAccessToken } from "@/lib/api/auth";
import { apiRequest, readJson, withBearer } from "@/test/helpers/request";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    testResult: { findMany: mocks.findMany },
  },
}));

import { GET } from "@/app/api/admin/results/route";

describe("GET /api/admin/results", () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
  });

  it("returns 401 without auth", async () => {
    const response = await GET(apiRequest("/api/admin/results"));
    expect(response.status).toBe(401);
    expect(await readJson(response)).toEqual({ error: "Unauthorized" });
  });

  it("returns 403 for regular user", async () => {
    const token = await signAccessToken({
      id: "user-1",
      email: "user@test.local",
      role: "user",
    });

    const response = await GET(
      withBearer(token, apiRequest("/api/admin/results")),
    );

    expect(response.status).toBe(403);
    expect(await readJson(response)).toEqual({ error: "Forbidden" });
  });

  it("returns results for admin", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: "result-1",
        createdAt: new Date("2026-08-14T10:00:00.000Z"),
        psychotypeCode: "influencer",
        psychotypeSecondary: null,
        mode: "leader_resource",
        avgIntensity: 1.1,
        validationWarnings: [],
        session: {
          sessionUuid: "44444444-4444-4444-4444-444444444444",
          user: { id: "user-1", email: "user@test.local" },
        },
      },
    ]);

    const token = await signAccessToken({
      id: "admin-1",
      email: "admin@test.local",
      role: "admin",
    });

    const response = await GET(
      withBearer(
        token,
        apiRequest("/api/admin/results?psychotype=influencer&mode=leader_resource"),
      ),
    );

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual([
      {
        id: "result-1",
        created_at: "2026-08-14T10:00:00.000Z",
        psychotype_code: "influencer",
        psychotype_secondary: null,
        mode: "leader_resource",
        avg_intensity: 1.1,
        validation_warnings: [],
        user: { id: "user-1", email: "user@test.local" },
        session_uuid: "44444444-4444-4444-4444-444444444444",
      },
    ]);

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          psychotypeCode: "influencer",
          mode: "leader_resource",
        },
        take: 200,
      }),
    );
  });
});
