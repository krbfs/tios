import { beforeEach, describe, expect, it, vi } from "vitest";

import { issueTestToken, resetTestAccessStateForTests } from "@/lib/test-access";
import { apiRequest, readJson, withTestToken } from "@/test/helpers/request";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    question: {
      findMany: mocks.findMany,
    },
  },
}));

import { GET } from "./route";

describe("GET /api/test/questions", () => {
  let testToken: string;

  beforeEach(async () => {
    resetTestAccessStateForTests();
    testToken = await issueTestToken();
    mocks.findMany.mockReset();
    mocks.findMany.mockResolvedValue([
      { id: 1, leftText: "A1", rightText: "B1" },
      { id: 2, leftText: "A2", rightText: "B2" },
      { id: 3, leftText: "A3", rightText: "B3" },
      { id: 4, leftText: "A4", rightText: "B4" },
      { id: 5, leftText: "A5", rightText: "B5" },
    ]);
  });

  it("returns 401 without test token", async () => {
    const response = await GET(apiRequest("/api/test/questions?page=0"));
    expect(response.status).toBe(401);
  });

  it("returns 400 without page", async () => {
    const response = await GET(
      withTestToken(testToken, apiRequest("/api/test/questions")),
    );
    expect(response.status).toBe(400);
  });

  it("returns one page of texts only", async () => {
    const response = await GET(
      withTestToken(testToken, apiRequest("/api/test/questions?page=0")),
    );
    expect(response.status).toBe(200);
    const payload = await readJson<{
      page: number;
      page_size: number;
      total: number;
      total_pages: number;
      questions: Array<Record<string, unknown>>;
    }>(response);

    expect(payload.page).toBe(0);
    expect(payload.page_size).toBe(5);
    expect(payload.total).toBe(75);
    expect(payload.total_pages).toBe(15);
    expect(payload.questions).toHaveLength(5);
    expect(payload.questions[0]).toEqual({
      id: 1,
      left_text: "A1",
      right_text: "B1",
    });
    expect(payload.questions[0].factor_group).toBeUndefined();
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 5 }),
    );
  });

  it("rejects skipping ahead", async () => {
    const response = await GET(
      withTestToken(testToken, apiRequest("/api/test/questions?page=2")),
    );
    expect(response.status).toBe(403);
  });

  it("allows sequential pages and re-fetch of earlier page", async () => {
    const page0 = await GET(
      withTestToken(testToken, apiRequest("/api/test/questions?page=0")),
    );
    expect(page0.status).toBe(200);

    const page1 = await GET(
      withTestToken(testToken, apiRequest("/api/test/questions?page=1")),
    );
    expect(page1.status).toBe(200);
    expect(mocks.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ skip: 5, take: 5 }),
    );

    const refetch0 = await GET(
      withTestToken(testToken, apiRequest("/api/test/questions?page=0")),
    );
    expect(refetch0.status).toBe(200);
  });
});
