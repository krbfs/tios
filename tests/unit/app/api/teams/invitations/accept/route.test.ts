import { beforeEach, describe, expect, it, vi } from "vitest";

import { signAccessToken } from "@/lib/api/auth";
import { apiRequest, readJson, withBearer } from "@/test/helpers/request";

const mocks = vi.hoisted(() => ({
  teamFindFirst: vi.fn(),
  teamFindUnique: vi.fn(),
  teamMemberFindFirst: vi.fn(),
  teamMemberFindUnique: vi.fn(),
  userFindUnique: vi.fn(),
  teamMemberCreate: vi.fn(),
  teamMemberUpdate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    team: {
      findFirst: mocks.teamFindFirst,
      findUnique: mocks.teamFindUnique,
    },
    teamMember: {
      findFirst: mocks.teamMemberFindFirst,
      findUnique: mocks.teamMemberFindUnique,
      create: mocks.teamMemberCreate,
      update: mocks.teamMemberUpdate,
    },
    user: {
      findUnique: mocks.userFindUnique,
    },
  },
}));

import { POST as acceptInvitation } from "@/app/api/teams/invitations/accept/route";
import { POST as inviteMember } from "@/app/api/teams/[id]/invite/route";

describe("team member invitations", () => {
  const teamContext = { params: Promise.resolve({ id: "team-1" }) };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates invitation for new email", async () => {
    mocks.teamFindFirst.mockResolvedValue({ id: "team-1" });
    mocks.teamFindUnique.mockResolvedValue({ id: "team-1" });
    mocks.teamMemberFindFirst.mockResolvedValue(null);
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.teamMemberCreate.mockResolvedValue({
      id: "member-1",
      invitationEmail: "peer@test.local",
      invitationToken: "11111111-1111-1111-1111-111111111111",
      joinedAt: null,
    });

    const token = await signAccessToken({
      id: "owner-1",
      email: "owner@test.local",
      role: "user",
    });

    const response = await inviteMember(
      withBearer(
        token,
        apiRequest("/api/teams/team-1/invite", {
          method: "POST",
          json: { email: "peer@test.local" },
        }),
      ),
      teamContext,
    );

    expect(response.status).toBe(201);
    expect(await readJson(response)).toMatchObject({
      invitation_email: "peer@test.local",
      joined: false,
    });
  });

  it("accepts invitation when emails match", async () => {
    mocks.teamMemberFindUnique.mockResolvedValue({
      id: "member-1",
      teamId: "team-1",
      userId: null,
      joinedAt: null,
      invitationEmail: "peer@test.local",
      team: { id: "team-1", name: "Alpha" },
    });
    mocks.teamMemberUpdate.mockResolvedValue({
      id: "member-1",
      teamId: "team-1",
      userId: "peer-1",
      joinedAt: new Date("2026-08-18T12:00:00.000Z"),
    });

    const token = await signAccessToken({
      id: "peer-1",
      email: "peer@test.local",
      role: "user",
    });

    const response = await acceptInvitation(
      withBearer(
        token,
        apiRequest("/api/teams/invitations/accept", {
          method: "POST",
          json: { token: "11111111-1111-1111-1111-111111111111" },
        }),
      ),
    );

    expect(response.status).toBe(200);
    expect(await readJson(response)).toMatchObject({
      team_id: "team-1",
      team_name: "Alpha",
      status: "joined",
    });
  });
});
