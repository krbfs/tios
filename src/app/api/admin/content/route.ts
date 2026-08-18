import { requireAdmin } from "@/lib/api/auth";
import { listAdminContentBlocks } from "@/lib/api/content";
import { json } from "@/lib/api/http";
import { isAllowedMode } from "@/lib/modes";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) {
    return admin;
  }

  const { searchParams } = new URL(request.url);
  const psychotypeCode = searchParams.get("psychotype")?.trim();
  const mode = searchParams.get("mode")?.trim();

  const blocks = await listAdminContentBlocks({
    psychotypeCode: psychotypeCode || undefined,
    mode: mode && isAllowedMode(mode) ? mode : undefined,
  });

  return json(blocks);
}
