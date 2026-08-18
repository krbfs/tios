/**
 * Run all content import scripts against DATABASE_URL (prod or local).
 * Usage: npm run db:import-all
 */
import { execSync } from "node:child_process";

const STEPS = [
  "db:import-questions",
  "db:import-content",
  "db:import-insighter-you",
  "db:import-insighter",
  "db:import-stressless",
  "db:import-hr-table",
] as const;

for (const script of STEPS) {
  console.log(`\n=== ${script} ===`);
  execSync(`npm run ${script}`, { stdio: "inherit" });
}

console.log("\nAll imports finished.");
