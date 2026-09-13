/**
 * Browser e2e: open Chromium, pass consent → 75 answers → result page,
 * assert psychotype (and key scales) match fixtures.
 *
 * Usage:
 *   npm run test:e2e-quiz                 # smoke subset + local build/server
 *   E2E_QUIZ_ALL=1 npm run test:e2e-quiz  # all fixtures in E2E_QUIZ_TESTS.md
 *   E2E_QUIZ_CASES=empath,analyst npm run test:e2e-quiz
 *   BASE_URL=https://tios-test.com npm run test:e2e-quiz
 *   SKIP_BUILD=1 npm run test:e2e-quiz
 *   HEADED=1 npm run test:e2e-quiz
 *
 * Notes:
 * - Answers are entered through the real UI (desktop radios).
 * - time_per_question is rewritten on submit to human-like values so antibot
 *   (min 120s) does not force a 2+ minute wait per scenario.
 */

import { type ChildProcess } from "node:child_process";
import { chromium, type Browser, type Page } from "playwright";

import {
  humanLikeTimings,
  selectQuizFixtures,
  type QuizE2EFixture,
} from "./e2e-quiz-fixtures";
import { startTestServer, stopTestServer } from "./start-test-server";

const ROOT_URL = (process.env.BASE_URL ?? "http://127.0.0.1:3101").replace(/\/$/, "");
const PORT = new URL(ROOT_URL).port || "3101";
const MANAGE_SERVER = process.env.BASE_URL == null;
const HEADED = process.env.HEADED === "1";
const TOTAL = 75;
const PER_PAGE = 5;
const TOTAL_PAGES = TOTAL / PER_PAGE;

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
      // retry
    }
    if (attempt < attempts - 1) {
      await sleep(2000);
    }
  }
  return false;
}

async function startServer(): Promise<ChildProcess> {
  const useDev =
    process.env.E2E_DEV === "1" || process.env.E2E_QUIZ_DEV === "1";
  console.log(
    `==> starting ${useDev ? "dev" : "prod"} server on ${ROOT_URL}`,
  );
  return startTestServer({
    port: PORT,
    rootUrl: ROOT_URL,
    useDev,
    skipBuild: process.env.SKIP_BUILD === "1",
    verbose: process.env.E2E_QUIZ_VERBOSE === "1",
  });
}

async function stopServer(child: ChildProcess | null) {
  await stopTestServer(child);
}

async function padSubmitTimings(page: Page) {
  const timings = humanLikeTimings();
  await page.route("**/api/test/submit", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    const raw = route.request().postData() ?? "{}";
    let body: {
      answers?: number[];
      time_per_question?: number[];
      session_uuid?: string;
    };
    try {
      body = JSON.parse(raw) as typeof body;
    } catch {
      await route.continue();
      return;
    }
    body.time_per_question = timings;
    await route.continue({
      postData: JSON.stringify(body),
      headers: {
        ...route.request().headers(),
        "content-type": "application/json",
      },
    });
  });
}

async function startQuizFromLanding(page: Page) {
  await page.goto(`${ROOT_URL}/test/start.html`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.locator("#consent").check();
  await page.locator("#start-btn").waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    const btn = document.getElementById("start-btn") as HTMLButtonElement | null;
    return Boolean(btn && !btn.disabled);
  });

  const errorBefore = page.locator("#error");
  await page.locator("#start-btn").click();

  try {
    await page.waitForURL(/\/test\/take\.html/, { timeout: 60_000 });
  } catch (err) {
    const visibleError = (await errorBefore.isVisible().catch(() => false))
      ? await errorBefore.textContent()
      : null;
    throw new Error(
      `Did not reach take.html after start. UI error: ${visibleError ?? "(none)"}. ${
        err instanceof Error ? err.message : err
      }`,
    );
  }

  await page.waitForFunction(
    () => {
      const label = document.getElementById("progress-label")?.textContent ?? "";
      return label.includes("Вопросы") && !label.includes("Загрузка");
    },
    { timeout: 60_000 },
  );
}

