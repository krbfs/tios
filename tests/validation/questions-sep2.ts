#!/usr/bin/env node
/**
 * Verify questions_aug26 dump vs source_sep_2nd docx (texts + sub_factor keys).
 * Usage: npm run verify:questions
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parseQuestionnaireDocx } from "../../scripts/lib/parse-questionnaire-docx";

const JSON_PATH = resolve(process.cwd(), "data/questions_aug26.json");
const DOCX_PATH = resolve(
  process.cwd(),
  "../source_sep_2nd/Текст_опросника_и_математика_окончательно.docx",
);

/** Sub-factor code (3.1, 5.3, …) per question id — from docx «Факторы и ключи». */
const SUB_FACTOR_BY_ID: Record<number, string> = {
  1: "1.1",
  6: "1.1",
  11: "1.1",
  16: "1.2",
  21: "1.2",
  26: "1.2",
  31: "1.3",
  36: "1.3",
  41: "1.3",
  46: "1.4",
  51: "1.4",
  56: "1.4",
  61: "1.5",
  66: "1.5",
  71: "1.5",
  2: "2.1",
  7: "2.1",
  12: "2.1",
  17: "2.2",
  22: "2.2",
  27: "2.2",
  32: "2.3",
  37: "2.3",
  42: "2.3",
  47: "2.4",
  52: "2.4",
  57: "2.4",
  62: "2.5",
  67: "2.5",
  72: "2.5",
  3: "3.1",
  8: "3.1",
  13: "3.1",
  18: "3.2",
  23: "3.2",
  28: "3.2",
  33: "3.3",
  38: "3.3",
  43: "3.3",
  48: "3.4",
  53: "3.4",
  58: "3.4",
  63: "3.5",
  68: "3.5",
  73: "3.5",
  4: "4.1",
  9: "4.1",
  14: "4.1",
  19: "4.2",
  24: "4.2",
  29: "4.2",
  34: "4.3",
  39: "4.3",
  44: "4.3",
  49: "4.4",
  54: "4.4",
  59: "4.4",
  64: "4.5",
  69: "4.5",
  74: "4.5",
  5: "5.1",
  10: "5.1",
  15: "5.1",
  20: "5.2",
  25: "5.2",
  30: "5.2",
  35: "5.3",
  40: "5.3",
  45: "5.3",
  50: "5.4",
  55: "5.4",
  60: "5.4",
  65: "5.5",
  70: "5.5",
  75: "5.5",
};

const dump = JSON.parse(readFileSync(JSON_PATH, "utf8")) as {
  questions: Array<{
    id: number;
    factor: string;
    left_text: string;
    right_text: string;
  }>;
};

const parsed = parseQuestionnaireDocx(DOCX_PATH);
const byId = new Map(parsed.map((q) => [q.id, q]));

let failed = 0;

for (const q of dump.questions) {
  const expectedSub = SUB_FACTOR_BY_ID[q.id];
  const actualSub = q.factor.split(" ")[0];
  const okSub = actualSub === expectedSub;
  console.log(okSub ? `OK sub_factor id ${q.id}` : `FAIL sub_factor id ${q.id}: ${actualSub} expected ${expectedSub}`);
  if (!okSub) failed += 1;

  const doc = byId.get(q.id);
  if (!doc) {
    console.log(`FAIL missing in docx parse id ${q.id}`);
    failed += 1;
    continue;
  }
  const okLeft = q.left_text === doc.left_text;
  const okRight = q.right_text === doc.right_text;
  if (!okLeft || !okRight) {
    console.log(`FAIL texts id ${q.id}`);
    if (!okLeft) console.log(`  left dump: ${q.left_text}`);
    if (!okLeft) console.log(`  left docx: ${doc.left_text}`);
    if (!okRight) console.log(`  right dump: ${q.right_text}`);
    if (!okRight) console.log(`  right docx: ${doc.right_text}`);
    failed += 1;
  } else {
    console.log(`OK texts id ${q.id}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log("\nquestions_aug26 ↔ sep docx OK (75 questions).");
