import { describe, expect, it } from "vitest";

import {
  getAuthUser,
  requireAdmin,
  requireAuth,
  signAccessToken,
} from "@/lib/api/auth";
import { apiRequest, readJson, withBearer } from "@/test/helpers/request";

describe("auth helpers", () => {
  it("signs and verifies access tokens", async () => {
    const user = {
      id: "user-1",
      email: "user@test.local",
      role: "user" as const,
    };
    const token = await signAccessToken(user);
    const request = withBearer(token, apiRequest("/api/test"));
    const authUser = await getAuthUser(request);

    expect(authUser).toEqual(user);
  });

  it("requireAuth returns 401 without token", async () => {
    const response = await requireAuth(apiRequest("/api/results/history"));
    expect(response).toBeInstanceOf(Response);
    if (response instanceof Response) {
      expect(response.status).toBe(401);
      expect(await readJson(response)).toEqual({ error: "Unauthorized" });
    }
  });

  it("requireAdmin returns 403 for non-admin", async () => {
    const token = await signAccessToken({
      id: "user-1",
      email: "user@test.local",
      role: "user",
    });
    const response = await requireAdmin(
      withBearer(token, apiRequest("/api/admin/results")),
    );

    expect(response).toBeInstanceOf(Response);
    if (response instanceof Response) {
      expect(response.status).toBe(403);
      expect(await readJson(response)).toEqual({ error: "Forbidden" });
    }
  });

  it("requireAdmin accepts admin role", async () => {
    const token = await signAccessToken({
      id: "admin-1",
      email: "admin@test.local",
      role: "admin",
    });
    const user = await requireAdmin(
      withBearer(token, apiRequest("/api/admin/results")),
    );

    expect(user).toEqual({
      id: "admin-1",
      email: "admin@test.local",
      role: "admin",
    });
  });
});
