import { error, json } from "@/lib/api/http";
import { computeFromEncdata, buildResultUrl, canonicalizeEncdata } from "@/lib/encdata";
import { loadVisibleContentBlocks } from "@/lib/api/results";

export async function GET(request: Request) {
  const encdata = new URL(request.url).searchParams.get("encdata")?.trim();

  if (!encdata) {
    return error("encdata query parameter is required", 400);
  }

  try {
    const computed = computeFromEncdata(encdata);
    const canonical = canonicalizeEncdata(encdata);
    const blocks = await loadVisibleContentBlocks(
      computed.psychotype_code,
      "leader_resource",
      {},
    );

    return json({
      encdata: canonical,
      result_url: buildResultUrl(canonical),
      created_at: new Date().toISOString(),
      answers: computed.answers,
      scaled_scores: computed.scaled_scores,
      scaled_systemic: computed.scaled_systemic,
      sorted_personal_scales: computed.sorted_personal_scales,
      leader_scores: computed.leader_scores,
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
