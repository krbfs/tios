import { requireAdmin } from "@/lib/api/auth";
import { error } from "@/lib/api/http";
import { db } from "@/lib/db";
import {
  buildAverageTeamProfile,
  buildCompatibilityMatrix,
  loadTeamParticipants,
  MAX_TEAM_RESULTS,
} from "@/lib/teams";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) {
    return admin;
  }

  const { id } = await context.params;
  const team = await db.team.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, email: true } },
    },
  });

  if (!team) {
    return error("Team not found", 404);
  }

  const participants = await loadTeamParticipants(id);
  const payload = {
    exported_at: new Date().toISOString(),
    team: {
      id: team.id,
      name: team.name,
      description: team.description,
      created_at: team.createdAt.toISOString(),
      created_by: team.createdBy.email,
      max_results: MAX_TEAM_RESULTS,
    },
    participants,
    compatibility_matrix: await buildCompatibilityMatrix(participants),
    average_profile: buildAverageTeamProfile(participants),
  };

  const filename = `team-${team.id}.json`;
  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
