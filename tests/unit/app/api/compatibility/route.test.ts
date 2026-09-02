import { describe, expect, it, vi } from "vitest";

import { apiRequest, readJson } from "@/test/helpers/request";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    compatibilityRule: {
      findFirst: mocks.findFirst,
      findMany: mocks.findMany,
    },
  },
}));

import { GET } from "@/app/api/compatibility/route";

describe("GET /api/compatibility", () => {
  it("returns 400 without type params", async () => {
    const response = await GET(apiRequest("/api/compatibility"));
    expect(response.status).toBe(400);
  });

  it("returns pairwise rule", async () => {
    mocks.findFirst.mockResolvedValue({
      typeACode: "influencer",
      typeBCode: "analyst",
      compatibilityLevel: "effective",
      complementZone: null,
      commonZone: null,
      intensityNote: null,
      recommendation: "Works well together",
    });

    const response = await GET(
      apiRequest("/api/compatibility?type_a=influencer&type_b=analyst"),
    );

    expect(response.status).toBe(200);
    const body = await readJson(response);
    expect(body.compatibility_level).toBe("effective");
    expect(body.recommendation).toBe("Works well together");
  });

  it("returns full matrix when matrix=1", async () => {
    mocks.findMany.mockResolvedValue([
      {
        typeACode: "influencer",
        typeBCode: "analyst",
        compatibilityLevel: "effective",
        complementZone: null,
        commonZone: null,
        intensityNote: null,
        recommendation: null,
      },
    ]);

    const response = await GET(apiRequest("/api/compatibility?matrix=1"));
    expect(response.status).toBe(200);
    const body = await readJson(response);
    expect(body.psychotypes).toHaveLength(8);
    expect(body.matrix).toHaveLength(8);
    expect(body.matrix[0]).toHaveLength(8);
  });
});
