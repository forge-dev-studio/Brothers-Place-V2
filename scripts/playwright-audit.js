#!/usr/bin/env node
/**
 * Brother's Place V2 - Playwright audit harness.
 *
 * Spawns a local http.server, navigates to every page in the site under
 * /Brothers-Place-V2/ at desktop (1440x900) and mobile (390x844), takes full-page
 * screenshots, captures console + pageerror events, captures all failed network
 * requests, and writes a report to tests/playwright/audit-report.json.
 *
 * Exits non-zero if any page has console errors, page errors, or 4xx/5xx asset
 * loads.
 *
 * Usage:
 *   node scripts/playwright-audit.js                     # full audit, all pages
 *   node scripts/playwright-audit.js index               # single page
 *   node scripts/playwright-audit.js --no-server         # use already-running server on 5500
 */

const { chromium, devices } = require("playwright");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = "C:/Users/corey/Desktop/Brothers-Place";
const PORT = 5500;
const BASE = `http://127.0.0.1:${PORT}/Brothers-Place-V2/`;
const SCREEN_DIR = path.join(ROOT, "tests/playwright/screenshots");
const REPORT_PATH = path.join(ROOT, "tests/playwright/audit-report.json");

const PAGES = [
  { slug: "index",                          path: "" },
  { slug: "about-our-story",                path: "about/our-story/" },
  { slug: "about-leadership",               path: "about/leadership/" },
  { slug: "about-faith-foundation",         path: "about/faith-foundation/" },
  { slug: "about-financials",               path: "about/financials/" },
  { slug: "programs-supportive-housing",    path: "programs/supportive-housing/" },
  { slug: "programs-case-management",       path: "programs/case-management/" },
  { slug: "programs-spiritual-formation",   path: "programs/spiritual-formation/" },
  { slug: "programs-reintegration-and-jobs",path: "programs/reintegration-and-jobs/" },
  { slug: "get-help",                       path: "get-help/" },
  { slug: "get-help-apply",                 path: "get-help/apply/" },
  { slug: "get-help-eligibility-and-faq",   path: "get-help/eligibility-and-faq/" },
  { slug: "get-help-resources",             path: "get-help/resources/" },
  { slug: "get-involved-donate",            path: "get-involved/donate/" },
  { slug: "get-involved-volunteer",         path: "get-involved/volunteer/" },
  { slug: "get-involved-church-partners",   path: "get-involved/church-partners/" },
  { slug: "get-involved-events",            path: "get-involved/events/" },
  { slug: "stories",                        path: "stories/" },
  { slug: "contact",                        path: "contact/" },
  { slug: "legal",                          path: "legal/" },
];

function startServer() {
  // Serve the parent directory so /Brothers-Place-V2/ in URLs resolves to this repo,
  // mirroring how GitHub Pages serves the site under that subpath.
  const py = process.platform === "win32" ? "py" : "python";
  const parent = path.resolve(ROOT, "..");
  const child = spawn(py, ["-m", "http.server", String(PORT)], {
    cwd: parent,
    stdio: "ignore",
    detached: false,
  });
  return child;
}

async function waitForServer(timeoutMs = 6000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const res = await fetch(`${BASE}index.html`);
      if (res.ok || res.status === 404) return true;
    } catch (_) {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error("server did not come up");
}

