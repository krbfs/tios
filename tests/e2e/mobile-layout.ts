/**
 * Mobile/responsive layout smoke tests.
 * Checks horizontal overflow, header separation, and key UI visibility.
 *
 * Usage:
 *   npm run test:mobile              # local build + server (default)
 *   npm run test:mobile:all          # all pages × all viewports
 *   MOBILE_TEST_BASE=origin/main npm run test:mobile
 *   BASE_URL=https://… npm run test:mobile   # live prod/staging, no local build
 *   SKIP_BUILD=1 npm run test:mobile         # reuse existing .next build locally
 *   E2E_DEV=1 npm run test:mobile            # next dev, no production build
 */

import { type ChildProcess } from "node:child_process";
import { chromium, type Browser, type Page } from "playwright";
import { getDemoEncdata } from "../../src/lib/encdata";
import {
  collectChangedFiles,
  formatChangedFiles,
  selectPageNames,
} from "./mobile-layout-scope";
import { startTestServer, stopTestServer } from "./start-test-server";

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
  {
    name: "teams",
    path: "/teams.html",
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
    },
  },
  {
    name: "admin-teams",
    path: "/admin/teams.html",
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
    },
  },
  {
    name: "admin-compatibility",
    path: "/admin/compatibility.html",
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
    },
  },
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isServerUp(url: string): Promise<boolean> {
  const attempts = process.env.BASE_URL ? 15 : 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (response.ok) {
        return true;
      }
    } catch {
      // retry below
    }
    if (attempt < attempts - 1) {
      await sleep(2000);
    }
  }
  return false;
}

async function startServer(): Promise<ChildProcess> {
  const useDev =
    process.env.E2E_DEV === "1" || process.env.E2E_MOBILE_DEV === "1";
  console.log(
    `==> starting ${useDev ? "dev" : "prod"} server on ${ROOT_URL}`,
  );
  return startTestServer({
    port: PORT,
    rootUrl: ROOT_URL,
    useDev,
    skipBuild: process.env.SKIP_BUILD === "1",
    verbose: process.env.E2E_MOBILE_VERBOSE === "1",
  });
}

async function stopServer(child: ChildProcess | null) {
  await stopTestServer(child);
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
    await page.route("**/api/teams", async (route) => {
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
    await page.route("**/api/admin/teams**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      });
    });
    await page.route("**/api/compatibility**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          psychotypes: ["influencer", "analyst"],
          matrix: [
            [
              { compatibility_level: "self" },
              { compatibility_level: "effective", recommendation: "ok" },
            ],
            [
              { compatibility_level: "conflict", recommendation: "care" },
              { compatibility_level: "self" },
            ],
          ],
        }),
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

  const brand = page
    .locator(
      'header .site-header-logo, header .site-header-brand, header strong, header a[href="/"], header a[href="/test/start.html"]',
    )
    .first();

  if ((await brand.count()) === 0) {
    return;
  }

  const brandBox = await brand.boundingBox();
  if (!brandBox) {
    throw new Error("header brand bounding box missing");
  }

  const viewport = page.viewportSize();
  const isMobile = viewport ? viewport.width < 1024 : false;

  if (isMobile) {
    const burger = page.locator("header .site-header-burger").first();
    if ((await burger.count()) === 0) {
      return;
    }
    const burgerBox = await burger.boundingBox();
    if (!burgerBox) {
      throw new Error("header burger bounding box missing");
    }
    if (burgerBox.x < brandBox.x + brandBox.width - 4) {
      throw new Error("header burger overlaps brand link");
    }
    if (viewport && burgerBox.x + burgerBox.width > viewport.width + 1) {
      throw new Error("header burger clipped outside viewport");
    }
    return;
  }

  const login = page
    .locator(
      'header a.btn, header [data-ga-event="cta_header_login"], header #cabinet-link',
    )
    .first();

  if ((await login.count()) === 0) {
    return;
  }

  const loginBox = await login.boundingBox();
  if (!loginBox) {
    throw new Error("header login bounding box missing");
  }

  if (loginBox.x < brandBox.x + brandBox.width - 4) {
    throw new Error("header login overlaps brand link");
  }

  if (viewport && loginBox.x + loginBox.width > viewport.width + 1) {
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
