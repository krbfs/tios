import { beforeEach, describe, expect, it, vi } from "vitest";

import { signAccessToken } from "@/lib/api/auth";
import {
  apiRequest,
  readJson,
  withBearer,
  withSessionUuid,
} from "@/test/helpers/request";
import { makeTestResult } from "@/test/helpers/result-fixture";

const mocks = vi.hoisted(() => ({
  getResultWithSession: vi.fn(),
  serializeResult: vi.fn(),
}));

vi.mock("@/lib/api/results", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/results")>();
  return {
    ...actual,
    getResultWithSession: mocks.getResultWithSession,
    serializeResult: mocks.serializeResult,
  };
});

import { GET } from "./route";

const routeContext = { params: Promise.resolve({ id: "result-1" }) };

describe("GET /api/results/[id]", () => {
  beforeEach(() => {
    mocks.getResultWithSession.mockReset();
    mocks.serializeResult.mockReset();
    mocks.serializeResult.mockResolvedValue({
      id: "result-1",
      psychotype_code: "influencer",
    });
  });

  it("returns 404 when result does not exist", async () => {
    mocks.getResultWithSession.mockResolvedValue(null);

    const response = await GET(apiRequest("/api/results/result-1"), routeContext);
    expect(response.status).toBe(404);
    expect(await readJson(response)).toEqual({ error: "Result not found" });
  });

  it("returns 403 for private result without access", async () => {
    mocks.getResultWithSession.mockResolvedValue(
      makeTestResult(
        { isPublic: false },
        { userId: "other-user", sessionUuid: "22222222-2222-2222-2222-222222222222" },
      ),
    );

    const response = await GET(apiRequest("/api/results/result-1"), routeContext);
    expect(response.status).toBe(403);
    expect(await readJson(response)).toEqual({ error: "Forbidden" });
  });

  it("returns public result without auth", async () => {
    mocks.getResultWithSession.mockResolvedValue(
      makeTestResult({ isPublic: true }),
    );

    const response = await GET(apiRequest("/api/results/result-1"), routeContext);
    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({
      id: "result-1",
      psychotype_code: "influencer",
    });
  });

  it("returns result for matching session uuid", async () => {
    mocks.getResultWithSession.mockResolvedValue(makeTestResult());

    const response = await GET(
      withSessionUuid(
        "11111111-1111-1111-1111-111111111111",
        apiRequest("/api/results/result-1"),
      ),
      routeContext,
    );

    expect(response.status).toBe(200);
    expect(mocks.serializeResult).toHaveBeenCalledOnce();
  });

  it("returns result for authenticated owner", async () => {
    mocks.getResultWithSession.mockResolvedValue(makeTestResult());
    const token = await signAccessToken({
      id: "user-1",
      email: "user@test.local",
      role: "user",
    });

    const response = await GET(
      withBearer(token, apiRequest("/api/results/result-1")),
      routeContext,
    );

    expect(response.status).toBe(200);
  });

  it("returns result for admin even without ownership", async () => {
    mocks.getResultWithSession.mockResolvedValue(
      makeTestResult({}, { userId: "other-user" }),
    );
    const token = await signAccessToken({
      id: "admin-1",
      email: "admin@test.local",
      role: "admin",
    });

    const response = await GET(
      withBearer(token, apiRequest("/api/results/result-1")),
      routeContext,
    );

    expect(response.status).toBe(200);
  });
});
