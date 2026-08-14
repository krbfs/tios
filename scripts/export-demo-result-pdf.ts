import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { getDemoEncdata } from "../src/lib/encdata";

async function main() {
  const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
  const encdata = getDemoEncdata();
  const url = `${baseUrl}/quiz/result?encdata=${encodeURIComponent(encdata)}`;

  const outDir = path.join(process.cwd(), "public");
  const outFile = path.join(outDir, "demo-result.pdf");

  mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });

  await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForFunction(
    () => {
      const title = document.getElementById("result-title")?.textContent ?? "";
      return title.length > 0 && !title.includes("Загрузка");
    },
    { timeout: 60_000 },
  );
  await page.waitForFunction(() => Chart.getChart("radar-chart") != null);
  await page.evaluate(() => {
    document.querySelector(".chart-card--systemic")?.scrollIntoView({ block: "center" });
  });
  await page.waitForFunction(
    () => document.querySelector(".chart-card--systemic.chart-card--in-view") != null,
  );
  await page.waitForTimeout(800);

  await page.addStyleTag({
    content: `
      .site-header,
      #result-link-section,
      .actions,
      #copy-hint,
      #copy-status { display: none !important; }
      .chart-card { break-inside: avoid; page-break-inside: avoid; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    `,
  });

  await page.pdf({
    path: outFile,
    format: "A4",
    printBackground: true,
    margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
  });

  await browser.close();

  console.log(outFile);
  console.log(url);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
