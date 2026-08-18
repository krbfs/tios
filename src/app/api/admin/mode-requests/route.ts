import { requireAdmin } from "@/lib/api/auth";
import { json } from "@/lib/api/http";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) {
    return admin;
  }

  const status = new URL(request.url).searchParams.get("status")?.trim();
  const where = status ? { status: status as "pending" | "approved" | "rejected" } : {};

  const requests = await db.modeRequest.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    include: {
      result: {
        select: {
          id: true,
          psychotypeCode: true,
          mode: true,
          createdAt: true,
          session: {
            select: {
              userId: true,
              sessionUuid: true,
            },
          },
        },
      },
    },
  });

  return json({
    requests: requests.map((item) => ({
      id: item.id,
      result_id: item.resultId,
      requested_mode: item.requestedMode,
      status: item.status,
      created_at: item.createdAt.toISOString(),
      resolved_at: item.resolvedAt?.toISOString() ?? null,
      admin_note: item.adminNote,
      psychotype_code: item.result.psychotypeCode,
      result_mode: item.result.mode,
      result_created_at: item.result.createdAt.toISOString(),
    })),
  });
}
