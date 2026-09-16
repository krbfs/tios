#!/usr/bin/env node
/**
 * Smoke-check demo encdata profile (landing / quiz/result link).
 * Usage: npm run verify:demo
 */
import {
  computeFromEncdata,
  DEMO_THRESHOLD_WARNINGS,
  DEMO_V1_PROFILE_EXPECTATION,
  getDemoEncdata,
  getDemoResultHref,
} from "../../src/lib/encdata";
import { DEMO_RESULT_HREF } from "../../src/lib/demo-links";

const encdata = getDemoEncdata();
process.env.TIOS_V1_PROFILES = "true";
const result = computeFromEncdata(encdata);

const checks: [string, boolean][] = [
  ["demo menu href in sync", DEMO_RESULT_HREF === getDemoResultHref()],
  [
    "psychotype influencer",
    result.psychotype_code === DEMO_V1_PROFILE_EXPECTATION.psychotype_code,
  ],
  [
    "V1 profile_complexity pure",
    result.profile_complexity === DEMO_V1_PROFILE_EXPECTATION.profile_complexity,
  ],
  [
    "V1 cascade level 1",
    result.cascade_level_used === DEMO_V1_PROFILE_EXPECTATION.cascade_level_used,
  ],
  [
    "V1 primary_type",
    (result.primary_type ?? result.psychotype_code) ===
      DEMO_V1_PROFILE_EXPECTATION.primary_type,
  ],
  [
    "triad right (V1 demo)",
    result.triad_variant === DEMO_V1_PROFILE_EXPECTATION.triad_variant,
  ],
  [
    "triad stable",
    result.triad_status === DEMO_V1_PROFILE_EXPECTATION.triad_status,
  ],
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
