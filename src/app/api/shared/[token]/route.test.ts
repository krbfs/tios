import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest, readJson } from "@/test/helpers/request";
import { makeTestResult } from "@/test/helpers/result-fixture";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  serializeResult: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    testResult: {
      findFirst: mocks.findFirst,
    },
  },
}));

vi.mock("@/lib/api/results", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/results")>();
  return {
    ...actual,
    serializeResult: mocks.serializeResult,
  };
});

import { GET } from "./route";

const routeContext = {
  params: Promise.resolve({ token: "55555555-5555-5555-5555-555555555555" }),
};

describe("GET /api/shared/[token]", () => {
  beforeEach(() => {
    mocks.findFirst.mockReset();
    mocks.serializeResult.mockReset();
    mocks.serializeResult.mockResolvedValue({
      id: "result-1",
      psychotype_code: "influencer",
      is_public: true,
    });
  });

  it("returns 404 for unknown token", async () => {
    mocks.findFirst.mockResolvedValue(null);

    const response = await GET(
      apiRequest("/api/shared/55555555-5555-5555-5555-555555555555"),
      routeContext,
    );

    expect(response.status).toBe(404);
    expect(await readJson(response)).toEqual({ error: "Shared result not found" });
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: {
        shareToken: "55555555-5555-5555-5555-555555555555",
        isPublic: true,
      },
      include: { session: true },
    });
  });

  it("returns serialized public shared result", async () => {
    mocks.findFirst.mockResolvedValue(
      makeTestResult({
        isPublic: true,
        shareToken: "55555555-5555-5555-5555-555555555555",
      }),
    );

    const response = await GET(
      apiRequest("/api/shared/55555555-5555-5555-5555-555555555555"),
      routeContext,
    );

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({
      id: "result-1",
      psychotype_code: "influencer",
      is_public: true,
    });
    expect(mocks.serializeResult).toHaveBeenCalledOnce();
  });
});
