// Writes llms.txt (llmstxt.org format) into the published folder from the same sitemap.xml the website
// publishes, so the file never goes out of date. Run it right after tools/collect-site.mjs in
// .github/workflows/publish.yml:   node tools/build-llms.mjs _site
// It reads each webpage's own <title> and meta description from the repo and writes no prose of its own.
// Left out: webpages marked noindex, utility webpages (404, privacy, terms, thank-you) and anything not in the sitemap.
// A title or description that holds a dollar figure or an em or en dash keeps its link and drops the words.
// No prices anywhere. Stops the publish if the finished file misses or repeats a sitemap webpage, or holds a "$".
// Test: npm test
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, process.argv[2] || '_site');

// ---- The part that is specific to this website ----
const SITEMAP = 'sitemap.xml';
const NAME_TYPE = /NonprofitOrganization|LocalBusiness/;  // schema type on the homepage that carries the name
const PLACE = /Rome, (GA|Georgia)/;                       // the town, exactly as the homepage prints it
const HOME_GROUP = 'About';                               // the homepage is listed first in this section
const DEFAULT_GROUP = 'About';                            // any webpage no rule below catches
const GROUPS = [                                          // first match on the path (no slashes at the ends, no .html) wins
  ['Programs', /^programs(\/|$)/],
  ['Get help', /^get-help(\/|$)/],
  ['Get involved', /^get-involved(\/|$)/],
  ['Stories', /^stories(\/|$)/],
  ['About', /^(about|contact)(\/|$)/],
];
const ORDER = ['Programs', 'Get help', 'Get involved', 'Stories', 'About'];
const ALSO_LEFT_OUT = /^legal(\/|$)/;                     // the Privacy and Terms webpage
const NO_DESCRIPTION = new Set(['get-help/resources']);   // client rule: these lines carry the link and the title only
// ---- End of the website-specific part ----

const LEFT_OUT = /(^|\/)(404|privacy|terms|thank-?you|thanks)(\/|$)/i;   // utility webpages
const PRICE = /\$|\bdollars?\b|\bUSD\b/i;
const DASH = /[\u2013\u2014]/;                                              // no em or en dashes in website copy
const drop = s => PRICE.test(s) || DASH.test(s);                            // words that keep the link but not the text

const problems = [];
const read = f => readFileSync(f, 'utf8').replace(/\r\n?/g, '\n');
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '\u2019', lsquo: '\u2018', rdquo: '\u201d', ldquo: '\u201c', mdash: '\u2014', ndash: '\u2013', hellip: '\u2026', copy: '\u00a9', reg: '\u00ae', trade: '\u2122', middot: '\u00b7', bull: '\u2022' };
const decode = s => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&([a-z]+);/gi, (m, n) => NAMED[n.toLowerCase()] ?? m);
const squash = s => decode(s).replace(/\s+/g, ' ').trim();
const attr = (tag, name) => {
  const m = tag.match(new RegExp('\\s' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\')', 'i'));
  return m ? (m[1] ?? m[2]) : null;
};
const visibleText = html => squash((html.split(/<body[\s>]/i)[1] || html).replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' '));

