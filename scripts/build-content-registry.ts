#!/usr/bin/env node
/**
 * Build portrait content from source_sep_2nd docx:
 *   - data/content_registry.json (8×11 base blocks)
 *   - data/v1_leader_resource_blocks.json (complex + triads + empath subtypes)
 *
 * Usage: npm run content:build-registry
 */
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import AdmZip from "adm-zip";

import {
  determine_triad_variant,
  type ScaleKey,
} from "../src/lib/calculations";

function findPortraitDocx(): string {
  for (const sourceDir of ["../source_sep_2nd", "../source_current"]) {
    const dir = resolve(process.cwd(), sourceDir);
    const file = readdirSync(dir).find(
      (name) =>
        name.includes("Предложение") &&
        name.includes("ТК") &&
        name.endsWith(".docx") &&
        !name.startsWith("~") &&
        !name.startsWith("."),
    );
    if (file) {
      return join(dir, file);
    }
  }
  throw new Error("Portrait docx not found in source_sep_2nd or source_current");
}

const DOCX = findPortraitDocx();
const OUT_REGISTRY = resolve(process.cwd(), "data/content_registry.json");
const OUT_V1 = resolve(process.cwd(), "data/v1_leader_resource_blocks.json");

const LIST_BLOCK_KEYS = new Set([
  "energy_loss_channels",
  "business_problems",
  "strengths",
]);

const BLOCK_DEFS = [
  {
    block_key: "description_main",
    title: "Описание основного психотипа",
    sort_order: 1,
    start: /^1\.\s*Описание основного психотипа/i,
  },
  {
    block_key: "stress_behavior",
    title: "Поведение в стрессе",
    sort_order: 2,
    start: /^2\.\s*Поведение в стрессе/i,
  },
  {
    block_key: "efficiency_map",
    title: "Карта эффективности",
    sort_order: 3,
    start: /^3\.\s*Карта эффективности/i,
  },
  {
    block_key: "energy_loss_channels",
    title: "Каналы потери энергии",
    sort_order: 4,
    start: /^4\.\s*Каналы потери энергии/i,
  },
  {
    block_key: "decision_making_channel",
    title: "Канал принятия решений",
    sort_order: 5,
    start: /^(?:5\.\s*)?Канал принятия решений/i,
  },
  {
    block_key: "energy_sources",
    title: "Источники энергии",
    sort_order: 6,
    start: /^6\.\s*Источники энергии/i,
  },
  {
    block_key: "business_problems",
    title: "Диагностика возможных бизнес-проблем",
    sort_order: 7,
    start: /^7\.\s*Диагностика возможных бизнес-проблем/i,
  },
  {
    block_key: "strengths",
    title: "Сильные стороны",
    sort_order: 8,
    start: /^8\.\s*Сильные стороны/i,
  },
  {
    block_key: "partnership",
    title: "Партнерство: возможности и ограничения",
    sort_order: 9,
    start: /^(?:9\.\s*)?Партн[её]рство/i,
  },
  {
    block_key: "attraction",
    title: "Что привлекает в профессиональном и личностном плане",
    sort_order: 10,
    start: /^10\.\s*Что привлекает/i,
  },
] as const;

const PSYCHOTYPE_HEADERS: Array<{
  code: string;
  match: RegExp;
  pair: [ScaleKey, ScaleKey];
}> = [
  {
    code: "individualist",
    match: /^2\.1\.\s*Индивидуалист/i,
    pair: ["aggression", "spontaneity"],
  },
  {
    code: "innovator",
    match: /^2\.2\.\s*(?:Энтузиаст|Инноватор)/i,
    pair: ["spontaneity", "extraversion"],
  },
  {
    code: "influencer",
    match: /^2\.3\.\s*Лидер мнений/i,
    pair: ["extraversion", "lability"],
  },
  {
    code: "aesthete",
    match: /^2\.4\.\s*(?:Модник|Эстет)/i,
    pair: ["lability", "anxiety"],
  },
  {
    code: "conservative",
    match: /^2\.5\.\s*Консерватор/i,
    pair: ["anxiety", "sensitivity"],
  },
  {
    code: "empath",
    match: /^2\.6\.\s*(?:Чувствительный|Эмпат)/i,
    pair: ["sensitivity", "introversion"],
  },
  {
    code: "analyst",
    match: /^2\.7\.\s*Аналитик/i,
    pair: ["introversion", "rigidity"],
  },
  {
    code: "pragmatist",
    match: /^2\.8\.\s*(?:Прагматик|Реалист)/i,
    pair: ["rigidity", "aggression"],
  },
];

