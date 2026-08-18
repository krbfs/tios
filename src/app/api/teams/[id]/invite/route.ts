import { randomUUID } from "node:crypto";

import { requireAuth } from "@/lib/api/auth";
import { error, json, parseJson } from "@/lib/api/http";
import { db } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };
type InviteBody = { email?: string };

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

async function userCanInviteToTeam(teamId: string, userId: string, role: string) {
  if (role === "admin") {
    return true;
  }

  const team = await db.team.findFirst({
    where: {
      id: teamId,
      OR: [
        { createdById: userId },
        { members: { some: { userId, role: "captain" } } },
      ],
    },
    select: { id: true },
  });

  return Boolean(team);
}

export async function POST(request: Request, context: RouteContext) {
  const user = await requireAuth(request);
  if (user instanceof Response) {
    return user;
  }

  const { id: teamId } = await context.params;
  const canInvite = await userCanInviteToTeam(teamId, user.id, user.role);
  if (!canInvite) {
    return error("Forbidden", 403);
  }

  const body = await parseJson<InviteBody>(request);
  if (body instanceof Response) {
    return body;
  }

  const email = body.email ? normalizeEmail(body.email) : "";
  if (!email || !email.includes("@")) {
    return error("Valid email is required", 400);
  }

  const team = await db.team.findUnique({
    where: { id: teamId },
    select: { id: true },
  });

  if (!team) {
    return error("Team not found", 404);
  }

  const existingMember = await db.teamMember.findFirst({
    where: {
      teamId,
      OR: [{ invitationEmail: email }, { user: { email } }],
    },
  });

  if (existingMember) {
    return error("User is already invited or is a team member", 409);
  }

  const invitedUser = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  const invitationToken = randomUUID();
  const member = await db.teamMember.create({
    data: {
      teamId,
      userId: invitedUser?.id ?? null,
      invitationEmail: email,
      invitationToken,
      joinedAt: invitedUser ? new Date() : null,
      role: "member",
    },
  });

  return json(
    {
      id: member.id,
      invitation_email: member.invitationEmail,
      invitation_token: member.invitationToken,
      joined: Boolean(member.joinedAt),
      invite_path: `/teams/accept.html?token=${member.invitationToken}`,
    },
    201,
  );
}
