import { requireAuth } from "@/lib/api/auth";
import { json } from "@/lib/api/http";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const user = await requireAuth(request);
  if (user instanceof Response) {
    return user;
  }

  const results = await db.testResult.findMany({
    where: {
      session: { userId: user.id },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      psychotypeCode: true,
      psychotypeSecondary: true,
      mode: true,
      avgIntensity: true,
    },
  });

  return json(
    results.map((result) => ({
      id: result.id,
      date_time: result.createdAt.toISOString(),
      psychotype_code: result.psychotypeCode,
      psychotype_secondary: result.psychotypeSecondary,
      mode: result.mode,
      avg_intensity: result.avgIntensity,
    })),
  );
}