const TRIAD_HEADERS = PSYCHOTYPE_HEADERS.map(({ code, match, pair }) => ({
  code,
  match: new RegExp(match.source.replace("^2\\.", "^3\\."), match.flags),
  pair,
}));

const SCALE_TOKEN_MAP: Record<string, ScaleKey> = {
  AGG: "aggression",
  SPO: "spontaneity",
  EXT: "extraversion",
  LAB: "lability",
  ANX: "anxiety",
  SEN: "sensitivity",
  INT: "introversion",
  RIG: "rigidity",
};

const EMPATH_SUBTYPES = [
  {
    block_key: "empath_subtype_guardian",
    title: "Чуткий Хранитель",
    marker: "«Чуткий Хранитель»",
    sort_order: 13,
  },
  {
    block_key: "empath_subtype_creator",
    title: "Вдохновенный Творец",
    marker: "«Вдохновенный Творец»",
    sort_order: 13,
  },
  {
    block_key: "empath_subtype_systematic",
    title: "Сдержанный Систематик",
    marker: "«Сдержанный Систематик»",
    sort_order: 13,
  },
] as const;

const COMPLEX_MESSAGE =
  "Ваш профиль не сводится к одному из восьми чистых психотипов: среди трех ведущих тенденций нет соседней пары на круге. Такой результат называют сложным профилем. Для точной интерпретации рекомендуем углубленный разбор с консультантом.";

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
  triad_variant?: string | null;
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

function normalizeTriadContent(parts: string[]): string {
  return parts
    .map((part) =>
      part
        .replace(/Ё/g, "Е")
        .replace(/ё/g, "е")
        .replace(/–/g, "—")
        .replace(/\u00a0/g, " ")
        .trim(),
    )
    .filter(Boolean)
    .join("\n");
}

const GLUED_SECTION_LABELS = [
  "Возможности",
  "Ограничения",
  "Идеальный партнер",
  "Как пополнять",
  "Как рационально тратить",
  "Профессионально",
  "Личностно",
];

const INLINE_SUBTITLE_STRIPS: Partial<
  Record<(typeof BLOCK_DEFS)[number]["block_key"], RegExp>
> = {
  energy_sources: /^:?\s*как пополнять и рационально тратить:?\s*/i,
  partnership: /^:?\s*возможности и ограничения\s*/i,
  attraction: /^в профессиональном и личностном плане\?\s*/i,
};

function normalizeContent(text: string): string {
  const labelAlt = GLUED_SECTION_LABELS.join("|");
  return text
    .replace(/^\?\s*/, "")
    .replace(/Ё/g, "Е")
    .replace(/ё/g, "е")
    .replace(/\u00a0/g, " ")
    .replace(/–/g, "—")
    .replace(/\.([А-ЯA-Z«])/g, ". $1")
    .replace(/:([А-ЯA-Z«])/g, ": $1")
    .replace(new RegExp(`([а-яё»])(${labelAlt}):`, "g"), "$1 $2:")
    .replace(/—(?=\S)/g, "— ")
    .replace(/\bМодник\b/g, "Эстет")
    .replace(/\bЧувствительный\b/g, "Эмпат")
    .replace(/\(Замкнутый\)/g, "(Аналитик)")
    .replace(/\(Реалист\)/g, "(Прагматик)")
    .replace(/\bЭнтузиаст\b/g, "Инноватор")
    .replace(/\s+/g, " ")
    .trim();
}

function stripInlineSubtitle(
  text: string,
  blockKey: (typeof BLOCK_DEFS)[number]["block_key"],
): string {
  const pattern = INLINE_SUBTITLE_STRIPS[blockKey];
  return pattern ? text.replace(pattern, "").trim() : text;
}

