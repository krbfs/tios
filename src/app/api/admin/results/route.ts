import { requireAdmin } from "@/lib/api/auth";
import { json } from "@/lib/api/http";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const user = await requireAdmin(request);
  if (user instanceof Response) {
    return user;
  }

  const results = await db.testResult.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      session: {
        include: {
          user: {
            select: { id: true, email: true },
          },
        },
      },
    },
    take: 200,
  });

  return json(
    results.map((result) => ({
      id: result.id,
      created_at: result.createdAt.toISOString(),
      psychotype_code: result.psychotypeCode,
      psychotype_secondary: result.psychotypeSecondary,
      mode: result.mode,
      avg_intensity: result.avgIntensity,
      validation_warnings: result.validationWarnings,
      user: result.session.user
        ? { id: result.session.user.id, email: result.session.user.email }
        : null,
      session_uuid: result.session.sessionUuid,
    })),
  );
}
