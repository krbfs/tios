import { requireAuth } from "@/lib/api/auth";
import { error, json, parseJson } from "@/lib/api/http";
import { db } from "@/lib/db";

type AcceptBody = { token?: string };

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export async function POST(request: Request) {
  const user = await requireAuth(request);
  if (user instanceof Response) {
    return user;
  }

  const body = await parseJson<AcceptBody>(request);
  if (body instanceof Response) {
    return body;
  }

  const token = body.token?.trim();
  if (!token) {
    return error("token is required", 400);
  }

  const invitation = await db.teamMember.findUnique({
    where: { invitationToken: token },
    include: { team: { select: { id: true, name: true } } },
  });

  if (!invitation) {
    return error("Invitation not found", 404);
  }

  if (invitation.joinedAt && invitation.userId) {
    return json({
      team_id: invitation.teamId,
      team_name: invitation.team.name,
      status: "already_joined",
    });
  }

  const inviteEmail = invitation.invitationEmail
    ? normalizeEmail(invitation.invitationEmail)
    : null;

  if (!inviteEmail || normalizeEmail(user.email) !== inviteEmail) {
    return error("Invitation email does not match your account", 403);
  }

  const updated = await db.teamMember.update({
    where: { id: invitation.id },
    data: {
      userId: user.id,
      joinedAt: new Date(),
    },
  });

  return json({
    team_id: updated.teamId,
    team_name: invitation.team.name,
    status: "joined",
  });
}
