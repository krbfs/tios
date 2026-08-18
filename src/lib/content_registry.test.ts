import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { ALLOWED_MODES } from "./modes";

const PSYCHOTYPES = [
  "individualist",
  "innovator",
  "influencer",
  "aesthete",
  "conservative",
  "empath",
  "analyst",
  "pragmatist",
] as const;

const REGISTRIES: Record<(typeof ALLOWED_MODES)[number], string> = {
  leader_resource: "data/content_registry.json",
  insighter: "data/insighter_registry.json",
  insighter_you: "data/insighter_you_registry.json",
  stressless: "data/stressless_registry.json",
  hr_table: "data/hr_table_registry.json",
};

const KNOWN_TEMPLATES = new Set([
  "text_block",
  "list_block",
  "card_block",
  "accordion_block",
  "table_block",
  "plain",
]);

type RegistryBlock = {
  psychotype_code?: string;
  mode?: string;
  block_key?: string;
  block_template?: string;
  content_text?: string;
  is_active?: boolean;
};

function loadBlocks(filePath: string): RegistryBlock[] {
  const raw = JSON.parse(readFileSync(filePath, "utf8")) as
    | { blocks?: RegistryBlock[] }
    | RegistryBlock[];
  return Array.isArray(raw) ? raw : (raw.blocks ?? []);
}

describe("content registries for all modes", () => {
  for (const mode of ALLOWED_MODES) {
    it(`${mode} registry has blocks for every psychotype`, () => {
      const filePath = resolve(process.cwd(), REGISTRIES[mode]);
      const blocks = loadBlocks(filePath).filter(
        (block) => block.is_active !== false && block.mode === mode,
      );

      expect(blocks.length).toBeGreaterThan(0);

      for (const psychotype of PSYCHOTYPES) {
        const typed = blocks.filter(
          (block) =>
            block.psychotype_code === psychotype &&
            typeof block.content_text === "string" &&
            block.content_text.trim(),
        );
        expect(typed.length).toBeGreaterThan(0);
      }
    });

    it(`${mode} registry uses supported block templates`, () => {
      const filePath = resolve(process.cwd(), REGISTRIES[mode]);
      const blocks = loadBlocks(filePath).filter((block) => block.is_active !== false);

      for (const block of blocks) {
        const template = block.block_template || "text_block";
        expect(
          KNOWN_TEMPLATES.has(template),
          `${mode}/${block.block_key}: unknown template ${template}`,
        ).toBe(true);
      }
    });
  }
});
