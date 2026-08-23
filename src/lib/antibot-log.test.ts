import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ANTIBOT_LOG_MARKER, logAntibotEvent } from "@/lib/antibot-log";

describe("antibot-log", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VITEST", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("writes structured JSON with marker", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const request = new Request("http://localhost/api/test/start", {
      method: "POST",
      headers: {
        "x-forwarded-for": "203.0.113.10",
        "user-agent": "curl/8.0",
      },
    });

    logAntibotEvent(request, {
      event: "rate_limit",
      status: 429,
      reason: "Too many requests",
      kind: "start",
    });

    expect(warn).toHaveBeenCalledOnce();
    const payload = JSON.parse(String(warn.mock.calls[0][0]));
    expect(payload.message).toBe(ANTIBOT_LOG_MARKER);
    expect(payload.event).toBe("rate_limit");
    expect(payload.ip).toBe("203.0.113.10");
    expect(payload.status).toBe(429);
    expect(payload.kind).toBe("start");
  });

  it("skips logging under vitest", () => {
    vi.stubEnv("VITEST", "true");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    logAntibotEvent(new Request("http://localhost/api/test/start"), {
      event: "honeypot",
      status: 200,
      reason: "filled",
    });
    expect(warn).not.toHaveBeenCalled();
  });
});
