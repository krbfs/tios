import { execSync } from "node:child_process";

/** Paths (relative to tc_26/) that trigger the full mobile layout suite. */
export const RUN_ALL_TRIGGERS = [
  "scripts/test-mobile-layout.ts",
  "scripts/mobile-layout-scope.ts",
  "next.config.ts",
  "src/app/layout.tsx",
  "public/css/tokens.css",
  "public/tc-logo-full.svg",
] as const;

/** Page name -> source paths that should re-run layout checks for that page. */
export const PAGE_WATCH: Record<string, readonly string[]> = {
  home: [
    "src/app/page.tsx",
    "src/app/layout.tsx",
    "src/components/Header.tsx",
    "src/components/Footer.tsx",
    "src/components/RevealOnScroll.tsx",
    "src/components/JsonLd.tsx",
    "public/css/test.css",
    "public/css/tokens.css",
  ],
  "test-start": [
    "public/test/start.html",
    "public/css/test.css",
    "public/css/tokens.css",
    "public/js/analytics.js",
  ],
  "test-take": [
    "public/test/take.html",
    "public/css/test.css",
    "public/css/tokens.css",
    "public/js/analytics.js",
    "public/js/psychotypes.js",
    "public/js/motion.js",
    "public/js/session.js",
  ],
  login: [
    "public/login.html",
    "public/css/test.css",
    "public/css/tokens.css",
    "public/css/admin.css",
    "public/js/analytics.js",
    "public/js/user-auth.js",
  ],
  cabinet: [
    "public/cabinet.html",
    "public/css/test.css",
    "public/css/tokens.css",
    "public/css/admin.css",
    "public/js/analytics.js",
    "public/js/user-auth.js",
    "public/js/psychotypes.js",
    "public/js/session.js",
  ],
  "admin-login": [
    "public/admin/login.html",
    "public/css/test.css",
    "public/css/tokens.css",
    "public/css/admin.css",
    "public/js/analytics.js",
    "public/js/admin-auth.js",
  ],
  "admin-results": [
    "public/admin/index.html",
    "public/css/test.css",
    "public/css/tokens.css",
    "public/css/admin.css",
    "public/js/analytics.js",
    "public/js/admin-auth.js",
    "public/js/psychotypes.js",
    "public/js/session.js",
  ],
  "demo-result": [
    "public/results.html",
    "public/css/test.css",
    "public/css/tokens.css",
    "public/js/analytics.js",
    "public/js/block-templates.js",
    "public/js/session.js",
    "public/js/user-auth.js",
    "public/js/motion.js",
    "public/js/result-promo.js",
    "public/js/psychotypes.js",
    "src/lib/encdata.ts",
  ],
};

export type PageSelection =
  | { mode: "all"; reason: string }
  | { mode: "subset"; pageNames: string[]; reason: string }
  | { mode: "skip"; reason: string };

function normalizeChangedPath(file: string): string {
  return file.replace(/\\/g, "/").replace(/^tc_26\//, "");
}

function gitLines(args: string[]): string[] {
  try {
    const output = execSync(["git", ...args].join(" "), {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function isGitRepo(): boolean {
  try {
    execSync("git rev-parse --git-dir", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function resolveDiffBase(): string | null {
  const fromEnv = process.env.MOBILE_TEST_BASE?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  for (const candidate of ["origin/main", "main", "HEAD~1"]) {
    try {
      execSync(`git rev-parse --verify ${candidate}`, { stdio: "ignore" });
      return candidate;
    } catch {
      // try next
    }
  }

  return null;
}

export function collectChangedFiles(): string[] {
  if (!isGitRepo()) {
    return [];
  }

  const files = new Set<string>();
  for (const line of gitLines(["diff", "--name-only", "HEAD"])) {
    files.add(normalizeChangedPath(line));
  }
  for (const line of gitLines(["diff", "--name-only", "--cached", "HEAD"])) {
    files.add(normalizeChangedPath(line));
  }

  const base = resolveDiffBase();
  if (base) {
    for (const line of gitLines(["diff", "--name-only", `${base}...HEAD`])) {
      files.add(normalizeChangedPath(line));
    }
  }

  return [...files];
}

function matchesWatchPath(changedFile: string, watchPath: string): boolean {
  if (watchPath.endsWith("/")) {
    return changedFile.startsWith(watchPath);
  }
  return changedFile === watchPath;
}

function shouldRunAll(changedFiles: string[]): boolean {
  return changedFiles.some((file) =>
    RUN_ALL_TRIGGERS.some((trigger) => matchesWatchPath(file, trigger)),
  );
}

export function selectPageNames(changedFiles: string[]): PageSelection {
  if (process.env.MOBILE_TEST_ALL === "1") {
    return { mode: "all", reason: "MOBILE_TEST_ALL=1" };
  }

  if (changedFiles.length === 0) {
    return { mode: "all", reason: "no git changes detected" };
  }

  if (shouldRunAll(changedFiles)) {
    return { mode: "all", reason: "global layout-affecting files changed" };
  }

  const pageNames = new Set<string>();
  for (const file of changedFiles) {
    for (const [pageName, watchPaths] of Object.entries(PAGE_WATCH)) {
      if (watchPaths.some((watchPath) => matchesWatchPath(file, watchPath))) {
        pageNames.add(pageName);
      }
    }
  }

  if (pageNames.size === 0) {
    return {
      mode: "skip",
      reason: "no layout-affected pages in git diff",
    };
  }

  return {
    mode: "subset",
    pageNames: [...pageNames],
    reason: `${pageNames.size} page(s) matched changed files`,
  };
}

export function formatChangedFiles(files: string[], limit = 8): string {
  if (files.length === 0) {
    return "(none)";
  }
  const shown = files.slice(0, limit);
  const suffix = files.length > limit ? `, +${files.length - limit} more` : "";
  return `${shown.join(", ")}${suffix}`;
}
