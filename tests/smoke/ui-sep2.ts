#!/usr/bin/env tsx
/**
 * Smoke §7.2–7.4: clean/triad L/R/complex, empath subtypes, demo + /results shell.
 * Usage: TIOS_V1_PROFILES=true npm run smoke:ui
 */
import "dotenv/config";
import {
  fillAnswers,
  calculate_result,
  determine_empath_subtype,
} from "../../src/lib/calculations";
import { encodeAnswers, getDemoEncdata } from "../../src/lib/encdata";
import contentRegistry from "../../data/content_registry.json";
import {
  parseEfficiencyMap,
  parseLabeledSections,
  parsePortraitListItems,
  parseSentenceListItems,
  normalizePortraitContentText,
} from "../../public/js/block-templates.js";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

const BLOCK_EI = [1, 6, 11, 16, 21, 26, 31, 36, 41, 46, 51, 56, 61, 66, 71];
const BLOCK_TA = [2, 7, 12, 17, 22, 27, 32, 37, 42, 47, 52, 57, 62, 67, 72];
const BLOCK_SS = [3, 8, 13, 18, 23, 28, 33, 38, 43, 48, 53, 58, 63, 68, 73];
const BLOCK_LR = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75];
const EMPATH_S = [33, 38, 43, 63, 68, 73];
const EMPATH_N = [3, 8, 13, 18, 23, 28, 48, 53, 58];

function setBlock(answers: number[], ids: readonly number[], value: number) {
  for (const id of ids) {
    answers[id - 1] = value;
  }
}

type Expect = {
  psychotype_code?: string;
  triad_variant?: string | null;
  empath_subtype?: string | null;
};

type Case = { name: string; encdata: string; expect: Expect };

function assertFixture(name: string, answers: number[], expect: Expect) {
  const computed = calculate_result(answers, Array(75).fill(5));
  for (const [key, value] of Object.entries(expect)) {
    const actual =
      key === "empath_subtype"
        ? determine_empath_subtype(computed.sub_index_s, computed.sub_index_n)
        : computed[key as keyof typeof computed];
    if (actual !== value) {
      throw new Error(
        `Fixture ${name}: ${key}=${String(actual)} expected ${String(value)}`,
      );
    }
  }
}