function stripHeaderPrefix(line: string, start: RegExp): string {
  return line.replace(start, "").trim();
}

function findSection(
  paragraphs: string[],
  startPattern: RegExp,
  endPattern: RegExp,
): string[] {
  const startIndex = paragraphs.findIndex((line) => startPattern.test(line));
  if (startIndex === -1) {
    throw new Error(`Section not found: ${startPattern}`);
  }

  const lines: string[] = [];
  for (const line of paragraphs.slice(startIndex + 1)) {
    if (endPattern.test(line)) {
      break;
    }
    lines.push(line);
  }
  return lines;
}

function splitPsychotypeSections(
  lines: string[],
  headers: typeof PSYCHOTYPE_HEADERS,
): Map<string, string[]> {
  const sections = new Map<string, string[]>();
  let currentCode: string | null = null;

  for (const line of lines) {
    const header = headers.find((item) => item.match.test(line));
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

function parseKeyFormula(lines: string[]): string | null {
  const line = lines.find((item) => item.startsWith("Ключевая формула:"));
  if (!line) {
    return null;
  }
  const match = line.match(/Ключевая формула:\s*(.+)/);
  return match?.[1] ? normalizeContent(match[1]) : null;
}

function parseMultilineBlocks(
  psychotypeCode: string,
  lines: string[],
): { keyFormula: string | null; blocks: RegistryBlock[] } {
  const stopMarkers = [
    /^Специальный раздел для Эмпата/i,
    /^Для более точного портрета используются/i,
    /^Индекс Чувствительности/i,
    /^Индекс Любви к порядку/i,
    /^На основе их сочетания/i,
    /^Условие$/i,
    /^Подтип$/i,
    /^Дополнительный текст/i,
    /^Высокий S/i,
    /^Низкий S/i,
    /^\(В остальных случаях/i,
  ];
  const filtered = lines.filter(
    (line) => !stopMarkers.some((marker) => marker.test(line)),
  );
  const empathTailIndex = filtered.findIndex((line) =>
    EMPATH_SUBTYPES.some((subtype) => line.includes(subtype.marker)),
  );
  const contentLines =
    empathTailIndex === -1 ? filtered : filtered.slice(0, empathTailIndex);

  const keyFormula = parseKeyFormula(contentLines);
  const blockStarts: Array<{
    def: (typeof BLOCK_DEFS)[number];
    lineIndex: number;
    inlineTail: string;
  }> = [];

  for (let index = 0; index < contentLines.length; index += 1) {
    const line = contentLines[index];
    for (const def of BLOCK_DEFS) {
      if (def.start.test(line)) {
        blockStarts.push({
          def,
          lineIndex: index,
          inlineTail: stripInlineSubtitle(
            stripHeaderPrefix(line, def.start),
            def.block_key,
          ),
        });
        break;
      }
    }
  }

  const blocks: RegistryBlock[] = [];

  if (keyFormula) {
    blocks.push({
      psychotype_code: psychotypeCode,
      mode: "leader_resource",
      block_key: "key_formula",
      block_template: "text_block",
      title: "Ключевая формула",
      content_text: keyFormula,
      sort_order: 0,
      is_visible_default: true,
      version: 2,
      is_active: true,
    });
  }

  for (let index = 0; index < blockStarts.length; index += 1) {
    const current = blockStarts[index];
    const nextIndex =
      index + 1 < blockStarts.length
        ? blockStarts[index + 1].lineIndex
        : contentLines.length;

    const bodyLines = contentLines
      .slice(current.lineIndex + 1, nextIndex)
      .filter((line) => !line.startsWith("Ключевая формула:"));

    const contentText = stripInlineSubtitle(
      normalizeContent(
        [current.inlineTail, ...bodyLines].filter(Boolean).join(" "),
      ),
      current.def.block_key,
    );

    if (!contentText) {
      throw new Error(
        `Empty block ${current.def.block_key} for psychotype ${psychotypeCode}`,
      );
    }

    blocks.push({
      psychotype_code: psychotypeCode,
      mode: "leader_resource",
      block_key: current.def.block_key,
      block_template:
        current.def.block_key === "efficiency_map"
          ? "card_block"
          : LIST_BLOCK_KEYS.has(current.def.block_key)
            ? "list_block"
            : "text_block",
      title: current.def.title,
      content_text: contentText,
      sort_order: current.def.sort_order,
      is_visible_default: true,
      version: 2,
      is_active: true,
    });
  }

  if (blocks.filter((block) => block.block_key !== "key_formula").length !== 10) {
    throw new Error(
      `Expected 10 content blocks for ${psychotypeCode}, got ${blocks.length}`,
    );
  }

  return { keyFormula, blocks };
}

function parseTriadScales(headerLine: string): ScaleKey[] {
  const match = headerLine.match(/Триада\s+\d+:\s*([^(]+)/i);
  if (!match?.[1]) {
    throw new Error(`Cannot parse triad header: ${headerLine}`);
  }

  const tokens = match[1]
    .split(/[–—\-+]/g)
    .map((token) => token.trim().toUpperCase())
    .filter(Boolean);

  const scales = tokens.map((token) => {
    const key = SCALE_TOKEN_MAP[token];
    if (!key) {
      throw new Error(`Unknown scale token ${token} in ${headerLine}`);
    }
    return key;
  });

  if (scales.length !== 3) {
    throw new Error(`Expected 3 scales in triad header: ${headerLine}`);
  }

  return scales;
}

function parseTriads(
  code: string,
  pair: [ScaleKey, ScaleKey],
  lines: string[],
): RegistryBlock[] {
  const blocks: RegistryBlock[] = [];
  let currentVariant: "left" | "right" | null = null;
  let currentParts: string[] = [];

  const flush = () => {
    if (!currentVariant || currentParts.length === 0) {
      return;
    }

    const blockKey =
      currentVariant === "left"
        ? "triad_addition_left"
        : "triad_addition_right";
    const fullText = normalizeTriadContent(currentParts);
    const headerMatch = fullText.match(/^Триада\s+\d+:[^\n]*/i);
    const headerLine = headerMatch?.[0]?.trim() ?? "";
    const contentText = headerMatch
      ? fullText.slice(headerMatch[0].length).replace(/^\n+/, "").trim()
      : fullText;
    const title = headerLine
      ? `Уточнение: ${headerLine}`
      : currentVariant === "left"
        ? "Уточнение: левая триада"
        : "Уточнение: правая триада";

    blocks.push({
      psychotype_code: code,
      mode: "leader_resource",
      block_key: blockKey,
      block_template: "text_block",
      title,
      content_text: contentText,
      sort_order: currentVariant === "left" ? 11 : 12,
      triad_variant: currentVariant,
      is_visible_default: true,
      version: 2,
      is_active: true,
    });

    currentVariant = null;
    currentParts = [];
  };

  for (const line of lines) {
    if (/^Триада\s+\d+:/i.test(line)) {
      flush();
      const scales = parseTriadScales(line);
      const pairSet = new Set(pair);
      const third = scales.find((scale) => !pairSet.has(scale));
      if (!third) {
        throw new Error(`Triad third scale not found for ${code}: ${line}`);
      }
      const variant = determine_triad_variant(pair[0], pair[1], third);
      if (!variant) {
        throw new Error(`Triad variant unresolved for ${code}: ${line}`);
      }
      currentVariant = variant;
      currentParts = [line];
      continue;
    }

    if (currentVariant) {
      currentParts.push(line);
    }
  }

  flush();

  if (blocks.length !== 2) {
    throw new Error(`Expected 2 triad blocks for ${code}, got ${blocks.length}`);
  }

  return blocks;
}

function parseEmpathSubtypes(lines: string[]): RegistryBlock[] {
  const blocks: RegistryBlock[] = [];

  for (const subtype of EMPATH_SUBTYPES) {
    const markerIndex = lines.findIndex((line) => line.includes(subtype.marker));
    if (markerIndex === -1) {
      throw new Error(`Empath subtype not found: ${subtype.title}`);
    }

    const markerLine = lines[markerIndex];
    const inline = markerLine.includes(subtype.marker)
      ? markerLine.split(subtype.marker)[1]?.trim() ?? ""
      : "";

    let bodyLine = "";
    for (let index = markerIndex + 1; index < lines.length; index += 1) {
      const line = lines[index].trim();
      if (!line || line.startsWith("(")) {
        continue;
      }
      if (/^Высокий|^Низкий|^Условие|^Подтип|^Дополнительный|^2\./i.test(line)) {
        continue;
      }
      if (/^«[^»]+»\s*$/.test(line)) {
        continue;
      }
      bodyLine = line;
      break;
    }

    const contentText = normalizeContent([inline, bodyLine].filter(Boolean).join(" "));

    if (!contentText) {
      throw new Error(`Empty empath subtype text: ${subtype.title}`);
    }

    blocks.push({
      psychotype_code: "empath",
      mode: "leader_resource",
      block_key: subtype.block_key,
      block_template: "text_block",
      title: subtype.title,
      content_text: contentText,
      sort_order: subtype.sort_order,
      is_visible_default: true,
      version: 2,
      is_active: true,
      triad_variant: null,
    });
  }

  return blocks;
}

function buildContentRegistries(docxPath: string = DOCX) {
  const paragraphs = extractParagraphs(docxPath);
  const portraitLines = findSection(
    paragraphs,
    /^2\.\s*Полные портреты психотипов/i,
    /^3\.\s*Триады/i,
  );
  const triadLines = findSection(
    paragraphs,
    /^3\.\s*Триады/i,
    /^4\.\s*/,
  );

  const portraitSections = splitPsychotypeSections(
    portraitLines,
    PSYCHOTYPE_HEADERS,
  );
  const triadSections = splitPsychotypeSections(triadLines, TRIAD_HEADERS);

  const portraitBlocks = [...portraitSections.entries()].flatMap(
    ([code, lines]) => parseMultilineBlocks(code, lines).blocks,
  );

  if (portraitBlocks.length !== 88) {
    throw new Error(`Expected 88 portrait blocks, got ${portraitBlocks.length}`);
  }

  const triadBlocks = TRIAD_HEADERS.flatMap(({ code, pair }) =>
    parseTriads(code, pair, triadSections.get(code) ?? []),
  );

  const empathSection = portraitSections.get("empath") ?? [];
  const empathSubtypeBlocks = parseEmpathSubtypes(empathSection);

  const v1Blocks: RegistryBlock[] = [
    {
      psychotype_code: "complex",
      mode: "leader_resource",
      block_key: "complex_profile_message",
      block_template: "text_block",
      title: "Сложный профиль",
      content_text: COMPLEX_MESSAGE,
      sort_order: 1,
      triad_variant: null,
      is_visible_default: true,
      version: 2,
      is_active: true,
    },
    ...triadBlocks,
    ...empathSubtypeBlocks,
  ];

  return {
    docxPath,
    portraitBlocks,
    v1Blocks,
    portraitSections,
    triadSections,
  };
}

export {
  buildContentRegistries,
  normalizeContent,
  stripInlineSubtitle,
  BLOCK_DEFS,
  type RegistryBlock,
};

function main() {
  const { docxPath, portraitBlocks, v1Blocks } = buildContentRegistries();
  const relativeSource = docxPath.includes("source_sep_2nd")
    ? `source_sep_2nd/${docxPath.split("/").pop()}`
    : `source_current/${docxPath.split("/").pop()}`;

  const generatedAt = new Date().toISOString();

  mkdirSync(resolve(process.cwd(), "data"), { recursive: true });

  writeFileSync(
    OUT_REGISTRY,
    `${JSON.stringify(
      {
        mode: "leader_resource",
        source: relativeSource,
        generated_at: generatedAt,
        blocks: portraitBlocks,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  writeFileSync(
    OUT_V1,
    `${JSON.stringify(
      {
        mode: "leader_resource",
        source: relativeSource,
        generated_at: generatedAt,
        note: "V1 blocks: complex + triads + empath subtypes (sep_2nd).",
        blocks: v1Blocks,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(`Wrote ${portraitBlocks.length} portrait blocks to ${OUT_REGISTRY}`);
  console.log(`Wrote ${v1Blocks.length} V1 blocks to ${OUT_V1}`);
}

const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectRun) {
  main();
}
