import AdmZip from "adm-zip";

export type ParsedQuestion = {
  id: number;
  left_text: string;
  right_text: string;
  factor_group: string;
  sub_factor: string;
  tendency_positive: string;
  tendency_negative: string | null;
};

const TENDENCY_BY_BLOCK: Record<string, { positive: string; negative: string }> = {
  "1": { positive: "extraversion", negative: "introversion" },
  "2": { positive: "anxiety", negative: "aggression" },
  "3": { positive: "sensitivity", negative: "spontaneity" },
  "5": { positive: "lability", negative: "rigidity" },
};

const SYSTEMIC_BY_SUB: Record<string, string> = {
  "4.1": "sys_energy",
  "4.2": "sys_result",
  "4.3": "sys_quality",
  "4.4": "sys_rules",
  "4.5": "sys_delegation",
};

/** Legacy: question-table label quirk (aug docx). Sep docx table already has 5.3. */
const FACTOR_OVERRIDES: Record<number, string> = {};

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
      String.fromCharCode(parseInt(code, 16)),
    );
}

function cellText(cellXml: string): string {
  const texts = [...cellXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((item) =>
    decodeXmlEntities(item[1]),
  );
  return texts.join("").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function extractTables(docxPath: string): string[][][] {
  const zip = new AdmZip(docxPath);
  const entry = zip.getEntry("word/document.xml");
  if (!entry) {
    throw new Error("Invalid docx: word/document.xml not found");
  }

  const xml = entry.getData().toString("utf8");
  const tables: string[][][] = [];

  for (const tableMatch of xml.matchAll(/<w:tbl[\s\S]*?<\/w:tbl>/g)) {
    const rows: string[][] = [];
    for (const rowMatch of tableMatch[0].matchAll(/<w:tr[\s\S]*?<\/w:tr>/g)) {
      const cells: string[] = [];
      for (const cellMatch of rowMatch[0].matchAll(/<w:tc[\s\S]*?<\/w:tc>/g)) {
        const text = cellText(cellMatch[0]);
        if (!cells.length || cells[cells.length - 1] !== text) {
          cells.push(text);
        }
      }
      if (cells.some(Boolean)) {
        rows.push(cells);
      }
    }
    if (rows.length) {
      tables.push(rows);
    }
  }

  return tables;
}

function extractParagraphs(docxPath: string): string[] {
  const zip = new AdmZip(docxPath);
  const entry = zip.getEntry("word/document.xml");
  if (!entry) {
    throw new Error("Invalid docx: word/document.xml not found");
  }

  const xml = entry.getData().toString("utf8");
  const paragraphs: string[] = [];

  for (const match of xml.matchAll(/<w:p[\s\S]*?<\/w:p>/g)) {
    const texts = [...match[0].matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((item) =>
      decodeXmlEntities(item[1]),
    );
    const line = texts.join("").replace(/\u00a0/g, " ").trim();
    if (line) {
      paragraphs.push(line);
    }
  }

  return paragraphs;
}

function parseQuestionsFromTables(tables: string[][][]): Map<number, { left: string; right: string; factor: string }> {
  const questions = new Map<number, { left: string; right: string; factor: string }>();

  for (const table of tables) {
    const header = table[0]?.join(" ").toLowerCase() ?? "";
    if (!header.includes("утверждение") && !header.includes("фактор")) {
      continue;
    }

    for (const row of table.slice(1)) {
      if (row.length < 3) continue;
      const id = Number(row[0]);
      if (!Number.isInteger(id) || id < 1 || id > 75) continue;

      let factor = "";
      let left = "";
      let right = "";
      if (row.length >= 4) {
        [factor, left, right] = [row[1], row[2], row[3]];
      } else {
        [left, right] = [row[1], row[2]];
      }

      if (!left || !right) continue;
      questions.set(id, {
        left,
        right,
        factor: FACTOR_OVERRIDES[id] ?? factor,
      });
    }

    if (questions.size === 75) {
      break;
    }
  }

  return questions;
}

/** Legacy paragraph format: "N. left" then next non-numeric paragraph = right. */
function parseQuestionsFromParagraphs(
  paragraphs: string[],
): Map<number, { left: string; right: string }> {
  const questions = new Map<number, { left: string; right: string }>();

  for (let i = 0; i < paragraphs.length; i += 1) {
    const match = paragraphs[i].match(/^(\d+)\.?\s+(.+)$/);
    if (!match) continue;

    const id = Number(match[1]);
    if (id < 1 || id > 75 || questions.has(id)) continue;

    const left = match[2].trim();
    let j = i + 1;
    while (j < paragraphs.length && /^-?\d+$/.test(paragraphs[j])) {
      j += 1;
    }
    if (j >= paragraphs.length) continue;

    const next = paragraphs[j];
    if (/^\d+\.?\s/.test(next) || next.startsWith("Факторы")) continue;

    questions.set(id, { left, right: next.trim() });
    i = j;
  }

  return questions;
}

function parseFactorMappingFromKeysTable(
  tables: string[][][],
): Map<
  number,
  Pick<ParsedQuestion, "factor_group" | "sub_factor" | "tendency_positive" | "tendency_negative">
> {
  const mapping = new Map<
    number,
    Pick<ParsedQuestion, "factor_group" | "sub_factor" | "tendency_positive" | "tendency_negative">
  >();

  for (const table of tables) {
    let currentGroup: string | null = null;
    let sawFactorRows = false;

    for (const row of table) {
      const joined = row.join(" ").trim();
      const groupMatch = joined.match(/^(\d\.\d)\s+(.+)$/);
      if (groupMatch && row.length <= 2) {
        currentGroup = `${groupMatch[1]} ${groupMatch[2]}`.trim();
        continue;
      }

      // Keys table rows often look like: "1.1 Источник..." | "" | "1" | "6" | "11"
      // After cell dedupe: ["1.1 …", "1", "6", "11"] or similar.
      const subMatch = row[0]?.match(/^(\d\.\d)\b/);
      if (subMatch && row.length >= 2) {
        currentGroup = row[0];
        const ids = row.slice(1).map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 75);
        if (ids.length) {
          sawFactorRows = true;
          assignFactor(mapping, ids, currentGroup);
        }
        continue;
      }

      if (!currentGroup) continue;
      const onlyIds = row
        .map(Number)
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 75);
      if (onlyIds.length && onlyIds.length === row.filter(Boolean).length) {
        sawFactorRows = true;
        assignFactor(mapping, onlyIds, currentGroup);
      }
    }

    if (sawFactorRows && mapping.size >= 60) {
      return mapping;
    }
  }

  return mapping;
}

function assignFactor(
  mapping: Map<
    number,
    Pick<ParsedQuestion, "factor_group" | "sub_factor" | "tendency_positive" | "tendency_negative">
  >,
  ids: number[],
  currentGroup: string,
) {
  const subFactor = currentGroup.split(" ")[0];
  const block = subFactor.split(".")[0];

  for (const id of ids) {
    if (block === "4") {
      mapping.set(id, {
        factor_group: currentGroup,
        sub_factor: subFactor,
        tendency_positive: SYSTEMIC_BY_SUB[subFactor],
        tendency_negative: null,
      });
      continue;
    }

    const tendencies = TENDENCY_BY_BLOCK[block];
    if (!tendencies) {
      throw new Error(`Unknown factor block for sub_factor ${subFactor}`);
    }

    mapping.set(id, {
      factor_group: currentGroup,
      sub_factor: subFactor,
      tendency_positive: tendencies.positive,
      tendency_negative: tendencies.negative,
    });
  }
}

function parseFactorMappingFromParagraphs(paragraphs: string[]): Map<
  number,
  Pick<ParsedQuestion, "factor_group" | "sub_factor" | "tendency_positive" | "tendency_negative">
> {
  const mapping = new Map<
    number,
    Pick<ParsedQuestion, "factor_group" | "sub_factor" | "tendency_positive" | "tendency_negative">
  >();

  let currentGroup: string | null = null;

  for (const line of paragraphs) {
    const groupMatch = line.match(/^(\d\.\d)\s+(.+)$/);
    if (groupMatch) {
      currentGroup = line;
      continue;
    }

    if (!/^\d+$/.test(line) || !currentGroup) {
      continue;
    }

    assignFactor(mapping, [Number(line)], currentGroup);
  }

  return mapping;
}

function factorFromQuestionLabel(
  factorLabel: string,
): Pick<ParsedQuestion, "factor_group" | "sub_factor" | "tendency_positive" | "tendency_negative"> {
  const subFactor = factorLabel.split(" ")[0];
  const block = subFactor.split(".")[0];
  if (block === "4") {
    return {
      factor_group: factorLabel,
      sub_factor: subFactor,
      tendency_positive: SYSTEMIC_BY_SUB[subFactor],
      tendency_negative: null,
    };
  }
  const tendencies = TENDENCY_BY_BLOCK[block];
  if (!tendencies) {
    throw new Error(`Unknown factor block in label: ${factorLabel}`);
  }
  return {
    factor_group: factorLabel,
    sub_factor: subFactor,
    tendency_positive: tendencies.positive,
    tendency_negative: tendencies.negative,
  };
}

export function parseQuestionnaireDocx(docxPath: string): ParsedQuestion[] {
  const tables = extractTables(docxPath);
  const paragraphs = extractParagraphs(docxPath);

  const fromTables = parseQuestionsFromTables(tables);
  const fromParagraphs = parseQuestionsFromParagraphs(paragraphs);

  const factorsFromKeysTable = parseFactorMappingFromKeysTable(tables);
  // Keys table («Факторы и ключи») is source of truth for scoring metadata; question-table factor labels are display-only fallback.
  const factorsFromKeys =
    factorsFromKeysTable.size >= 75
      ? factorsFromKeysTable
      : parseFactorMappingFromParagraphs(paragraphs);

  const result: ParsedQuestion[] = [];

  for (let id = 1; id <= 75; id += 1) {
    const tableQ = fromTables.get(id);
    const paraQ = fromParagraphs.get(id);
    const left = tableQ?.left ?? paraQ?.left;
    const right = tableQ?.right ?? paraQ?.right;

    if (!left || !right) {
      throw new Error(`Missing question text for id ${id}`);
    }

    const factor =
      factorsFromKeys.get(id) ??
      (tableQ?.factor ? factorFromQuestionLabel(tableQ.factor) : undefined);

    if (!factor) {
      throw new Error(`Missing factor mapping for id ${id}`);
    }

    result.push({
      id,
      left_text: left,
      right_text: right,
      ...factor,
    });
  }

  return result;
}
