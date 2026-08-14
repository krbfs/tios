import { beforeEach, describe, expect, it, vi } from "vitest";

import { fillAnswers } from "@/lib/calculations";
import { signAccessToken } from "@/lib/api/auth";
import { apiRequest, readJson, withBearer } from "@/test/helpers/request";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  resultCreate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    testSession: {
      findUnique: mocks.findUnique,
      create: mocks.create,
      update: mocks.update,
    },
    testResult: {
      create: mocks.resultCreate,
    },
  },
}));

import { POST } from "./route";

describe("POST /api/test/submit", () => {
  const answers = fillAnswers(0);

  beforeEach(() => {
    mocks.findUnique.mockReset();
    mocks.create.mockReset();
    mocks.update.mockReset();
    mocks.resultCreate.mockReset();
  });

  it("returns 400 when answers length is not 75", async () => {
    const response = await POST(
      apiRequest("/api/test/submit", {
        method: "POST",
        json: { answers: [0, 1, 2] },
      }),
    );

    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({
      error: "answers must be an array of 75 integers",
    });
  });

  it("creates a new session and result", async () => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.create.mockResolvedValue({
      id: "session-1",
      sessionUuid: "22222222-2222-2222-2222-222222222222",
      userId: null,
      completedAt: new Date(),
    });
    mocks.resultCreate.mockResolvedValue({
      id: "result-1",
      psychotypeCode: "influencer",
      psychotypeSecondary: null,
      avgIntensity: 1.2,
      scaledScores: {},
      scaledSystemic: {},
      validationWarnings: [],
      mode: "leader_resource",
      session: {
        sessionUuid: "22222222-2222-2222-2222-222222222222",
      },
    });

    const response = await POST(
      apiRequest("/api/test/submit", {
        method: "POST",
        json: {
          session_uuid: "22222222-2222-2222-2222-222222222222",
          answers,
        },
      }),
    );

    expect(response.status).toBe(201);
    const payload = await readJson<{
      result_id: string;
      encdata: string;
      session_uuid: string;
      psychotype_code: string;
    }>(response);

    expect(payload.result_id).toBe("result-1");
    expect(payload.session_uuid).toBe("22222222-2222-2222-2222-222222222222");
    expect(payload.encdata.length).toBeGreaterThan(10);
    expect(payload.psychotype_code).toBeTruthy();
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(mocks.resultCreate).toHaveBeenCalledOnce();
  });

  it("allows multiple submissions for the same session", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "session-1",
      sessionUuid: "22222222-2222-2222-2222-222222222222",
      userId: null,
      completedAt: new Date("2026-08-14T09:00:00.000Z"),
    });
    mocks.update.mockResolvedValue({
      id: "session-1",
      sessionUuid: "22222222-2222-2222-2222-222222222222",
      userId: null,
      completedAt: new Date("2026-08-14T10:00:00.000Z"),
    });
    mocks.resultCreate.mockResolvedValue({
      id: "result-2",
      psychotypeCode: "analyst",
      psychotypeSecondary: null,
      avgIntensity: 0.8,
      scaledScores: {},
      scaledSystemic: {},
      validationWarnings: [],
      mode: "leader_resource",
      session: {
        sessionUuid: "22222222-2222-2222-2222-222222222222",
      },
    });

    const response = await POST(
      apiRequest("/api/test/submit", {
        method: "POST",
        json: {
          session_uuid: "22222222-2222-2222-2222-222222222222",
          answers,
        },
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.update).toHaveBeenCalledOnce();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.resultCreate).toHaveBeenCalledOnce();
  });

  it("links anonymous session to authenticated user", async () => {
    const token = await signAccessToken({
      id: "user-1",
      email: "user@test.local",
      role: "user",
    });

    mocks.findUnique.mockResolvedValue({
      id: "session-1",
      sessionUuid: "33333333-3333-3333-3333-333333333333",
      userId: null,
      completedAt: null,
    });
    mocks.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "session-1",
      sessionUuid: "33333333-3333-3333-3333-333333333333",
      userId: (data.userId as string | undefined) ?? "user-1",
      completedAt: (data.completedAt as Date | undefined) ?? new Date(),
    }));
    mocks.resultCreate.mockResolvedValue({
      id: "result-3",
      psychotypeCode: "pragmatist",
      psychotypeSecondary: null,
      avgIntensity: 1,
      scaledScores: {},
      scaledSystemic: {},
      validationWarnings: [],
      mode: "leader_resource",
      session: {
        sessionUuid: "33333333-3333-3333-3333-333333333333",
      },
    });

    const response = await POST(
      withBearer(
        token,
        apiRequest("/api/test/submit", {
          method: "POST",
          json: {
            session_uuid: "33333333-3333-3333-3333-333333333333",
            answers,
          },
        }),
      ),
    );

    expect(response.status).toBe(201);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "session-1" },
      data: { userId: "user-1" },
    });
  });
});
