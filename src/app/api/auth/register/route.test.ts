import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest, readJson } from "@/test/helpers/request";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mocks.findUnique,
      create: mocks.create,
    },
  },
}));

import { POST } from "./route";

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    mocks.findUnique.mockReset();
    mocks.create.mockReset();
  });

  it("returns 400 for short password", async () => {
    const response = await POST(
      apiRequest("/api/auth/register", {
        method: "POST",
        json: { email: "new@test.local", password: "short" },
      }),
    );

    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({
      error: "password must be at least 8 characters",
    });
  });

  it("returns 409 when email already exists", async () => {
    mocks.findUnique.mockResolvedValue({ id: "existing" });

    const response = await POST(
      apiRequest("/api/auth/register", {
        method: "POST",
        json: { email: "existing@test.local", password: "password123" },
      }),
    );

    expect(response.status).toBe(409);
    expect(await readJson(response)).toEqual({
      error: "User with this email already exists",
    });
  });

  it("creates a user", async () => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.create.mockResolvedValue({
      id: "user-new",
      email: "new@test.local",
      role: "user",
      createdAt: new Date("2026-08-14T10:00:00.000Z"),
    });

    const response = await POST(
      apiRequest("/api/auth/register", {
        method: "POST",
        json: { email: "New@Test.Local", password: "password123" },
      }),
    );

    expect(response.status).toBe(201);
    expect(await readJson(response)).toEqual({
      id: "user-new",
      email: "new@test.local",
      role: "user",
      created_at: "2026-08-14T10:00:00.000Z",
    });
    expect(mocks.create).toHaveBeenCalledOnce();
  });
});
