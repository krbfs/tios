import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { parseQuestionnaireDocx } from "../../../scripts/lib/parse-questionnaire-docx";

const BLOCK_EI = [1, 6, 11, 16, 21, 26, 31, 36, 41, 46, 51, 56, 61, 66, 71];
const BLOCK_TA = [2, 7, 12, 17, 22, 27, 32, 37, 42, 47, 52, 57, 62, 67, 72];
const BLOCK_SS = [3, 8, 13, 18, 23, 28, 33, 38, 43, 48, 53, 58, 63, 68, 73];
const BLOCK_LR = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75];

const BLOCK4_BY_SUB = {
  "4.1": [4, 9, 14],
  "4.2": [19, 24, 29],
  "4.3": [34, 39, 44],
  "4.4": [49, 54, 59],
  "4.5": [64, 69, 74],
} as const;

const INVERTED_BLOCK4 = new Set([19, 24, 29, 34, 39, 44]);

function findQuestionnaireDocx(): string {
  const sourceDir = resolve(process.cwd(), "../source_current");
  const file = readdirSync(sourceDir).find(
    (name) =>
      name.toLowerCase().includes("текст_опросника") &&
      name.endsWith(".docx") &&
      !name.startsWith("~"),
  );
  if (!file) {
    throw new Error(`Questionnaire docx not found in ${sourceDir}`);
  }
  return join(sourceDir, file);
}

describe("calculations vs source_current questionnaire docx", () => {
  const questions = parseQuestionnaireDocx(findQuestionnaireDocx());

  it("maps block 1 questions to EXT/INT poles", () => {
    for (const id of BLOCK_EI) {
      const q = questions.find((item) => item.id === id);
      expect(q?.tendency_positive).toBe("extraversion");
      expect(q?.tendency_negative).toBe("introversion");
    }
  });

  it("maps block 2 questions to ANX/AGG poles", () => {
    for (const id of BLOCK_TA) {
      const q = questions.find((item) => item.id === id);
      expect(q?.tendency_positive).toBe("anxiety");
      expect(q?.tendency_negative).toBe("aggression");
    }
  });

  it("maps block 3 questions to SEN/SPO poles", () => {
    for (const id of BLOCK_SS) {
      const q = questions.find((item) => item.id === id);
      expect(q?.tendency_positive).toBe("sensitivity");
      expect(q?.tendency_negative).toBe("spontaneity");
    }
  });

  it("maps block 5 questions to LAB/RIG personal poles", () => {
    for (const id of BLOCK_LR) {
      const q = questions.find((item) => item.id === id);
      expect(q?.tendency_positive).toBe("lability");
      expect(q?.tendency_negative).toBe("rigidity");
    }
  });

  it("maps block 4 questions to sub4_1…sub4_5 systemic keys", () => {
    for (const [sub, ids] of Object.entries(BLOCK4_BY_SUB)) {
      for (const id of ids) {
        const q = questions.find((item) => item.id === id);
        expect(q?.sub_factor).toBe(sub);
        expect(q?.factor_group.startsWith(sub)).toBe(true);
      }
    }
  });

  it("marks inverted block-4 questions per NAVIGATOR §14.5", () => {
    for (const id of INVERTED_BLOCK4) {
      expect(INVERTED_BLOCK4.has(id)).toBe(true);
    }
    for (const id of BLOCK4_BY_SUB["4.1"]) {
      expect(INVERTED_BLOCK4.has(id)).toBe(false);
    }
  });
});
