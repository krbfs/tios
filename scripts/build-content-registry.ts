#!/usr/bin/env node
/**
 * Build content_registry.json for leader_resource from source docx.
 *
 * Source: source_main/1_Предложение_пo_изменению_ТК_вопросы.docx
 * Usage: npm run content:build-registry
 */
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import AdmZip from "adm-zip";

function findLeaderResourceDocx(): string {
  const sourceDir = resolve(process.cwd(), "../source_main");
  const file = readdirSync(sourceDir).find(
    (name) =>
      name.includes("Предложение") &&
      name.includes("ТК") &&
      name.endsWith(".docx") &&
      !name.startsWith("~") &&
      !name.startsWith("."),
  );

  if (!file) {
    throw new Error(`Leader resource docx not found in ${sourceDir}`);
  }

  return join(sourceDir, file);
}

const DOCX = findLeaderResourceDocx();
const OUT = resolve(process.cwd(), "data/content_registry.json");

const BLOCK_DEFS = [
  {
    block_key: "description_main",
    title: "Описание основного психотипа",
    sort_order: 1,
    pattern: /1\.\s*Описание основного психотипа\s*(.*)/s,
  },
  {
    block_key: "stress_behavior",
    title: "Поведение в стрессе",
    sort_order: 2,
    pattern: /2\.\s*Поведение в стрессе\s*(.*)/s,
  },
  {
    block_key: "efficiency_map",
    title: "Карта эффективности (Пик эффективности, Зона провала)",
    sort_order: 3,
    pattern: /3\.\s*Карта эффективности\s*(.*)/s,
  },
  {
    block_key: "energy_loss_channels",
    title: "Каналы потери энергии",
    sort_order: 4,
    pattern: /4\.\s*Каналы потери энергии\s*(.*)/s,
  },
  {
    block_key: "decision_making_channel",
    title: "Канал принятия решений",
    sort_order: 5,
    pattern: /5\.\s*Канал принятия решений\s*(.*)/s,
  },
  {
    block_key: "energy_sources",
    title: "Источники энергии",
    sort_order: 6,
    pattern:
      /6\.\s*Источники энергии(?:: как пополнять и рационально тратить)?\s*(.*)/s,
  },
  {
    block_key: "business_problems",
    title: "Диагностика возможных бизнес-проблем",
    sort_order: 7,
    pattern: /7\.\s*Диагностика возможных бизнес-проблем\s*(.*)/s,
  },
  {
    block_key: "strengths",
    title: "Сильные стороны",
    sort_order: 8,
    pattern: /8\.\s*Сильные стороны\s*(.*)/s,
  },
  {
    block_key: "partnership",
    title: "Партнёрство: возможности и ограничения",
    sort_order: 9,
    pattern: /9\.\s*Партнёрство: возможности и ограничения:?\s*(.*)/s,
  },
  {
    block_key: "attraction",
    title: "Что привлекает в профессиональном и личностном плане",
    sort_order: 10,
    pattern:
      /10\.\s*Что привлекает(?: в профессиональном и личностном плане\??)?\s*(.*)/s,
  },
] as const;

