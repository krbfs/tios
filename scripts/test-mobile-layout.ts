/**
 * Mobile/responsive layout smoke tests.
 * Checks horizontal overflow, header separation, and key UI visibility.
 *
 * Usage:
 *   npm run test:mobile              # only pages affected by git changes
 *   npm run test:mobile:all          # all pages × all viewports
 *   MOBILE_TEST_BASE=origin/main npm run test:mobile
 *   BASE_URL=http://localhost:3000 npm run test:mobile
 *   SKIP_BUILD=1 npm run test:mobile   # reuse existing .next build
 */

import { spawn, type ChildProcess } from "node:child_process";
import { chromium, type Browser, type Page } from "playwright";
import { getDemoEncdata } from "../src/lib/encdata";
import {
  collectChangedFiles,
  formatChangedFiles,
  selectPageNames,
} from "./mobile-layout-scope";

const ROOT_URL = (process.env.BASE_URL ?? "http://127.0.0.1:3099").replace(/\/$/, "");
const PORT = new URL(ROOT_URL).port || "3099";
const MANAGE_SERVER = process.env.BASE_URL == null;

const VIEWPORTS = [
  { name: "iphone-se", width: 375, height: 667 },
  { name: "iphone-14", width: 390, height: 844 },
  { name: "android-narrow", width: 360, height: 640 },
  { name: "ipad", width: 768, height: 1024 },
  { name: "laptop", width: 1280, height: 800 },
] as const;

type PageCase = {
  name: string;
  path: string;
  initScript?: () => void;
  mockApi?: "user" | "admin";
  ready?: (page: Page) => Promise<void>;
};

const PAGES: PageCase[] = [
  { name: "home", path: "/" },
  { name: "test-start", path: "/test/start.html" },
  {
    name: "test-take",
    path: "/test/take.html",
    ready: async (page) => {
      await page
        .waitForFunction(
          () => {
            const label = document.getElementById("progress-label")?.textContent ?? "";
            return label.length > 0 && !label.includes("Загрузка");
          },
          { timeout: 30_000 },
        )
        .catch(() => undefined);
    },
  },
  {
    name: "login",
    path: "/login.html",
    ready: async (page) => {
      await page.locator("h1").waitFor({ state: "visible", timeout: 10_000 });
      await page.locator("#login-form").waitFor({ state: "visible", timeout: 10_000 });
    },
  },
  {
    name: "cabinet",
    path: "/cabinet.html",
    mockApi: "user",
    initScript: () => {
      localStorage.setItem("tc26_access_token", "layout-test-token");
      localStorage.setItem(
        "tc26_user",
        JSON.stringify({ email: "user@layout.test", role: "user" }),
      );
    },
    ready: async (page) => {
      await page.locator("h1").waitFor({ state: "visible", timeout: 10_000 });
      await page.locator(".admin-table").waitFor({ state: "visible", timeout: 10_000 });
    },
  },
  {
    name: "admin-login",
    path: "/admin/login.html",
    ready: async (page) => {
      await page.locator("h1").waitFor({ state: "visible", timeout: 10_000 });
      await page.locator("#login-form").waitFor({ state: "visible", timeout: 10_000 });
    },
  },
  {
    name: "admin-results",
    path: "/admin/index.html",
    mockApi: "admin",
    initScript: () => {
      localStorage.setItem("tc26_access_token", "layout-test-token");
      localStorage.setItem(
        "tc26_user",
        JSON.stringify({ email: "admin@layout.test", role: "admin" }),
      );
    },
    ready: async (page) => {
      await page.locator("h1").waitFor({ state: "visible", timeout: 10_000 });
      await page.locator(".admin-table").waitFor({ state: "visible", timeout: 10_000 });
    },
  },
  {
    name: "demo-result",
    path: `/quiz/result?encdata=${encodeURIComponent(getDemoEncdata())}`,
    ready: async (page) => {
      await page.waitForFunction(
        () => {
          const title = document.getElementById("result-title")?.textContent ?? "";
          return title.length > 0 && !title.includes("Загрузка");
        },
        { timeout: 60_000 },
      );
    },
  },
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isServerUp(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return response.ok;
  } catch {
    return false;
  }
}

function runCommand(command: string, args: string[], env: NodeJS.ProcessEnv) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
      }
    });
  });
}

async function startServer(): Promise<ChildProcess> {
  if (process.env.SKIP_BUILD !== "1") {
    console.log("==> building Next.js for mobile layout tests");
    await runCommand("npm", ["run", "build"], process.env);
  }

  console.log(`==> starting server on ${ROOT_URL}`);
  const child = spawn("npm", ["run", "start"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT, HOSTNAME: "127.0.0.1" },
    stdio: "pipe",
  });

  for (let attempt = 0; attempt < 90; attempt += 1) {
    if (await isServerUp(ROOT_URL)) {
      return child;
    }
    await sleep(1000);
  }

  child.kill();
  throw new Error(`Server did not become ready at ${ROOT_URL}`);
}

