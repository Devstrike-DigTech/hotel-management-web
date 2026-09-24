#!/usr/bin/env node
/**
 * Performance budget for the Essentials booking-site template (M7): the JavaScript a hotel page
 * transfers on first load must stay under the budget (default 120 KB, compressed as served).
 *
 *   node scripts/perf-budget.mjs [url ...] [--budget-kb 120]
 *
 * Run it against a production server (`pnpm build && pnpm start`) for real numbers; against the
 * dev server it still checks the Essentials home, which ships no script files at all. Other URLs
 * (an Editorial page, say) are measured and reported for comparison with `--report`, without failing.
 * Exits 1 when a budgeted page is over. Uses Playwright's Chromium (PLAYWRIGHT_CHROMIUM or the
 * sandbox's preinstalled build).
 */
import { existsSync } from "node:fs";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const at = args.indexOf("--budget-kb");
const budgetKb = at >= 0 ? Number(args[at + 1]) : 120;
const report = args.filter((a, i) => args[i - 1] === "--report");
const urls = args.filter((a, i) => /^https?:/.test(a) && args[i - 1] !== "--report");
const base = process.env.E2E_BASE_URL || "http://localhost:3000";
if (!urls.length) urls.push(`${base}/h/bodija-heights`);

const preinstalled = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const executablePath = process.env.PLAYWRIGHT_CHROMIUM || (existsSync(preinstalled) ? preinstalled : undefined);
const browser = await chromium.launch({ executablePath });

async function measure(url) {
  const page = await browser.newPage();
  await page.route(/images\.unsplash\.com/, (r) => r.abort());
  const files = [];
  page.on("requestfinished", async (req) => {
    if (req.resourceType() !== "script") return;
    const s = await req.sizes();
    files.push({ url: req.url(), bytes: s.responseBodySize + s.responseHeadersSize });
  });
  const res = await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const inline = await page.evaluate(() =>
    [...document.scripts].filter((s) => !s.src && s.type !== "application/ld+json").reduce((n, s) => n + new TextEncoder().encode(s.textContent ?? "").length, 0),
  );
  await page.close();
  const external = files.reduce((n, f) => n + f.bytes, 0);
  return { url, status: res?.status(), lite: res?.headers()["x-lite"] === "1", files: files.length, external, inline, total: external + inline };
}

let failed = false;
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
for (const url of urls) {
  const m = await measure(url);
  const over = m.total > budgetKb * 1024;
  failed ||= over;
  console.log(`${over ? "OVER " : "ok   "} ${m.url}  scripts: ${m.files} files ${kb(m.external)} + inline ${kb(m.inline)} = ${kb(m.total)} (budget ${budgetKb} KB)${m.lite ? ", served lite" : ""}`);
}
for (const url of report) {
  const m = await measure(url);
  console.log(`info  ${m.url}  scripts: ${m.files} files ${kb(m.external)} + inline ${kb(m.inline)} = ${kb(m.total)}`);
}
await browser.close();
process.exit(failed ? 1 : 0);
