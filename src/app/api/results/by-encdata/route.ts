import { error, json } from "@/lib/api/http";
import {
  assertPublicEncdata,
  computeFromEncdata,
  buildResultUrl,
  canonicalizeEncdata,
  isDemoEncdata,
} from "@/lib/encdata";
import { loadVisibleContentBlocks } from "@/lib/api/results";
import { clientIp, consumeRateLimit } from "@/lib/test-access";

const BY_ENCDATA_LIMIT = 60;
const WINDOW_MS = 60 * 60 * 1000;

export async function GET(request: Request) {
  const ip = clientIp(request);
  const limited = consumeRateLimit(
    `results:by-encdata:${ip}`,
    BY_ENCDATA_LIMIT,
    WINDOW_MS,
  );
  if (!limited.ok) {
    return error("Too many requests. Try again later.", 429);
  }

  const encdata = new URL(request.url).searchParams.get("encdata")?.trim();

  if (!encdata) {
    return error("encdata query parameter is required", 400);
  }

  try {
    assertPublicEncdata(encdata);
    const computed = computeFromEncdata(encdata);
    const canonical = canonicalizeEncdata(encdata);
    const isDemo = isDemoEncdata(canonical);
    const blocks = await loadVisibleContentBlocks(
      computed.psychotype_code,
      "leader_resource",
      {},
    );

    return json({
      encdata: canonical,
      result_url: buildResultUrl(canonical),
      is_demo: isDemo,
      ...(isDemo ? {} : { created_at: new Date().toISOString() }),
      scaled_scores: computed.scaled_scores,
      scaled_systemic: computed.scaled_systemic,
      sorted_personal_scales: computed.sorted_personal_scales,
      leader_scores: computed.leader_scores,
      coaching_recommendations: computed.coaching_recommendations,
      psychotype_code: computed.psychotype_code,
      psychotype_secondary: computed.psychotype_secondary,
      avg_intensity: computed.avg_intensity,
      validation_warnings: computed.validation_warnings,
      warnings: computed.warnings,
      mode: "leader_resource",
      content_mode: "leader_resource",
      admin_comment: null,
      content_blocks: blocks,
    });
  } catch (err) {
    return error(err instanceof Error ? err.message : "Invalid encdata", 400);
  }
}
