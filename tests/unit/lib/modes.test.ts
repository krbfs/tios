import { describe, expect, it } from "vitest";

import {
  ALLOWED_MODES,
  isAllowedMode,
  isManualInsighterPairSwitch,
  resolveContentModeForSession,
} from "@/lib/modes";

describe("ALLOWED_MODES", () => {
  it("lists all five content modes", () => {
    expect(ALLOWED_MODES).toEqual([
      "leader_resource",
      "insighter",
      "insighter_you",
      "stressless",
      "hr_table",
    ]);
  });
});

describe("resolveContentModeForSession", () => {
  const sessionUuid = "11111111-1111-1111-1111-111111111111";

  it("returns insighter for admin viewer", () => {
    expect(
      resolveContentModeForSession(
        "stressless",
        "user-1",
        sessionUuid,
        { user: { id: "admin-1", role: "admin" }, sessionUuid: null },
      ),
    ).toBe("insighter");
  });

  it("returns insighter_you for authenticated owner", () => {
    expect(
      resolveContentModeForSession("hr_table", "user-1", sessionUuid, {
        user: { id: "user-1", role: "user" },
        sessionUuid: null,
      }),
    ).toBe("insighter_you");
  });

  it("returns insighter_you for matching session uuid", () => {
    expect(
      resolveContentModeForSession("leader_resource", null, sessionUuid, {
        user: null,
        sessionUuid,
      }),
    ).toBe("insighter_you");
  });

  it.each(["leader_resource", "stressless", "hr_table"] as const)(
    "returns stored mode %s for anonymous viewer",
    (mode) => {
      expect(
        resolveContentModeForSession(mode, null, sessionUuid, {
          user: null,
          sessionUuid: "22222222-2222-2222-2222-222222222222",
        }),
      ).toBe(mode);
    },
  );

  it("falls back to leader_resource for invalid stored mode", () => {
    expect(
      resolveContentModeForSession("bogus", null, sessionUuid, {
        user: null,
        sessionUuid: null,
      }),
    ).toBe("leader_resource");
  });
});

describe("isManualInsighterPairSwitch", () => {
  it("blocks switching between insighter and insighter_you", () => {
    expect(isManualInsighterPairSwitch("insighter", "insighter_you")).toBe(true);
    expect(isManualInsighterPairSwitch("insighter_you", "insighter")).toBe(true);
  });

  it("allows switching to other modes", () => {
    expect(isManualInsighterPairSwitch("leader_resource", "stressless")).toBe(false);
  });
});

describe("isAllowedMode", () => {
  it("accepts known modes only", () => {
    for (const mode of ALLOWED_MODES) {
      expect(isAllowedMode(mode)).toBe(true);
    }
    expect(isAllowedMode("unknown")).toBe(false);
  });
});
