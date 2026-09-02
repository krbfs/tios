import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { hashPassword } from "@/lib/api/auth";
import { apiRequest, readJson } from "@/test/helpers/request";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: mocks.findUnique },
    testSession: { updateMany: mocks.updateMany },
  },
}));

import { POST } from "@/app/api/auth/login/route";

describe("POST /api/auth/login", () => {
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await hashPassword("password123");
  });

  beforeEach(() => {
    mocks.findUnique.mockReset();
    mocks.updateMany.mockReset();
    mocks.updateMany.mockResolvedValue({ count: 0 });
  });

  it("returns 400 when email or password missing", async () => {
    const response = await POST(
      apiRequest("/api/auth/login", { method: "POST", json: { email: "a@b.c" } }),
    );

    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({
      error: "email and password are required",
    });
  });

  it("returns 401 for unknown user", async () => {
    mocks.findUnique.mockResolvedValue(null);

    const response = await POST(
      apiRequest("/api/auth/login", {
        method: "POST",
        json: { email: "missing@test.local", password: "password123" },
      }),
    );

    expect(response.status).toBe(401);
    expect(await readJson(response)).toEqual({ error: "Invalid credentials" });
  });

  it("returns access token for valid credentials", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@test.local",
      role: "user",
      passwordHash,
    });

    const response = await POST(
      apiRequest("/api/auth/login", {
        method: "POST",
        json: { email: "user@test.local", password: "password123" },
        headers: { "x-session-uuid": "11111111-1111-1111-1111-111111111111" },
      }),
    );

    expect(response.status).toBe(200);
    const payload = await readJson<{
      access_token: string;
      token_type: string;
      user: { id: string; email: string; role: string };
    }>(response);

    expect(payload.token_type).toBe("Bearer");
    expect(payload.access_token.length).toBeGreaterThan(20);
    expect(payload.user).toEqual({
      id: "user-1",
      email: "user@test.local",
      role: "user",
    });
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        sessionUuid: "11111111-1111-1111-1111-111111111111",
        userId: null,
      },
      data: { userId: "user-1" },
    });
  });
});
