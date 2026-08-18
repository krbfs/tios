import { requireAuth } from "@/lib/api/auth";
import { error, json, parseJson } from "@/lib/api/http";
import { canAccessResult, getResultWithSession } from "@/lib/api/results";
import { db } from "@/lib/db";
import {
  buildAverageTeamProfile,
  buildCompatibilityMatrix,
  loadTeamParticipants,
  MAX_TEAM_RESULTS,
  userCanAccessTeam,
} from "@/lib/teams";

type RouteContext = { params: Promise<{ id: string }> };
type AddResultBody = { result_id?: string; label?: string };

export async function GET(request: Request, context: RouteContext) {
  const user = await requireAuth(request);
  if (user instanceof Response) {
    return user;
  }

  const { id } = await context.params;
  const allowed = await userCanAccessTeam(id, user.id, user.role);
  if (!allowed) {
    return error("Forbidden", 403);
  }

  const team = await db.team.findUnique({
    where: { id },
    include: {
      results: {
        orderBy: { addedAt: "asc" },
        select: {
          id: true,
          resultId: true,
          label: true,
          addedAt: true,
        },
      },
    },
  });

  if (!team) {
    return error("Team not found", 404);
  }

  const participants = await loadTeamParticipants(id);
  const compatibility_matrix = await buildCompatibilityMatrix(participants);
  const average_profile = buildAverageTeamProfile(participants);

  return json({
    id: team.id,
    name: team.name,
    description: team.description,
    created_at: team.createdAt.toISOString(),
    participants,
    compatibility_matrix,
    average_profile,
    max_results: MAX_TEAM_RESULTS,
  });
}

export async function POST(request: Request, context: RouteContext) {
  const user = await requireAuth(request);
  if (user instanceof Response) {
    return user;
  }

  const { id: teamId } = await context.params;
  const allowed = await userCanAccessTeam(teamId, user.id, user.role);
  if (!allowed) {
    return error("Forbidden", 403);
  }

  const body = await parseJson<AddResultBody>(request);
  if (body instanceof Response) {
    return body;
  }

  const resultId = body.result_id?.trim();
  if (!resultId) {
    return error("result_id is required", 400);
  }

  const team = await db.team.findUnique({
    where: { id: teamId },
    include: { _count: { select: { results: true } } },
  });

  if (!team) {
    return error("Team not found", 404);
  }

  if (team._count.results >= MAX_TEAM_RESULTS) {
    return error(`Team cannot contain more than ${MAX_TEAM_RESULTS} results`, 400);
  }

  const result = await getResultWithSession(resultId);
  if (!result) {
    return error("Result not found", 404);
  }

  const sessionUuid = request.headers.get("x-session-uuid");
  const canUse = await canAccessResult(result, user, sessionUuid);
  if (!canUse) {
    return error("Forbidden", 403);
  }

  const existing = await db.teamResultEntry.findUnique({
    where: {
      teamId_resultId: { teamId, resultId },
    },
  });

  if (existing) {
    return error("Result already added to this team", 409);
  }

  const entry = await db.teamResultEntry.create({
    data: {
      teamId,
      resultId,
      label: body.label?.trim() || null,
    },
  });

  return json(
    {
      id: entry.id,
      team_id: entry.teamId,
      result_id: entry.resultId,
      label: entry.label,
      added_at: entry.addedAt.toISOString(),
    },
    201,
  );
}
