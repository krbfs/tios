import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    blockedIp: {
      findMany,
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { rejectIfBlockedIp, invalidateBlockedIpCache } from "@/lib/ip-blocklist";

describe("ip-blocklist", () => {
  beforeEach(() => {
    invalidateBlockedIpCache();
    findMany.mockReset();
  });

  afterEach(() => {
    invalidateBlockedIpCache();
    vi.restoreAllMocks();
  });

  it("returns 403 for blocked IP", async () => {
    findMany.mockResolvedValue([{ ip: "203.0.113.10" }]);
    const request = new Request("http://localhost/api/test/start", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    });

    const response = await rejectIfBlockedIp(request);
    expect(response?.status).toBe(403);
  });

  it("allows non-blocked IP", async () => {
    findMany.mockResolvedValue([]);
    const request = new Request("http://localhost/api/test/start", {
      headers: { "x-forwarded-for": "198.51.100.1" },
    });

    const response = await rejectIfBlockedIp(request);
    expect(response).toBeNull();
  });

  it("uses cached blocklist within TTL", async () => {
    findMany.mockResolvedValue([{ ip: "203.0.113.10" }]);
    const request = new Request("http://localhost/api/test/start", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    });

    await rejectIfBlockedIp(request);
    await rejectIfBlockedIp(request);
    expect(findMany).toHaveBeenCalledOnce();
  });
});
