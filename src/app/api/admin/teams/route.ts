import { requireAdmin } from "@/lib/api/auth";
import { json } from "@/lib/api/http";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) {
    return admin;
  }

  const teams = await db.team.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, email: true } },
      _count: { select: { results: true, members: true } },
    },
  });

  return json(
    teams.map((team) => ({
      id: team.id,
      name: team.name,
      description: team.description,
      created_at: team.createdAt.toISOString(),
      created_by: team.createdBy.email,
      result_count: team._count.results,
      member_count: team._count.members,
    })),
  );
}
