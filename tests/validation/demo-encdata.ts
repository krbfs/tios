#!/usr/bin/env node
/**
 * Smoke-check demo encdata profile (landing / quiz/result link).
 * Usage: npm run verify:demo
 */
import { computeFromEncdata, DEMO_THRESHOLD_WARNINGS, getDemoEncdata } from "../../src/lib/encdata";

const encdata = getDemoEncdata();
process.env.TIOS_V1_PROFILES = "true";
const result = computeFromEncdata(encdata);

const checks: [string, boolean][] = [
  ["psychotype influencer", result.psychotype_code === "influencer"],
  ["triad right (V1 demo)", result.triad_variant === "right"],
  ["has scaled scores", Boolean(result.scaled_scores?.extraversion != null)],
  ["has systemic", Boolean(result.scaled_systemic?.LAB_work != null)],
  ["curated warnings", result.warnings?.length === DEMO_THRESHOLD_WARNINGS.length],
  ["filled radar", Object.values(result.scaled_scores ?? {}).filter((v) => v > 0).length >= 6],
  ["sorted scales", (result.sorted_personal_scales?.length ?? 0) === 8],
  ["leader scores", (result.leader_scores?.length ?? 0) === 4],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(ok ? `OK ${label}` : `FAIL ${label}`);
  if (!ok) failed += 1;
}

if (failed) {
  process.exit(1);
}

console.log("\nDemo encdata profile OK.");