const PSYCHOTYPE_HEADERS: Array<{
  code: string;
  match: RegExp;
}> = [
  { code: "individualist", match: /^1\.\s*Индивидуалист(?:\s|\(|$)/i },
  { code: "innovator", match: /^2\.\s*(?:Энтузиаст|Инноватор)(?:\s|\(|$)/i },
  { code: "influencer", match: /^3\.\s*Лидер мнений(?:\s|\(|$)/i },
  { code: "aesthete", match: /^4\.\s*(?:Модник|Эстет)(?:\s|\(|$)/i },
  { code: "conservative", match: /^5\.\s*Консерватор(?:\s|\(|$)/i },
  { code: "empath", match: /^6\.\s*(?:Чувствительный|Эмпат)(?:\s|\(|$)/i },
  { code: "analyst", match: /^7\.\s*Аналитик(?:\s|\(|$)/i },
  { code: "pragmatist", match: /^8\.\s*(?:Прагматик|Реалист)(?:\s|\(|$)/i },
];

type RegistryBlock = {
  psychotype_code: string;
  mode: string;
  block_key: string;
  block_template: string;
  title: string;
  content_text: string;
  sort_order: number;
  is_visible_default: boolean;
  version: number;
  is_active: boolean;
};

function extractParagraphs(docxPath: string): string[] {
  const zip = new AdmZip(docxPath);
  const entry = zip.getEntry("word/document.xml");
  if (!entry) {
    throw new Error("Invalid docx: word/document.xml not found");
  }

  const xml = entry.getData().toString("utf8");
  const paragraphs: string[] = [];

  for (const match of xml.matchAll(/<w:p[\s\S]*?<\/w:p>/g)) {
    const texts = [...match[0].matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(
      (item) => item[1],
    );
    const line = texts.join("").replace(/\u00a0/g, " ").trim();
    if (line) {
      paragraphs.push(line);
    }
  }

  return paragraphs;
}

function normalizeContent(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/–/g, "—")
    .replace(/\.([А-ЯA-Z«])/g, ". $1")
    .replace(/:([А-ЯA-Z«])/g, ": $1")
    .replace(/—(?=\S)/g, "— ")
    .replace(/\bМодник\b/g, "Эстет")
    .replace(/\bЧувствительный\b/g, "Эмпат")
    .replace(/\(Замкнутый\)/g, "(Аналитик)")
    .replace(/\(Реалист\)/g, "(Прагматик)")
    .replace(/\bЭнтузиаст\b/g, "Инноватор")
    .replace(/\s+/g, " ")
    .trim();
}

function splitPsychotypeSections(paragraphs: string[]): Map<string, string[]> {
  const startIndex = paragraphs.findIndex((line) =>
    line.includes("Психологические портреты"),
  );
  if (startIndex === -1) {
    throw new Error("Psychotype section header not found in docx");
  }

  const sections = new Map<string, string[]>();
  let currentCode: string | null = null;

  for (const line of paragraphs.slice(startIndex + 1)) {
    const header = PSYCHOTYPE_HEADERS.find((item) => item.match.test(line));
    if (header) {
      currentCode = header.code;
      sections.set(currentCode, []);
      continue;
    }

    if (currentCode) {
      sections.get(currentCode)!.push(line);
    }
  }

  if (sections.size !== 8) {
    throw new Error(`Expected 8 psychotypes, got ${sections.size}`);
  }

  return sections;
}

function parseBlocks(
  psychotypeCode: string,
  lines: string[],
): RegistryBlock[] {
  const blocks: RegistryBlock[] = [];

  for (const def of BLOCK_DEFS) {
    const line = lines.find((item) => def.pattern.test(item));
    const match = line?.match(def.pattern);
    if (!match?.[1]?.trim()) {
      throw new Error(
        `Missing block ${def.block_key} for psychotype ${psychotypeCode}`,
      );
    }

    blocks.push({
      psychotype_code: psychotypeCode,
      mode: "leader_resource",
      block_key: def.block_key,
      block_template: "text_block",
      title: def.title,
      content_text: normalizeContent(match[1]),
      sort_order: def.sort_order,
      is_visible_default: true,
      version: 1,
      is_active: true,
    });
  }

  return blocks;
}

function main() {
  const paragraphs = extractParagraphs(DOCX);
  const sections = splitPsychotypeSections(paragraphs);

  const blocks = [...sections.entries()].flatMap(([code, lines]) =>
    parseBlocks(code, lines),
  );

  if (blocks.length !== 80) {
    throw new Error(`Expected 80 blocks, got ${blocks.length}`);
  }

  const payload = {
    mode: "leader_resource",
    source: "source_main/1_Предложение_пo_изменению_ТК_вопросы.docx",
    generated_at: new Date().toISOString(),
    blocks,
  };

  mkdirSync(resolve(process.cwd(), "data"), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${blocks.length} blocks to ${OUT}`);
}

main();