// The webpages: every URL in the sitemap, in sitemap order.
if (!existsSync(join(ROOT, SITEMAP))) { console.error('✗ build-llms: no ' + SITEMAP); process.exit(1); }
const locs = [...new Set([...read(join(ROOT, SITEMAP)).matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map(m => decode(m[1])))];
if (!locs.length) { console.error('✗ build-llms: ' + SITEMAP + ' has no URLs'); process.exit(1); }

const pages = locs.map(loc => {
  const u = new URL(loc);
  const path = decodeURI(u.pathname).replace(/^\/+|\/+$/g, '');
  // A trailing-slash URL is the folder's index.html (a root-level path.html next to it is only a redirect stub).
  const tries = !path ? ['index.html']
    : u.pathname.endsWith('/') ? [path + '/index.html']
    : [path, path + '.html', path + '/index.html'];
  const file = tries.find(t => existsSync(join(ROOT, t)) && statSync(join(ROOT, t)).isFile());
  if (!file) { problems.push('sitemap lists ' + loc + ' but no file was found'); return null; }
  const html = read(join(ROOT, file));
  const head = html.split(/<\/head>/i)[0];
  const metas = [...head.matchAll(/<meta\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi)].map(m => m[0]);
  const meta = n => { const t = metas.find(x => (attr(x, 'name') || '').toLowerCase() === n); return t ? squash(attr(t, 'content') || '') : ''; };
  const title = squash((head.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
  if (!title) problems.push(loc + ' has no <title>');
  return { loc, path, plain: path.replace(/\.html?$/i, ''), html, title, desc: meta('description'), noindex: metas.some(x => /^(robots|googlebot)$/i.test(attr(x, 'name') || '') && /\b(noindex|none)\b/i.test(attr(x, 'content') || '')) };
}).filter(Boolean);

const listed = pages.filter(p => !p.noindex && !LEFT_OUT.test(p.plain) && !ALSO_LEFT_OUT.test(p.plain));
const leftOut = pages.filter(p => !listed.includes(p));

// Drop a trailing " | Brand" only when every listed title carries the same one.
const tails = listed.map(p => (p.title.match(/ \| ([^|]+)$/) || [])[1]);
const brand = tails.length && tails.every(t => t && t === tails[0]) ? tails[0] : null;
const label = p => {
  const t = brand ? p.title.slice(0, -(brand.length + 3)) : p.title;
  return drop(t) ? p.loc : t.replace(/([\[\]])/g, '\\$1');
};
const entry = p => '- [' + label(p) + '](' + p.loc + ')' + (p.desc && !drop(p.desc) && !NO_DESCRIPTION.has(p.plain) ? ': ' + p.desc : '');

// Header: business name from the homepage schema, its meta description, and its phone and place as printed.
const home = pages.find(p => p.path === '');
let name = '', summary = '', contact = '';
if (!home) problems.push('the sitemap does not list the homepage');
else {
  for (const b of home.html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let j; try { j = JSON.parse(b[1]); } catch { continue; }
    const hit = (Array.isArray(j) ? j : j['@graph'] || [j]).find(o => o && [].concat(o['@type'] || []).some(t => NAME_TYPE.test(t)) && o.name);
    if (hit) { name = squash(hit.name); break; }
  }
  if (!name) problems.push('no ' + NAME_TYPE + ' name in the homepage schema');
  summary = drop(home.desc) ? '' : home.desc;   // a description that is dropped on a link line is dropped here too
  const text = visibleText(home.html);
  const PHONE = /\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}/;
  const telLinks = [...home.html.matchAll(/<a\b[^>]*href=["']tel:[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi)].map(m => visibleText(m[1]));
  const phone = (telLinks.map(t => t.match(PHONE)).find(Boolean) || text.match(PHONE) || [])[0];   // the number as a phone link prints it
  const place = (text.match(PLACE) || [])[0];
  if (!phone) console.warn('! build-llms: no phone printed on the homepage, left out');
  if (!place) console.warn('! build-llms: ' + PLACE + ' is not printed on the homepage, left out');
  contact = [phone, place].filter(Boolean).join(' | ');
}

const sections = new Map(ORDER.map(g => [g, []]));
for (const p of listed) {
  const g = p.path === '' ? HOME_GROUP : (GROUPS.find(([, rx]) => rx.test(p.plain)) || [DEFAULT_GROUP])[0];
  if (!sections.has(g)) sections.set(g, []);
  sections.get(g).push(p);
}

const out = [
  '# ' + name, '',
  ...(summary ? ['> ' + summary, ''] : []),
  ...(contact ? [contact, ''] : []),
  ...[...sections].filter(([, ps]) => ps.length).flatMap(([g, ps]) => ['## ' + g, ...ps.map(entry), '']),
].join('\n').replace(/\n+$/, '\n');

// Gate: every listed sitemap webpage exactly once, nothing left out, no dollar figure.
const times = (s, sub) => s.split(sub).length - 1;
for (const p of listed) if (times(out, '](' + p.loc + ')') !== 1) problems.push('llms.txt should list ' + p.loc + ' once');
for (const p of leftOut) if (out.includes('](' + p.loc + ')')) problems.push('llms.txt lists ' + p.loc + ', which is left out');
if (out.split('\n').filter(l => l.startsWith('- [')).length !== listed.length) problems.push('llms.txt has the wrong number of webpage lines');
if (/\$/.test(out)) problems.push('llms.txt holds a "$"');
if (/\r/.test(out)) problems.push('llms.txt holds a carriage return');
if (name && home && !decode(home.html).includes(name)) problems.push('business name "' + name + '" is not written on the homepage');

if (problems.length) {
  console.error('✗ build-llms failed (' + problems.length + '):');
  for (const e of problems) console.error('  - ' + e);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'llms.txt'), out, 'utf8');
console.log('✓ build-llms: llms.txt lists ' + listed.length + ' webpages' + (leftOut.length ? ' (' + leftOut.length + ' left out)' : '') + ', no prices');