async function stopServer(child: ChildProcess | null) {
  if (!child || child.killed) {
    return;
  }
  child.kill("SIGTERM");
  await sleep(500);
  if (!child.killed) {
    child.kill("SIGKILL");
  }
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });
  if (overflow > 1) {
    throw new Error(`horizontal overflow ${overflow}px`);
  }
}

async function mockLayoutApi(page: Page, mockApi: "user" | "admin") {
  if (mockApi === "user") {
    await page.route("**/api/results/history", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      });
    });
  }

  if (mockApi === "admin") {
    await page.route("**/api/admin/results**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      });
    });
  }
}

async function assertHeaderLayout(page: Page) {
  const headers = page.locator("header");
  if ((await headers.count()) === 0) {
    return;
  }

  const header = headers.first();
  await header.waitFor({ state: "visible", timeout: 10_000 });

  const login = page
    .locator(
      'header a.btn, header [data-ga-event="cta_header_login"], header #cabinet-link',
    )
    .first();
  const brand = page
    .locator(
      'header .site-header-logo, header .site-header-brand, header strong, header a[href="/"], header a[href="/test/start.html"]',
    )
    .first();

  if ((await login.count()) === 0 || (await brand.count()) === 0) {
    return;
  }

  const loginBox = await login.boundingBox();
  const brandBox = await brand.boundingBox();
  if (!loginBox || !brandBox) {
    throw new Error("header brand/login bounding boxes missing");
  }

  if (loginBox.x < brandBox.x + brandBox.width - 4) {
    throw new Error("header login overlaps brand link");
  }

  const viewport = page.viewportSize();
  if (!viewport) {
    return;
  }

  if (loginBox.x + loginBox.width > viewport.width + 1) {
    throw new Error("header login button clipped outside viewport");
  }
}

async function assertMainVisible(page: Page) {
  const main = page.locator("main, #result-card, .card").first();
  await main.waitFor({ state: "visible", timeout: 10_000 });

  const box = await main.boundingBox();
  if (!box || box.width <= 0 || box.height <= 0) {
    throw new Error("main content has zero size");
  }
}

async function checkPage(browser: Browser, viewport: (typeof VIEWPORTS)[number], pageCase: PageCase) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    locale: "ru-RU",
  });
  if (pageCase.initScript) {
    await context.addInitScript(pageCase.initScript);
  }
  const page = await context.newPage();

  try {
    if (pageCase.mockApi) {
      await mockLayoutApi(page, pageCase.mockApi);
    }

    const response = await page.goto(`${ROOT_URL}${pageCase.path}`, {
      waitUntil: "load",
      timeout: 120_000,
    });
    if (!response?.ok()) {
      throw new Error(`HTTP ${response?.status() ?? "no response"}`);
    }

    if (pageCase.ready) {
      await pageCase.ready(page);
    }

    await assertNoHorizontalOverflow(page);
    await assertHeaderLayout(page);
    await assertMainVisible(page);
  } finally {
    await context.close();
  }
}

function resolvePagesToTest() {
  const changedFiles = collectChangedFiles();
  const selection = selectPageNames(changedFiles);

  console.log(`==> mobile layout scope: ${selection.reason}`);
  if (changedFiles.length > 0) {
    console.log(`==> changed files: ${formatChangedFiles(changedFiles)}`);
  }

  if (selection.mode === "skip") {
    return { pages: [] as PageCase[], selection, changedFiles };
  }

  if (selection.mode === "all") {
    return { pages: PAGES, selection, changedFiles };
  }

  const selected = new Set(selection.pageNames);
  const pages = PAGES.filter((pageCase) => selected.has(pageCase.name));
  console.log(`==> pages: ${pages.map((pageCase) => pageCase.name).join(", ")}`);
  return { pages, selection, changedFiles };
}

async function main() {
  const { pages, selection } = resolvePagesToTest();

  if (pages.length === 0) {
    console.log("Mobile layout tests skipped (no affected pages).");
    return;
  }

  let server: ChildProcess | null = null;

  if (MANAGE_SERVER) {
    if (!(await isServerUp(ROOT_URL))) {
      server = await startServer();
    }
  } else if (!(await isServerUp(ROOT_URL))) {
    throw new Error(`BASE_URL is not reachable: ${ROOT_URL}`);
  }

  const browser = await chromium.launch();
  const failures: string[] = [];

  try {
    for (const viewport of VIEWPORTS) {
      for (const pageCase of pages) {
        const label = `${pageCase.name} @ ${viewport.name} (${viewport.width}x${viewport.height})`;
        process.stdout.write(`==> ${label} ... `);
        try {
          await checkPage(browser, viewport, pageCase);
          console.log("ok");
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.log("FAIL");
          failures.push(`${label}: ${message}`);
        }
      }
    }
  } finally {
    await browser.close();
    await stopServer(server);
  }

  if (failures.length > 0) {
    console.error("\nMobile layout failures:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  const scopeLabel =
    selection.mode === "all"
      ? `${pages.length} pages (full suite)`
      : `${pages.length} changed page(s)`;
  console.log(
    `\nMobile layout tests passed (${VIEWPORTS.length} viewports × ${scopeLabel}).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
