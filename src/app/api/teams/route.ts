import { requireAuth } from "@/lib/api/auth";
import { error, json, parseJson } from "@/lib/api/http";
import { db } from "@/lib/db";

type CreateTeamBody = {
  name?: string;
  description?: string;
};

export async function GET(request: Request) {
  const user = await requireAuth(request);
  if (user instanceof Response) {
    return user;
  }

  const teams = await db.team.findMany({
    where: {
      OR: [{ createdById: user.id }, { members: { some: { userId: user.id } } }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { results: true, members: true } },
    },
  });

  return json(
    teams.map((team) => ({
      id: team.id,
      name: team.name,
      description: team.description,
      created_at: team.createdAt.toISOString(),
      result_count: team._count.results,
      member_count: team._count.members,
      is_owner: team.createdById === user.id,
    })),
  );
}

export async function POST(request: Request) {
  const user = await requireAuth(request);
  if (user instanceof Response) {
    return user;
  }

  const body = await parseJson<CreateTeamBody>(request);
  if (body instanceof Response) {
    return body;
  }

  const name = body.name?.trim();
  if (!name) {
    return error("name is required", 400);
  }

  const team = await db.$transaction(async (tx) => {
    const created = await tx.team.create({
      data: {
        name,
        description: body.description?.trim() || null,
        createdById: user.id,
      },
    });

    await tx.teamMember.create({
      data: {
        teamId: created.id,
        userId: user.id,
        role: "captain",
        joinedAt: new Date(),
      },
    });

    return created;
  });

  return json(
    {
      id: team.id,
      name: team.name,
      description: team.description,
      created_at: team.createdAt.toISOString(),
    },
    201,
  );
}
