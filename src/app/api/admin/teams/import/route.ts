import { requireAdmin } from "@/lib/api/auth";
import { error, json, parseJson } from "@/lib/api/http";
import { db } from "@/lib/db";
import { MAX_TEAM_RESULTS } from "@/lib/teams";

type ImportBody = {
  team?: {
    name?: string;
    description?: string | null;
  };
  participants?: Array<{
    result_id?: string;
    label?: string | null;
  }>;
};

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) {
    return admin;
  }

  const body = await parseJson<ImportBody>(request);
  if (body instanceof Response) {
    return body;
  }

  const name = body.team?.name?.trim();
  if (!name) {
    return error("team.name is required", 400);
  }

  const participants = Array.isArray(body.participants) ? body.participants : [];
  if (participants.length > MAX_TEAM_RESULTS) {
    return error(`Cannot import more than ${MAX_TEAM_RESULTS} results`, 400);
  }

  const resultIds = participants
    .map((item) => item.result_id?.trim())
    .filter((value): value is string => Boolean(value));

  if (resultIds.length !== new Set(resultIds).size) {
    return error("Duplicate result_id in import payload", 400);
  }

  if (resultIds.length > 0) {
    const existingResults = await db.testResult.findMany({
      where: { id: { in: resultIds } },
      select: { id: true },
    });

    if (existingResults.length !== resultIds.length) {
      return error("One or more result_id values were not found", 400);
    }
  }

  const created = await db.$transaction(async (tx) => {
    const team = await tx.team.create({
      data: {
        name,
        description: body.team?.description?.trim() || null,
        createdById: admin.id,
      },
    });

    await tx.teamMember.create({
      data: {
        teamId: team.id,
        userId: admin.id,
        role: "captain",
        joinedAt: new Date(),
      },
    });

    for (const item of participants) {
      const resultId = item.result_id?.trim();
      if (!resultId) {
        continue;
      }

      await tx.teamResultEntry.create({
        data: {
          teamId: team.id,
          resultId,
          label: item.label?.trim() || null,
        },
      });
    }

    return team;
  });

  return json(
    {
      id: created.id,
      name: created.name,
      description: created.description,
      imported_results: resultIds.length,
    },
    201,
  );
}
