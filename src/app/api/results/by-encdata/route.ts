import { error, json } from "@/lib/api/http";
import {
  assertPublicEncdata,
  computeFromEncdata,
  buildResultUrl,
  canonicalizeEncdata,
  isDemoEncdata,
  upgradeLegacyDemoEncdata,
} from "@/lib/encdata";
import { loadVisibleContentBlocks } from "@/lib/api/results";
import {
  empathSubtypeBlockKey,
  determine_empath_subtype,
  EMPATH_SUBTYPE_LABELS,
} from "@/lib/calculations";
import { logAntibotEvent } from "@/lib/antibot-log";
import { rejectIfBlockedIp } from "@/lib/ip-blocklist";
import { clientIp, consumeRateLimit } from "@/lib/test-access";

const BY_ENCDATA_LIMIT = 60;
const WINDOW_MS = 60 * 60 * 1000;

export async function GET(request: Request) {
  const blocked = await rejectIfBlockedIp(request);
  if (blocked) return blocked;

  const ip = clientIp(request);
  const limited = consumeRateLimit(
    `results:by-encdata:${ip}`,
    BY_ENCDATA_LIMIT,
    WINDOW_MS,
  );
  if (!limited.ok) {
    const response = error("Too many requests. Try again later.", 429);
    logAntibotEvent(request, {
      event: "rate_limit",
      status: 429,
      reason: "Too many requests",
      kind: "by-encdata",
      retry_after_sec: limited.retryAfterSec,
    });
    return response;
  }

  const encdataRaw = new URL(request.url).searchParams.get("encdata")?.trim();

  if (!encdataRaw) {
    return error("encdata query parameter is required", 400);
  }

  const encdata = upgradeLegacyDemoEncdata(encdataRaw);

  try {
    assertPublicEncdata(encdataRaw);
    const computed = computeFromEncdata(encdata);
    const canonical = canonicalizeEncdata(encdata);
    const isDemo = isDemoEncdata(canonical);
    const empathSubtype =
      computed.psychotype_code === "empath"
        ? determine_empath_subtype(computed.sub_index_s, computed.sub_index_n)
        : null;
    const blocks = await loadVisibleContentBlocks(
      computed.psychotype_code,
      "leader_resource",
      {},
      computed.triad_variant,
      empathSubtypeBlockKey(empathSubtype),
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
      triad_variant: computed.triad_variant,
      triad_status: computed.triad_status,
      sub_index_s: computed.sub_index_s,
      sub_index_n: computed.sub_index_n,
      empath_subtype: empathSubtype,
      empath_subtype_label: empathSubtype
        ? EMPATH_SUBTYPE_LABELS[empathSubtype]
        : null,
      avg_intensity: computed.avg_intensity,
      expression_level: computed.expression_level,
      validation_warnings: computed.validation_warnings,
      warnings: computed.warnings,
      mode: "leader_resource",
      content_mode: "leader_resource",
      admin_comment: null,
      content_blocks: blocks,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid encdata";
    if (/unsigned|Invalid or unsigned/i.test(message)) {
      logAntibotEvent(request, {
        event: "unsigned_encdata",
        status: 400,
        reason: message,
        kind: "by-encdata",
      });
    }
    return error(message, 400);
  }
}