async function answerAllPages(page: Page, answers: number[]) {
  for (let pageIndex = 0; pageIndex < TOTAL_PAGES; pageIndex += 1) {
    const start = pageIndex * PER_PAGE;
    for (let offset = 0; offset < PER_PAGE; offset += 1) {
      const qi = start + offset;
      const value = answers[qi];
      const radio = page.locator(
        `input[name="answer-${qi}"][value="${value}"]`,
      );
      await radio.waitFor({ state: "attached", timeout: 15_000 });
      await radio.check({ force: true });
    }

    await page.locator("#next-btn").click();

    if (pageIndex < TOTAL_PAGES - 1) {
      await page.waitForFunction(
        (expectedFirst) => {
          const label = document.getElementById("progress-label")?.textContent ?? "";
          return label.includes(`Вопросы ${expectedFirst}–`);
        },
        start + PER_PAGE + 1,
        { timeout: 30_000 },
      );
      continue;
    }

    const modalSubmit = page.locator("#modal-submit");
    if (await modalSubmit.isVisible().catch(() => false)) {
      await modalSubmit.click();
    }
  }
}

async function waitForResult(page: Page) {
  await page.waitForURL(/\/quiz\/result/, { timeout: 90_000 });
  await page.waitForFunction(
    () => {
      const title = document.getElementById("psychotype-title")?.textContent ?? "";
      return title.includes("Основной психотип:");
    },
    { timeout: 90_000 },
  );
}

type EncdataPayload = {
  psychotype_code?: string;
  scaled_scores?: Record<string, number>;
};

async function runFixture(browser: Browser, fixture: QuizE2EFixture) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  await padSubmitTimings(page);

  let encPayload: EncdataPayload | null = null;
  page.on("response", async (response) => {
    if (!response.url().includes("/api/results/by-encdata")) {
      return;
    }
    if (!response.ok()) {
      return;
    }
    try {
      encPayload = (await response.json()) as EncdataPayload;
    } catch {
      // ignore
    }
  });

  console.log(`--> ${fixture.id}: ${fixture.title}`);
  await startQuizFromLanding(page);
  await answerAllPages(page, fixture.answers);
  await waitForResult(page);

  const psychotypeTitle = (await page.locator("#psychotype-title").textContent()) ?? "";
  const titleLower = psychotypeTitle.toLowerCase();
  const expectedLower = fixture.expectedTitleContains.toLowerCase();
  if (!titleLower.includes(expectedLower)) {
    throw new Error(
      `[${fixture.id}] psychotype title expected to contain "${fixture.expectedTitleContains}", got "${psychotypeTitle}"`,
    );
  }

  // Prefer API payload when captured; fall back to title-only.
  if (encPayload?.psychotype_code) {
    if (encPayload.psychotype_code !== fixture.expectedPsychotype) {
      throw new Error(
        `[${fixture.id}] psychotype_code expected ${fixture.expectedPsychotype}, got ${encPayload.psychotype_code}`,
      );
    }
    if (fixture.expectedScaleMins && encPayload.scaled_scores) {
      for (const [key, min] of Object.entries(fixture.expectedScaleMins)) {
        const actual = Number(encPayload.scaled_scores[key] ?? 0);
        if (actual < min) {
          throw new Error(
            `[${fixture.id}] scale ${key} expected >= ${min}, got ${actual}`,
          );
        }
      }
    }
  } else {
    console.warn(
      `  warn: by-encdata payload not captured; UI title check only for ${fixture.id}`,
    );
  }

  await context.close();
  console.log(`  ok ${fixture.id} → ${fixture.expectedPsychotype}`);
}

async function main() {
  const fixtures = selectQuizFixtures();
  console.log(`==> e2e quiz: ${fixtures.length} scenario(s) against ${ROOT_URL}`);

  let server: ChildProcess | null = null;
  if (MANAGE_SERVER) {
    if (await isServerUp(ROOT_URL)) {
      console.log("==> reusing already running local server");
    } else {
      server = await startServer();
    }
  } else if (!(await isServerUp(ROOT_URL))) {
    throw new Error(`BASE_URL ${ROOT_URL} is not reachable`);
  }

  const browser = await chromium.launch({ headless: !HEADED });
  const failures: string[] = [];

  try {
    for (const fixture of fixtures) {
      try {
        await runFixture(browser, fixture);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`  FAIL ${fixture.id}: ${message}`);
        failures.push(`${fixture.id}: ${message}`);
      }
    }
  } finally {
    await browser.close();
    await stopServer(server);
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} e2e quiz scenario(s) failed:`);
    for (const line of failures) {
      console.error(` - ${line}`);
    }
    process.exit(1);
  }

  console.log("\nAll e2e quiz scenarios passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
