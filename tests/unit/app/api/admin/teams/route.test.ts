import { beforeEach, describe, expect, it, vi } from "vitest";

import { signAccessToken } from "@/lib/api/auth";
import { apiRequest, readJson, withBearer } from "@/test/helpers/request";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    team: { findMany: mocks.findMany },
  },
}));

import { GET } from "@/app/api/admin/teams/route";

describe("GET /api/admin/teams", () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
  });

  it("returns 401 without auth", async () => {
    const response = await GET(apiRequest("/api/admin/teams"));
    expect(response.status).toBe(401);
  });

  it("returns 403 for regular user", async () => {
    const token = await signAccessToken({
      id: "user-1",
      email: "user@test.local",
      role: "user",
    });

    const response = await GET(
      withBearer(token, apiRequest("/api/admin/teams")),
    );

    expect(response.status).toBe(403);
  });

  it("returns teams for admin", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: "team-1",
        name: "Alpha",
        description: null,
        createdAt: new Date("2026-08-18T12:00:00.000Z"),
        createdBy: { id: "admin-1", email: "admin@test.local" },
        _count: { results: 2, members: 1 },
      },
    ]);

    const token = await signAccessToken({
      id: "admin-1",
      email: "admin@test.local",
      role: "admin",
    });

    const response = await GET(
      withBearer(token, apiRequest("/api/admin/teams")),
    );

    expect(response.status).toBe(200);
    const body = await readJson(response);
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Alpha");
    expect(body[0].result_count).toBe(2);
  });
});
