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
    ]);
  });

  it("returns 401 without test token", async () => {
    const response = await GET(apiRequest("/api/test/questions"));
    expect(response.status).toBe(401);
  });

  it("returns only id and statement texts", async () => {
    const response = await GET(
      withTestToken(testToken, apiRequest("/api/test/questions")),
    );
    expect(response.status).toBe(200);
    const payload = await readJson<Array<Record<string, unknown>>>(response);
    expect(payload).toHaveLength(2);
    expect(payload[0]).toEqual({
      id: 1,
      left_text: "A1",
      right_text: "B1",
    });
    expect(payload[0].factor_group).toBeUndefined();
    expect(payload[0].tendency_positive).toBeUndefined();
    expect(payload[0].tendency_negative).toBeUndefined();
    expect(payload[0].sub_factor).toBeUndefined();
  });
});
