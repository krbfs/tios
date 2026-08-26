import { requireAdmin } from "@/lib/api/auth";
import { json } from "@/lib/api/http";
import { db } from "@/lib/db";
import { isAllowedMode } from "@/lib/modes";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const user = await requireAdmin(request);
  if (user instanceof Response) {
    return user;
  }

  const { searchParams } = new URL(request.url);
  const psychotype = searchParams.get("psychotype")?.trim();
  const mode = searchParams.get("mode")?.trim();
  const from = searchParams.get("from")?.trim();
  const to = searchParams.get("to")?.trim();

  const where: Prisma.TestResultWhereInput = {};
  if (psychotype) {
    where.psychotypeCode = psychotype;
  }
  if (mode && isAllowedMode(mode)) {
    where.mode = mode;
  }
  if (from || to) {
    where.createdAt = {};
    if (from) {
      const fromDate = new Date(from);
      if (!Number.isNaN(fromDate.getTime())) {
        where.createdAt.gte = fromDate;
      }
    }
    if (to) {
      const toDate = new Date(to);
      if (!Number.isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }
  }

  const results = await db.testResult.findMany({
    where,
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
      triad_variant: result.triadVariant,
      sub_index_s: result.subIndexS,
      sub_index_n: result.subIndexN,
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
