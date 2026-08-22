#!/usr/bin/env npx tsx
/** Validates SEO / A2A artifacts (local files + seo.ts agent card). */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  absoluteUrl,
  buildA2AAgentCard,
  buildAiPluginManifest,
  pages,
  siteConfig,
} from "../src/lib/seo";

const ROOT = resolve(import.meta.dirname, "..");
const PUBLIC = resolve(ROOT, "public");

function fail(message: string): never {
  console.error(`validate:seo-a2a FAIL: ${message}`);
  process.exit(1);
}

function readPublic(name: string): string {
  const path = resolve(PUBLIC, name);
  try {
    return readFileSync(path, "utf8");
  } catch {
    fail(`missing public/${name}`);
  }
}

function assertIncludes(haystack: string, needle: string, label: string) {
  if (!haystack.includes(needle)) {
    fail(`${label}: expected marker ${needle}`);
  }
}

// --- static LLM files ---
for (const name of ["llms.txt", "llms-full.txt", "ai.txt"] as const) {
  readPublic(name);
}

const llms = readPublic("llms.txt");
assertIncludes(llms, "## A2A", "llms.txt");
assertIncludes(llms, "agent-card.json", "llms.txt");
assertIncludes(llms, "### Чего не говорить", "llms.txt");
assertIncludes(llms, "#pricing", "llms.txt");
assertIncludes(llms, "llms-full.txt", "llms.txt");

const llmsFull = readPublic("llms-full.txt");
assertIncludes(llmsFull, "important_notes_for_ai_agents", "llms-full.txt");
assertIncludes(llmsFull, "#pricing", "llms-full.txt");

const aiTxt = readPublic("ai.txt");
assertIncludes(aiTxt, "agent-card.json", "ai.txt");
assertIncludes(aiTxt, "llms.txt", "ai.txt");

// --- agent card from seo.ts ---
const card = buildA2AAgentCard();
const expectedDoc = absoluteUrl("/llms.txt");
if (card.documentationUrl !== expectedDoc) {
  fail(`agent-card documentationUrl must be ${expectedDoc}, got ${card.documentationUrl}`);
}

if (!card.contentRules || typeof card.contentRules !== "object") {
  fail("agent-card missing contentRules");
}

const rules = card.contentRules as Record<string, unknown>;
for (const key of ["doNotClaim", "priceSource", "priceCurrencies", "funnelOrder"]) {
  if (!(key in rules)) {
    fail(`agent-card contentRules missing ${key}`);
  }
}

if (rules.priceSource !== expectedDoc) {
  fail(`contentRules.priceSource must be ${expectedDoc}`);
}

if (!Array.isArray(card.skills) || card.skills.length < 5) {
  fail("agent-card must expose skills[]");
}

const premiumSkills = card.skills.filter((s) => String(s.id).startsWith("upsell-"));
for (const skill of premiumSkills) {
  if (!String(skill.description).includes("#pricing")) {
    fail(`skill ${skill.id} description must mention #pricing`);
  }
}

JSON.stringify(card);
JSON.stringify(buildAiPluginManifest());

// --- page SEO sanity ---
for (const key of ["home", "testIntro", "testTake", "results"] as const) {
  const page = pages[key];
  if (!page.title || !page.description) {
    fail(`pages.${key} missing title/description`);
  }
  if (page.description.length < 80 || page.description.length > 200) {
    fail(`pages.${key} description length out of range (${page.description.length})`);
  }
}

if (pages.login.robots?.index !== false) {
  fail("pages.login must be noindex");
}

console.log(`validate:seo-a2a OK (${siteConfig.url})`);