function buildCases(): Case[] {
  process.env.TIOS_V1_PROFILES = "true";
  const cases: Case[] = [];

  const clean = fillAnswers(0);
  setBlock(clean, BLOCK_TA, 2);
  setBlock(clean, BLOCK_SS, 2);
  setBlock(clean, BLOCK_EI, 2);
  cases.push({
    name: "clean_individualist",
    encdata: encodeAnswers(clean),
    expect: { psychotype_code: "individualist", triad_variant: null },
  });

  const left = fillAnswers(0);
  setBlock(left, BLOCK_TA, 2);
  setBlock(left, BLOCK_SS, 2);
  setBlock(left, BLOCK_LR, 1);
  cases.push({
    name: "triad_left",
    encdata: encodeAnswers(left),
    expect: { psychotype_code: "individualist", triad_variant: "left" },
  });

  const right = fillAnswers(0);
  setBlock(right, BLOCK_TA, 2);
  setBlock(right, BLOCK_SS, 2);
  setBlock(right, BLOCK_EI, -2);
  cases.push({
    name: "triad_right",
    encdata: encodeAnswers(right),
    expect: { psychotype_code: "individualist", triad_variant: "right" },
  });

  const complexAnswers = fillAnswers(0);
  for (const id of BLOCK_EI) {
    complexAnswers[id - 1] = 1;
  }
  for (let i = 0; i < 10; i++) {
    complexAnswers[BLOCK_EI[i]! - 1] = -2;
  }
  for (let i = 10; i < 15; i++) {
    complexAnswers[BLOCK_EI[i]! - 1] = 2;
  }
  setBlock(complexAnswers, BLOCK_TA, -1);
  cases.push({
    name: "complex",
    encdata: encodeAnswers(complexAnswers),
    expect: { psychotype_code: "complex", triad_variant: null },
  });

  const guardian = fillAnswers(0);
  setBlock(guardian, BLOCK_EI, 2);
  setBlock(guardian, BLOCK_SS, -2);
  for (const id of EMPATH_S) {
    guardian[id - 1] = -2;
  }
  for (const id of EMPATH_N) {
    guardian[id - 1] = -2;
  }
  cases.push({
    name: "empath_guardian",
    encdata: encodeAnswers(guardian),
    expect: { psychotype_code: "empath", empath_subtype: "guardian" },
  });

  const creator = fillAnswers(0);
  setBlock(creator, BLOCK_EI, 2);
  for (const id of BLOCK_SS) {
    if (!EMPATH_N.includes(id)) {
      creator[id - 1] = -2;
    }
  }
  for (const id of EMPATH_S) {
    creator[id - 1] = -2;
  }
  cases.push({
    name: "empath_creator",
    encdata: encodeAnswers(creator),
    expect: { psychotype_code: "empath", empath_subtype: "creator" },
  });

  const systematic = fillAnswers(0);
  setBlock(systematic, BLOCK_EI, 2);
  for (const id of EMPATH_N) {
    systematic[id - 1] = -2;
  }
  for (const id of BLOCK_SS) {
    if (!EMPATH_S.includes(id) && !EMPATH_N.includes(id)) {
      systematic[id - 1] = -2;
    }
  }
  cases.push({
    name: "empath_systematic",
    encdata: encodeAnswers(systematic),
    expect: { psychotype_code: "empath", empath_subtype: "systematic" },
  });

  const noSubtype = fillAnswers(0);
  setBlock(noSubtype, BLOCK_EI, 2);
  for (const id of BLOCK_SS) {
    if (!EMPATH_S.includes(id) && !EMPATH_N.includes(id)) {
      noSubtype[id - 1] = -2;
    }
  }
  for (const id of EMPATH_S) {
    noSubtype[id - 1] = -1;
  }
  for (const id of EMPATH_N) {
    noSubtype[id - 1] = -1;
  }
  cases.push({
    name: "empath_no_subtype",
    encdata: encodeAnswers(noSubtype),
    expect: { psychotype_code: "empath", empath_subtype: null },
  });

  cases.push({
    name: "demo",
    encdata: getDemoEncdata(),
    expect: { psychotype_code: "influencer", triad_variant: "right" },
  });

  for (const testCase of cases) {
    if (testCase.name === "demo") {
      continue;
    }
    assertFixture(testCase.name, decodeFixture(testCase), testCase.expect);
  }

  return cases;
}

function decodeFixture(testCase: Case): number[] {
  // Rebuild from name — fixtures are deterministic builders above.
  switch (testCase.name) {
    case "clean_individualist": {
      const a = fillAnswers(0);
      setBlock(a, BLOCK_TA, 2);
      setBlock(a, BLOCK_SS, 2);
      setBlock(a, BLOCK_EI, 2);
      return a;
    }
    case "triad_left": {
      const a = fillAnswers(0);
      setBlock(a, BLOCK_TA, 2);
      setBlock(a, BLOCK_SS, 2);
      setBlock(a, BLOCK_LR, 1);
      return a;
    }
    case "triad_right": {
      const a = fillAnswers(0);
      setBlock(a, BLOCK_TA, 2);
      setBlock(a, BLOCK_SS, 2);
      setBlock(a, BLOCK_EI, -2);
      return a;
    }
    case "complex": {
      const a = fillAnswers(0);
      for (const id of BLOCK_EI) {
        a[id - 1] = 1;
      }
      for (let i = 0; i < 10; i++) {
        a[BLOCK_EI[i]! - 1] = -2;
      }
      for (let i = 10; i < 15; i++) {
        a[BLOCK_EI[i]! - 1] = 2;
      }
      setBlock(a, BLOCK_TA, -1);
      return a;
    }
    case "empath_guardian": {
      const a = fillAnswers(0);
      setBlock(a, BLOCK_EI, 2);
      setBlock(a, BLOCK_SS, -2);
      for (const id of EMPATH_S) {
        a[id - 1] = -2;
      }
      for (const id of EMPATH_N) {
        a[id - 1] = -2;
      }
      return a;
    }
    case "empath_creator": {
      const a = fillAnswers(0);
      setBlock(a, BLOCK_EI, 2);
      for (const id of BLOCK_SS) {
        if (!EMPATH_N.includes(id)) {
          a[id - 1] = -2;
        }
      }
      for (const id of EMPATH_S) {
        a[id - 1] = -2;
      }
      return a;
    }
    case "empath_systematic": {
      const a = fillAnswers(0);
      setBlock(a, BLOCK_EI, 2);
      for (const id of EMPATH_N) {
        a[id - 1] = -2;
      }
      for (const id of BLOCK_SS) {
        if (!EMPATH_S.includes(id) && !EMPATH_N.includes(id)) {
          a[id - 1] = -2;
        }
      }
      return a;
    }
    case "empath_no_subtype": {
      const a = fillAnswers(0);
      setBlock(a, BLOCK_EI, 2);
      for (const id of BLOCK_SS) {
        if (!EMPATH_S.includes(id) && !EMPATH_N.includes(id)) {
          a[id - 1] = -2;
        }
      }
      for (const id of EMPATH_S) {
        a[id - 1] = -1;
      }
      for (const id of EMPATH_N) {
        a[id - 1] = -1;
      }
      return a;
    }
    default:
      throw new Error(`Unknown fixture: ${testCase.name}`);
  }
}

