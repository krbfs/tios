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

const TENDENCY_BY_BLOCK: Record<
  string,
  { positive: string; negative: string }
> = {
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

function extractParagraphs(docxPath: string): string[] {
  const zip = new AdmZip(docxPath);
  const entry = zip.getEntry("word/document.xml");
  if (!entry) {
    throw new Error("Invalid docx: word/document.xml not found");
  }

  const xml = entry.getData().toString("utf8");
  const paragraphs: string[] = [];

  for (const match of xml.matchAll(/<w:p[\s\S]*?<\/w:p>/g)) {
    const paragraphXml = match[0];
    const texts = [...paragraphXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(
      (item) => item[1],
    );
    const line = texts.join("").trim();
    if (line) {
      paragraphs.push(line);
    }
  }

  return paragraphs;
}

function parseQuestions(paragraphs: string[]): Map<number, { left: string; right: string }> {
  const questions = new Map<number, { left: string; right: string }>();

  for (let i = 0; i < paragraphs.length; i += 1) {
    const match = paragraphs[i].match(/^(\d+)\.?\s+(.+)$/);
    if (!match) {
      continue;
    }

    const id = Number(match[1]);
    if (id < 1 || id > 75 || questions.has(id)) {
      continue;
    }

    const left = match[2].trim();
    let j = i + 1;
    while (j < paragraphs.length && /^-?\d+$/.test(paragraphs[j])) {
      j += 1;
    }

    if (j >= paragraphs.length) {
      continue;
    }

    const next = paragraphs[j];
    if (/^\d+\.?\s/.test(next) || next.startsWith("Факторы")) {
      continue;
    }

    questions.set(id, { left, right: next.trim() });
    i = j;
  }

  return questions;
}

function parseFactorMapping(paragraphs: string[]): Map<
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

    const id = Number(line);
    if (id < 1 || id > 75) {
      continue;
    }

    const subFactor = currentGroup.split(" ")[0];
    const block = subFactor.split(".")[0];

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

  return mapping;
}

export function parseQuestionnaireDocx(docxPath: string): ParsedQuestion[] {
  const paragraphs = extractParagraphs(docxPath);
  const questions = parseQuestions(paragraphs);
  const factors = parseFactorMapping(paragraphs);

  if (questions.size !== 75) {
    throw new Error(`Expected 75 questions in docx, parsed ${questions.size}`);
  }

  const result: ParsedQuestion[] = [];

  for (let id = 1; id <= 75; id += 1) {
    const question = questions.get(id);
    const factor = factors.get(id);

    if (!question) {
      throw new Error(`Missing question text for id ${id}`);
    }
    if (!factor) {
      throw new Error(`Missing factor mapping for id ${id}`);
    }

    result.push({
      id,
      left_text: question.left,
      right_text: question.right,
      ...factor,
    });
  }

  return result;
}
