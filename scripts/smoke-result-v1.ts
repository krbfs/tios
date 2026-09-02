#!/usr/bin/env tsx
import "dotenv/config";
import {
  fillAnswers,
  calculate_result,
  determine_empath_subtype,
} from "../src/lib/calculations";
import { encodeAnswers, getDemoEncdata } from "../src/lib/encdata";

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

async function checkCase(name: string, encdata: string) {
  const url = `http://localhost:3000/api/results/by-encdata?encdata=${encodeURIComponent(encdata)}`;
  const res = await fetch(url);
  const body = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    console.log(`\n=== ${name} FAIL HTTP ${res.status} ===`);
    console.log(body);
    return null;
  }

  const blocks = (body.content_blocks || []) as Array<{
    block_key: string;
    triad_variant?: string | null;
    title?: string;
  }>;
  const keys = blocks.map(
    (b) => `${b.block_key}${b.triad_variant ? `(${b.triad_variant})` : ""}`,
  );

  console.log(`\n=== ${name} ===`);
  console.log("psychotype:", body.psychotype_code);
  console.log("triad_variant:", body.triad_variant);
  console.log("sub_index_s/n:", body.sub_index_s, body.sub_index_n);
  console.log(
    "empath_subtype:",
    body.empath_subtype,
    body.empath_subtype_label ?? "",
  );
  console.log("blocks:", keys.length, "→", keys.join(", "));
  console.log(
    "has triad:",
    keys.some((k) => k.includes("triad_addition")),
  );
  console.log("has key_formula:", keys.includes("key_formula"));
  console.log(
    "open:",
    `http://localhost:3000/quiz/result?encdata=${encodeURIComponent(encdata)}`,
  );
  return body;
}

async function main() {
  process.env.TIOS_V1_PROFILES = "true";

  const ind = fillAnswers(0);
  setBlock(ind, BLOCK_TA, 2);
  setBlock(ind, BLOCK_SS, 2);
  setBlock(ind, BLOCK_LR, 2);
  const indComputed = calculate_result(ind, Array(75).fill(5));
  console.log(
    "calc individualist:",
    indComputed.psychotype_code,
    "triad:",
    indComputed.triad_variant,
  );
  await checkCase("individualist+triad", encodeAnswers(ind));

  const emp = fillAnswers(0);
  setBlock(emp, BLOCK_SS, -2);
  setBlock(emp, BLOCK_EI, 2);
  for (const id of EMPATH_S) emp[id - 1] = -2;
  for (const id of EMPATH_N) emp[id - 1] = -2;
  const empComputed = calculate_result(emp, Array(75).fill(5));
  console.log(
    "calc empath:",
    empComputed.psychotype_code,
    "S/N:",
    empComputed.sub_index_s,
    empComputed.sub_index_n,
    "subtype:",
    determine_empath_subtype(empComputed.sub_index_s, empComputed.sub_index_n),
  );
  await checkCase("empath+guardian", encodeAnswers(emp));

  // EXT 20 + INT 18 + ANX 16 — no adjacent pair in top-3 → complex
  const cx = fillAnswers(0);
  for (const id of BLOCK_EI) cx[id - 1] = 1;
  for (let i = 0; i < 10; i++) cx[BLOCK_EI[i]! - 1] = -2;
  for (let i = 10; i < 15; i++) cx[BLOCK_EI[i]! - 1] = 2;
  setBlock(cx, BLOCK_TA, -1);
  const cxComputed = calculate_result(cx, Array(75).fill(5));
  console.log("calc complex attempt:", cxComputed.psychotype_code, cxComputed.triad_variant);
  await checkCase("complex_profile", encodeAnswers(cx));

  await checkCase("demo_influencer", getDemoEncdata());

  const html = await (await fetch("http://localhost:3000/results.html")).text();
  const markers = [
    ["empath-subindices", html.includes('id="empath-subindices"')],
    ["orderContentBlocks", html.includes("orderContentBlocks")],
    ["content-block--triad", html.includes("content-block--triad")],
    ["content-block--complex", html.includes("content-block--complex")],
    ["empath_subtype_label", html.includes("empath_subtype_label")],
  ] as const;
  console.log("\n=== results.html UX ===");
  for (const [k, ok] of markers) {
    console.log(ok ? "OK" : "MISSING", k);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