async function auditOne(browser, page, viewport, slug, route) {
  const errors = { console: [], pageerror: [], failed: [] };
  const url = BASE + route;

  page.on("console", (msg) => {
    if (msg.type() === "error") errors.console.push(msg.text());
  });
  page.on("pageerror", (err) => errors.pageerror.push(err.message || String(err)));
  page.on("requestfailed", (req) => errors.failed.push({
    url: req.url(),
    method: req.method(),
    error: req.failure()?.errorText || "failed",
  }));
  page.on("response", (res) => {
    const s = res.status();
    if (s >= 400) errors.failed.push({ url: res.url(), method: res.request().method(), status: s });
  });

  let nav;
  try {
    nav = await page.goto(url, { waitUntil: "networkidle", timeout: 25000 });
  } catch (e) {
    errors.pageerror.push("nav: " + e.message);
  }

  // Force-reveal all .fade-up elements (full-page screenshot doesn't reliably
  // fire IntersectionObserver for offscreen content during capture).
  // Also force count-up to its final value AND drop the data-count attribute
  // so the page's IntersectionObserver in main.js does not later restart the
  // animation from 0 when the element scrolls into view during full-page capture.
  await page.evaluate(() => {
    document.querySelectorAll('.fade-up').forEach(el => el.classList.add('is-visible'));
    document.querySelectorAll('[data-count]').forEach(el => {
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || '';
      const prefix = el.dataset.prefix || '';
      if (Number.isFinite(target)) {
        el.textContent = prefix + target.toLocaleString() + suffix;
      }
      // Remove the attribute so any pending observer on this element no-ops.
      el.removeAttribute('data-count');
    });
  });
  // Wait long enough for any in-flight count-up that had already started before
  // the eval (1.8s in main.js) to fully resolve. animateCount in main.js bails
  // early if data-count is stripped, which the eval above ensures.
  await page.waitForTimeout(2200);

  const dirOut = path.join(SCREEN_DIR, viewport.name);
  fs.mkdirSync(dirOut, { recursive: true });
  const outPath = path.join(dirOut, `${slug}.png`);
  try {
    await page.screenshot({ path: outPath, fullPage: true });
  } catch (e) {
    errors.pageerror.push("screenshot: " + e.message);
  }

  return {
    slug,
    url,
    viewport: viewport.name,
    httpStatus: nav?.status() ?? null,
    consoleErrors: errors.console,
    pageErrors: errors.pageerror,
    failedRequests: errors.failed,
    screenshot: path.relative(ROOT, outPath).replace(/\\/g, "/"),
  };
}

(async () => {
  const args = process.argv.slice(2);
  const filterSlug = args.find(a => !a.startsWith("--"));
  const noServer = args.includes("--no-server");

  const targetPages = filterSlug ? PAGES.filter(p => p.slug === filterSlug) : PAGES;
  if (filterSlug && !targetPages.length) {
    console.error(`No page matched slug: ${filterSlug}`);
    process.exit(2);
  }

  let server;
  if (!noServer) {
    server = startServer();
    await waitForServer();
  }

  console.log(`Auditing ${targetPages.length} pages at desktop + mobile ...`);

  const browser = await chromium.launch();

  const viewports = [
    { name: "desktop", config: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile",  config: { ...devices["iPhone 14"] } },
  ];

  const reports = [];
  try {
    for (const vp of viewports) {
      const ctx = await browser.newContext(vp.config);
      for (const p of targetPages) {
        const page = await ctx.newPage();
        const r = await auditOne(browser, page, vp, p.slug, p.path);
        reports.push(r);
        const issues = r.consoleErrors.length + r.pageErrors.length + r.failedRequests.length;
        const status = issues === 0 ? "OK" : `WARN(${issues})`;
        console.log(`  ${vp.name.padEnd(7)} ${p.slug.padEnd(34)} ${status}`);
        await page.close();
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
    if (server) {
      try { server.kill(); } catch (_) {}
    }
  }

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(reports, null, 2));

  const totalIssues = reports.reduce((n, r) =>
    n + r.consoleErrors.length + r.pageErrors.length + r.failedRequests.length, 0);

  console.log(`\nReport: ${REPORT_PATH}`);
  console.log(`Total issues across all pages: ${totalIssues}`);

  if (totalIssues > 0) {
    console.log("\nFAIL summary:");
    reports.forEach(r => {
      const n = r.consoleErrors.length + r.pageErrors.length + r.failedRequests.length;
      if (!n) return;
      console.log(`  ${r.viewport}/${r.slug}:`);
      r.consoleErrors.forEach(e => console.log(`    console: ${e}`));
      r.pageErrors.forEach(e => console.log(`    page:    ${e}`));
      r.failedRequests.forEach(e => console.log(`    asset:   [${e.status || e.error}] ${e.url}`));
    });
  }

  process.exit(totalIssues === 0 ? 0 : 1);
})().catch((e) => {
  console.error("FATAL:", e);
  process.exit(2);
});
