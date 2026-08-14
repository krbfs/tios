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
  update: vi.fn(),
}));

vi.mock("@/lib/api/results", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/results")>();
  return {
    ...actual,
    getResultWithSession: mocks.getResultWithSession,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    testResult: {
      update: mocks.update,
    },
  },
}));

import { POST } from "./route";

const routeContext = { params: Promise.resolve({ id: "result-1" }) };

describe("POST /api/results/[id]/share", () => {
  beforeEach(() => {
    mocks.getResultWithSession.mockReset();
    mocks.update.mockReset();
  });

  it("returns 404 when result does not exist", async () => {
    mocks.getResultWithSession.mockResolvedValue(null);

    const response = await POST(apiRequest("/api/results/result-1/share", { method: "POST" }), routeContext);
    expect(response.status).toBe(404);
  });

  it("returns 403 without access", async () => {
    mocks.getResultWithSession.mockResolvedValue(
      makeTestResult({}, { userId: "other-user", sessionUuid: "22222222-2222-2222-2222-222222222222" }),
    );

    const response = await POST(apiRequest("/api/results/result-1/share", { method: "POST" }), routeContext);
    expect(response.status).toBe(403);
    expect(await readJson(response)).toEqual({ error: "Forbidden" });
  });

  it("creates share link for session owner", async () => {
    const result = makeTestResult({ shareToken: null });
    mocks.getResultWithSession.mockResolvedValue(result);
    mocks.update.mockResolvedValue({
      ...result,
      shareToken: "55555555-5555-5555-5555-555555555555",
      isPublic: true,
    });

    const response = await POST(
      withSessionUuid(
        "11111111-1111-1111-1111-111111111111",
        apiRequest("/api/results/result-1/share", { method: "POST" }),
      ),
      routeContext,
    );

    expect(response.status).toBe(200);
    const payload = await readJson<{
      share_token: string;
      encdata: string;
      result_url: string;
      share_link: string;
    }>(response);

    expect(payload.share_token).toBe("55555555-5555-5555-5555-555555555555");
    expect(payload.encdata.length).toBeGreaterThan(10);
    expect(payload.result_url).toContain("/quiz/result?encdata=");
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "result-1" },
        data: expect.objectContaining({ isPublic: true }),
      }),
    );
  });

  it("allows admin to share foreign result", async () => {
    const result = makeTestResult({}, { userId: "other-user" });
    mocks.getResultWithSession.mockResolvedValue(result);
    mocks.update.mockResolvedValue({
      ...result,
      shareToken: "66666666-6666-6666-6666-666666666666",
      isPublic: true,
    });

    const token = await signAccessToken({
      id: "admin-1",
      email: "admin@test.local",
      role: "admin",
    });

    const response = await POST(
      withBearer(token, apiRequest("/api/results/result-1/share", { method: "POST" })),
      routeContext,
    );

    expect(response.status).toBe(200);
  });
});