const SUBTYPE_BLOCKS: Record<string, string> = {
  guardian: "empath_subtype_guardian",
  creator: "empath_subtype_creator",
  systematic: "empath_subtype_systematic",
};

async function checkApi(testCase: Case): Promise<string[]> {
  const url = `${BASE}/api/results/by-encdata?encdata=${encodeURIComponent(testCase.encdata)}`;
  const res = await fetch(url);
  const body = (await res.json()) as Record<string, unknown>;
  const fails: string[] = [];

  if (!res.ok) {
    fails.push(`HTTP ${res.status}`);
    return fails;
  }

  for (const [key, expected] of Object.entries(testCase.expect)) {
    if (body[key] !== expected) {
      fails.push(
        `${key}: got ${JSON.stringify(body[key])} expected ${JSON.stringify(expected)}`,
      );
    }
  }

  const blocks = (body.content_blocks || []) as Array<{
    block_key: string;
    triad_variant?: string | null;
  }>;
  const keys = blocks.map(
    (b) =>
      `${b.block_key}${b.triad_variant ? `(${b.triad_variant})` : ""}`,
  );

  if (testCase.expect.psychotype_code === "complex") {
    if (!keys.includes("complex_profile_message")) {
      fails.push("missing complex_profile_message");
    }
    if (!keys.includes("universal_techniques")) {
      fails.push("missing universal_techniques");
    }
    if (keys.includes("description_main")) {
      fails.push("complex must not include portrait");
    }
  } else if (testCase.expect.psychotype_code) {
    if (!keys.includes("key_formula")) {
      fails.push("missing key_formula");
    }
    if (!keys.includes("description_main")) {
      fails.push("missing description_main");
    }
  }

  if (
    testCase.expect.triad_variant === "left" ||
    testCase.expect.triad_variant === "right"
  ) {
    const triadKey = `triad_addition_${testCase.expect.triad_variant}`;
    if (!keys.some((k) => k.startsWith(triadKey))) {
      fails.push(`missing ${triadKey}`);
    }
  }

  if (
    testCase.expect.triad_variant === null &&
    testCase.expect.psychotype_code === "individualist"
  ) {
    if (keys.some((k) => k.includes("triad_addition"))) {
      fails.push("unexpected triad block");
    }
  }

  if (testCase.expect.empath_subtype) {
    const blockKey = SUBTYPE_BLOCKS[testCase.expect.empath_subtype];
    if (blockKey && !keys.includes(blockKey)) {
      fails.push(`missing ${blockKey}`);
    }
  }

  if (testCase.name === "empath_no_subtype") {
    if (keys.some((k) => k.startsWith("empath_subtype_"))) {
      fails.push("unexpected empath subtype block");
    }
  }

  return fails;
}

