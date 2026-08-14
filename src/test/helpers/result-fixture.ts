import type { TestResult, TestSession } from "@prisma/client";

import { fillAnswers } from "@/lib/calculations";

export function makeTestSession(
  overrides: Partial<TestSession> = {},
): TestSession {
  return {
    id: "session-1",
    userId: "user-1",
    sessionUuid: "11111111-1111-1111-1111-111111111111",
    startedAt: new Date("2026-08-14T09:00:00.000Z"),
    completedAt: new Date("2026-08-14T10:00:00.000Z"),
    ...overrides,
  };
}

export function makeTestResult(
  overrides: Partial<TestResult> = {},
  sessionOverrides: Partial<TestSession> = {},
) {
  const session = makeTestSession(sessionOverrides);
  return {
    id: "result-1",
    sessionId: session.id,
    answers: fillAnswers(0),
    scaledScores: { anxiety: 5 },
    scaledSystemic: { energy: 5 },
    psychotypeCode: "influencer",
    psychotypeSecondary: null,
    avgIntensity: 1.1,
    validationWarnings: [],
    mode: "leader_resource",
    adminComment: null,
    showAdminComment: false,
    visibilityOverrides: null,
    isPublic: false,
    shareToken: null,
    createdAt: new Date("2026-08-14T10:00:00.000Z"),
    session,
    ...overrides,
  };
}
