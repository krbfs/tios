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
  modeRequestFindFirst: vi.fn(),
  modeRequestCreate: vi.fn(),
  modeRequestFindUnique: vi.fn(),
  modeRequestUpdate: vi.fn(),
  testResultUpdate: vi.fn(),
  transaction: vi.fn(),
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
    modeRequest: {
      findFirst: mocks.modeRequestFindFirst,
      create: mocks.modeRequestCreate,
      findUnique: mocks.modeRequestFindUnique,
      update: mocks.modeRequestUpdate,
    },
    testResult: {
      update: mocks.testResultUpdate,
    },
    $transaction: mocks.transaction,
  },
}));

import { PATCH as resolveModeRequest } from "@/app/api/admin/mode-requests/[id]/resolve/route";
import { POST as requestMode } from "@/app/api/results/[id]/request-mode/route";

describe("ModeRequest stressless flow", () => {
  const resultContext = { params: Promise.resolve({ id: "result-1" }) };
  const resolveContext = { params: Promise.resolve({ id: "req-1" }) };

  beforeEach(() => {
    mocks.getResultWithSession.mockReset();
    mocks.modeRequestFindFirst.mockReset();
    mocks.modeRequestCreate.mockReset();
    mocks.modeRequestFindUnique.mockReset();
    mocks.modeRequestUpdate.mockReset();
    mocks.testResultUpdate.mockReset();
    mocks.transaction.mockReset();
  });

  it("creates a stressless request and approves it into result mode", async () => {
    mocks.getResultWithSession.mockResolvedValue(makeTestResult());
    mocks.modeRequestFindFirst.mockResolvedValue(null);
    mocks.modeRequestCreate.mockResolvedValue({
      id: "req-1",
      status: "pending",
      requestedMode: "stressless",
    });

    const createResponse = await requestMode(
      withSessionUuid(
        "11111111-1111-1111-1111-111111111111",
        apiRequest("/api/results/result-1/request-mode", {
          method: "POST",
          json: { mode: "stressless" },
        }),
      ),
      resultContext,
    );

    expect(createResponse.status).toBe(200);
    expect(await readJson(createResponse)).toMatchObject({
      status: "pending",
      requested_mode: "stressless",
      message: "Заявка отправлена администратору",
    });

    mocks.modeRequestFindUnique.mockResolvedValue({
      id: "req-1",
      status: "pending",
      resultId: "result-1",
      requestedMode: "stressless",
      result: { id: "result-1" },
    });

    mocks.transaction.mockImplementation(async (callback) => {
      mocks.modeRequestUpdate.mockResolvedValue({
        id: "req-1",
        status: "approved",
        requestedMode: "stressless",
        resultId: "result-1",
      });
      mocks.testResultUpdate.mockResolvedValue({
        id: "result-1",
        mode: "stressless",
      });

      return callback({
        modeRequest: { update: mocks.modeRequestUpdate },
        testResult: { update: mocks.testResultUpdate },
      });
    });

    const adminToken = await signAccessToken({
      id: "admin-1",
      email: "admin@test.local",
      role: "admin",
    });

    const approveResponse = await resolveModeRequest(
      withBearer(
        adminToken,
        apiRequest("/api/admin/mode-requests/req-1/resolve", {
          method: "PATCH",
          json: { action: "approve" },
        }),
      ),
      resolveContext,
    );

    expect(approveResponse.status).toBe(200);
    expect(await readJson(approveResponse)).toMatchObject({
      status: "approved",
      requested_mode: "stressless",
      result_id: "result-1",
    });
    expect(mocks.testResultUpdate).toHaveBeenCalledWith({
      where: { id: "result-1" },
      data: { mode: "stressless" },
    });
  });

  it("returns existing pending request without creating duplicate", async () => {
    mocks.getResultWithSession.mockResolvedValue(makeTestResult());
    mocks.modeRequestFindFirst.mockResolvedValue({
      id: "req-existing",
      status: "pending",
      requestedMode: "stressless",
    });

    const response = await requestMode(
      withSessionUuid(
        "11111111-1111-1111-1111-111111111111",
        apiRequest("/api/results/result-1/request-mode", {
          method: "POST",
          json: { mode: "stressless" },
        }),
      ),
      resultContext,
    );

    expect(response.status).toBe(200);
    expect(await readJson(response)).toMatchObject({
      id: "req-existing",
      status: "pending",
      message: "Заявка уже отправлена и ожидает рассмотрения",
    });
    expect(mocks.modeRequestCreate).not.toHaveBeenCalled();
  });
});
