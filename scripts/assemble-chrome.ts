/**
 * Inject shared header/footer from chrome/*.html into public HTML pages.
 *
 * Edit chrome/header-*.html and chrome/footer.html, then run:
 *   npm run chrome:assemble
 *
 * Markers in HTML:
 *   <!-- chrome:header-public logoHref="/" loginAttrs='data-ga-event="..."' -->
 *   <!-- /chrome:header-public -->
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = process.cwd();
const CHROME_DIR = join(ROOT, "chrome");
const PUBLIC_DIR = join(ROOT, "public");

const CHROME_BLOCK =
  /<!--\s*chrome:([\w-]+)([^>]*)-->\s*[\s\S]*?\s*<!--\s*\/chrome:\1\s*-->/g;

function loadPartials(): Map<string, string> {
  const partials = new Map<string, string>();
  for (const file of readdirSync(CHROME_DIR)) {
    if (!file.endsWith(".html")) {
      continue;
    }
    const name = file.replace(/\.html$/, "");
    partials.set(
      name,
      readFileSync(join(CHROME_DIR, file), "utf8").trim(),
    );
  }
  return partials;
}

function parseAttrs(raw: string | undefined): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (!raw) {
    return attrs;
  }

  const pattern = /([\w-]+)=("([^"]*)"|'([^']*)'|(\S+))/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw)) !== null) {
    attrs[match[1]] = match[3] ?? match[4] ?? match[5] ?? "";
  }
  return attrs;
}

function adminClasses(activePage: string | undefined) {
  return {
    resultsClass: activePage === "results" ? "active" : "",
    contentClass: activePage === "content" ? "active" : "",
    modeRequestsClass: activePage === "mode-requests" ? "active" : "",
    teamsClass: activePage === "teams" ? "active" : "",
    compatibilityClass: activePage === "compatibility" ? "active" : "",
  };
}

function renderPartial(
  partials: Map<string, string>,
  name: string,
  attrs: Record<string, string>,
): string {
  const template = partials.get(name);
  if (!template) {
    throw new Error(`Unknown chrome partial: ${name}`);
  }

  const vars: Record<string, string> = {
    logoHref: "/",
    loginAttrs: 'data-ga-event="cta_header_login"',
    resultsClass: "",
    contentClass: "",
    modeRequestsClass: "",
    teamsClass: "",
    compatibilityClass: "",
    ...adminClasses(attrs.activePage),
    ...attrs,
  };

  let html = template;
  for (const [key, value] of Object.entries(vars)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }

  if (html.includes("{{")) {
    throw new Error(`Unresolved placeholders in chrome partial "${name}"`);
  }

  return html;
}

function formatAttrs(attrs: Record<string, string>): string {
  return Object.entries(attrs)
    .map(([key, value]) => {
      if (value.includes("'") && !value.includes('"')) {
        return `${key}="${value}"`;
      }
      // Prefer single quotes when value contains double quotes (e.g. HTML attrs).
      if (value.includes('"')) {
        return `${key}='${value}'`;
      }
      if (!value || /[\s=]/.test(value)) {
        return `${key}="${value}"`;
      }
      return `${key}=${value}`;
    })
    .join(" ");
}

function assembleHtml(content: string, partials: Map<string, string>): string {
  return content.replace(CHROME_BLOCK, (match, name: string, rawAttrs: string) => {
    const attrs = parseAttrs(rawAttrs);
    const rendered = renderPartial(partials, name, attrs);
    const attrString = formatAttrs(attrs);
    const open = attrString
      ? `<!-- chrome:${name} ${attrString} -->`
      : `<!-- chrome:${name} -->`;
    return `${open}\n${rendered}\n<!-- /chrome:${name} -->`;
  });
}

function listHtmlFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      files.push(...listHtmlFiles(path));
      continue;
    }
    if (entry.endsWith(".html")) {
      files.push(path);
    }
  }
  return files;
}

function main() {
  const partials = loadPartials();
  const htmlFiles = listHtmlFiles(PUBLIC_DIR);
  let updated = 0;

  for (const file of htmlFiles) {
    const original = readFileSync(file, "utf8");
    if (!original.includes("<!-- chrome:")) {
      continue;
    }
    const assembled = assembleHtml(original, partials);
    if (assembled !== original) {
      writeFileSync(file, assembled);
      updated += 1;
    }
  }

  console.log(`Chrome assembled in ${updated} HTML file(s).`);
}

main();
