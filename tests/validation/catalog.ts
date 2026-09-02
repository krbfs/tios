#!/usr/bin/env tsx
/**
 * Validate content_registry.json and v1_leader_resource_blocks.json
 * for parser artifacts (QA-решения §9).
 *
 * Usage: npm run content:validate-catalog
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type CatalogBlock = {
  psychotype_code?: string;
  block_key?: string;
  content_text?: string;
};

type CatalogFile = {
  blocks: CatalogBlock[];
};

function loadCatalog(relativePath: string): CatalogFile {
  const path = resolve(process.cwd(), relativePath);
  return JSON.parse(readFileSync(path, "utf8")) as CatalogFile;
}

function validateCatalog(label: string, catalog: CatalogFile): string[] {
  const errors: string[] = [];

  for (const block of catalog.blocks) {
    const text = block.content_text ?? "";
    const key = `${block.psychotype_code ?? "?"}/${block.block_key ?? "?"}`;

    if (text.startsWith(":") || text.startsWith(". ")) {
      errors.push(
        `Артефакт парсера в ${label} ${key}: '${text.slice(0, 40)}...'`,
      );
    }

    if (
      block.block_key === "triad_addition_left" &&
      block.psychotype_code === "aesthete" &&
      !text.trim()
    ) {
      errors.push(`Пустой блок триады в ${label} ${key}`);
    }
  }

  return errors;
}

function main() {
  const catalogs = [
    ["content_registry.json", loadCatalog("data/content_registry.json")],
    [
      "v1_leader_resource_blocks.json",
      loadCatalog("data/v1_leader_resource_blocks.json"),
    ],
  ] as const;

  const errors = catalogs.flatMap(([label, catalog]) =>
    validateCatalog(label, catalog),
  );

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(error);
    }
    process.exit(1);
  }

  console.log("OK: content catalogs have no parser artifacts");
}

main();
