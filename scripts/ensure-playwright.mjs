#!/usr/bin/env node
/**
 * Install Playwright Chromium for local/dev test runs.
 * Skipped in Docker/CI via SKIP_PLAYWRIGHT_INSTALL=1.
 */
import { execSync } from "node:child_process";

if (process.env.SKIP_PLAYWRIGHT_INSTALL === "1") {
  process.exit(0);
}

execSync("npx playwright install chromium", { stdio: "inherit" });