function checkPortraitRenderParse(): string[] {
  const fails: string[] = [];
  const types = [
    "individualist",
    "innovator",
    "influencer",
    "aesthete",
    "conservative",
    "empath",
    "analyst",
    "pragmatist",
  ];

  for (const code of types) {
    const blocks = contentRegistry.blocks.filter(
      (block) => block.psychotype_code === code,
    );

    const efficiency = blocks.find((block) => block.block_key === "efficiency_map");
    if (efficiency) {
      const map = parseEfficiencyMap(
        normalizePortraitContentText(efficiency.content_text),
      );
      if (!map.peak || !map.failure) {
        fails.push(`${code}: efficiency_map parse`);
      }
    }

    const energyLoss = blocks.find(
      (block) => block.block_key === "energy_loss_channels",
    );
    if (energyLoss) {
      const items =
        parsePortraitListItems(
          normalizePortraitContentText(energyLoss.content_text),
        ) ||
        parseSentenceListItems(
          normalizePortraitContentText(energyLoss.content_text),
        );
      if (!items || items.length < 3) {
        fails.push(`${code}: energy_loss list (${items?.length ?? 0})`);
      }
    }

    for (const key of ["energy_sources", "partnership"] as const) {
      const block = blocks.find((item) => item.block_key === key);
      if (!block) {
        fails.push(`${code}: missing ${key}`);
        continue;
      }
      const sections = parseLabeledSections(
        normalizePortraitContentText(block.content_text),
      );
      if (!sections || sections.length < 2) {
        fails.push(`${code}: ${key} labeled sections (${sections?.length ?? 0})`);
      }
    }
  }

  return fails;
}

async function checkResultsShell(): Promise<string[]> {
  const fails: string[] = [];
  const res = await fetch(`${BASE}/results`);
  if (res.status !== 200) {
    fails.push(`/results HTTP ${res.status}`);
    return fails;
  }
  const html = await res.text();
  const markers = [
    "block-templates.js",
    'id="content-blocks"',
    "content-block--key-formula",
    "content-block--triad",
    "content-block--complex",
    'id="empath-subindices"',
  ];
  for (const marker of markers) {
    if (!html.includes(marker)) {
      fails.push(`results.html missing ${marker}`);
    }
  }
  return fails;
}

async function main() {
  process.env.TIOS_V1_PROFILES = "true";
  const cases = buildCases();
  let failed = 0;

  console.log("\n=== §7.2 API: clean / triad L / triad R / complex ===");
  for (const name of [
    "clean_individualist",
    "triad_left",
    "triad_right",
    "complex",
  ]) {
    const testCase = cases.find((c) => c.name === name)!;
    const fails = await checkApi(testCase);
    const ok = fails.length === 0;
    console.log(ok ? "OK" : "FAIL", name, ok ? "" : fails.join("; "));
    if (!ok) {
      failed += 1;
      console.log(
        "  open:",
        `${BASE}/quiz/result?encdata=${encodeURIComponent(testCase.encdata)}`,
      );
    }
  }

  console.log("\n=== §7.3 API: empath subtypes ===");
  for (const name of [
    "empath_guardian",
    "empath_creator",
    "empath_systematic",
    "empath_no_subtype",
  ]) {
    const testCase = cases.find((c) => c.name === name)!;
    const fails = await checkApi(testCase);
    const ok = fails.length === 0;
    console.log(ok ? "OK" : "FAIL", name, ok ? "" : fails.join("; "));
    if (!ok) {
      failed += 1;
    }
  }

  console.log("\n=== §7.4 demo API ===");
  const demoFails = await checkApi(cases.find((c) => c.name === "demo")!);
  console.log(
    demoFails.length === 0 ? "OK" : "FAIL",
    "demo_encdata",
    demoFails.join("; "),
  );
  if (demoFails.length) {
    failed += 1;
  }

  console.log("\n=== §6.1 portrait block parse (8 types) ===");
  const parseFails = checkPortraitRenderParse();
  console.log(
    parseFails.length === 0 ? "OK" : "FAIL",
    "efficiency_map · lists · energy_sources · partnership",
    parseFails.join("; "),
  );
  if (parseFails.length) {
    failed += 1;
  }

  console.log("\n=== /results shell ===");
  const shellFails = await checkResultsShell();
  console.log(
    shellFails.length === 0 ? "OK" : "FAIL",
    "/results",
    shellFails.join("; "),
  );
  if (shellFails.length) {
    failed += 1;
  }

  console.log(`\nTOTAL FAILURES: ${failed}`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
