// Copies ONLY the website into a folder for GitHub Pages (.github/workflows/publish.yml).
// The legacy Pages build served the whole branch, so the notes, tools and data in this repo were
// public at brothersplace.org (found 2026-09-25, fixed 2026-11-01). Same fix as client-elite-catastrophe.
// A new top-level folder of webpages has to be added to DIRS, or the sitemap gate below stops the publish.
// A new file type has to be added to SHIPPABLE, or the gate below stops the publish. Add it only if it belongs on the website.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, resolve, dirname, relative, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, process.argv[2] || '_site');
const DIRS = ["about","contact","css","get-help","get-involved","images","js","legal","programs","stories"];
const TOP = new RegExp("\\.(html?|xml)$|^(robots|llms|llms-full|humans|ads|security)\\.txt$|^[0-9a-f]{16,}\\.txt$|\\.(css|png|jpe?g|webp|svg|gif|ico|webmanifest|woff2?|avif)$|^CNAME$|^\\.nojekyll$", 'i');
const KEEP = new Set(["robots.txt"]); // Internal-looking files the website really links to.
const DROP = []; // Inside DIRS, but not part of the website.
const INTERNAL = /\.(md|markdown|py|pyc|mjs|cjs|ts|tsx|jsx|eml|msg|log|csv|tsv|ps1|bat|cmd|sh|bash|env|sql|db|sqlite|ya?ml|toml|ini|cfg|conf|lock|bak|orig|tmp|patch|diff|ipynb|key|pem|p12|har|rtf|docx?|xlsx?|pptx?|zip|tar|gz|scss|sass|proposed)$/i;
const SHIPPABLE = new Set(["",".css",".html",".ico",".jpg",".js",".png",".svg",".txt",".xml"]);
const PRIVATE = new RegExp("pit-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|gh[pousr]_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{40,}|\\d{8,11}:AA[A-Za-z0-9_-]{30,40}|AIza[0-9A-Za-z_-]{35}|GOCSPX-[A-Za-z0-9_-]{20,}|(?:sk|rk)_live_[A-Za-z0-9]{16,}|whsec_[A-Za-z0-9]{16,}|BEGIN [A-Z ]*PRIVATE KEY|\\b\\d{2}-\\d{7}\\b");
const KNOWN_MISSING = new Set([]); // Sitemap URLs that were already 404 before this file existed.

const rel = p => relative(ROOT, p).replace(/\\/g, '/');
const wanted = src => {
  const r = rel(src);
  if (KEEP.has(r)) return true;
  if (DROP.some(d => r === d || r.startsWith(d + '/'))) return false;
  const name = basename(src);
  if (statSync(src).isDirectory()) return !name.startsWith('.') || name === '.well-known';
  if (name.startsWith('.') || INTERNAL.test(name)) return false;
  return !/\.txt$/i.test(name) || /(licen[cs]e|^ofl|notice)/i.test(name);
};

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const n of readdirSync(ROOT)) {
  if (statSync(join(ROOT, n)).isFile() && TOP.test(n) && !DROP.includes(n)) cpSync(join(ROOT, n), join(OUT, n));
}
for (const k of KEEP) { mkdirSync(dirname(join(OUT, k)), { recursive: true }); cpSync(join(ROOT, k), join(OUT, k)); }
for (const d of DIRS) cpSync(join(ROOT, d), join(OUT, d), { recursive: true, filter: wanted });

const walk = (dir, out = []) => {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
};
const files = walk(OUT);
const errors = [];

// Presence: every webpage the sitemap promises is in the folder.
let locs = [];
if (existsSync(join(OUT, 'sitemap.xml'))) {
  locs = [...readFileSync(join(OUT, 'sitemap.xml'), 'utf8').matchAll(/<loc>\s*https?:\/\/[^/]+\/([^<\s]*)\s*<\/loc>/g)].map(m => decodeURI(m[1]).replace(/^Brothers-Place-V2\//, ''));
  if (!locs.length) errors.push('sitemap.xml has no URLs');
}
for (const loc of locs) {
  if (KNOWN_MISSING.has(loc)) continue;
  const clean = loc.replace(/\/$/, '');
  const found = loc === '' || [clean, clean + '.html', clean + '/index.html'].some(f => existsSync(join(OUT, f)) && statSync(join(OUT, f)).isFile());
  if (!found) errors.push('sitemap lists /' + loc + ' but it was not collected');
}
for (const need of ["index.html","robots.txt","CNAME","sitemap.xml"]) {
  if (!existsSync(join(OUT, need))) errors.push('missing ' + need);
}

// Absence: nothing internal, and no private string in anything text-based.
for (const f of files) {
  const r = relative(OUT, f).replace(/\\/g, '/');
  const ext = extname(r).toLowerCase();
  if (!SHIPPABLE.has(ext) && !KEEP.has(r)) errors.push('internal file type in the website: ' + r);
  if (['.html', '.xml', '.txt', '.css', '.js'].includes(ext) && PRIVATE.test(readFileSync(f, 'utf8'))) errors.push('private value in a published file: ' + r);
}

if (errors.length) {
  console.error('✗ collect-site failed (' + errors.length + '):');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log('✓ collect-site: ' + files.length + ' files, ' + locs.length + ' sitemap URLs present, nothing internal');
