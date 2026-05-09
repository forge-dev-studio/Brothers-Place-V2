# Brother's Place V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the 15-page Brother's Place site on the v2 design (cathedral / sanctuary aesthetic, dusk house hero, two-file CSS architecture), fix path bugs, replace emoji icons with SVG, and ship to a reviewable Pages preview.

**Architecture:** Vanilla static HTML + CSS + JS, GitHub Pages hosting at `/Brothers-Place/`. Two CSS files only (`css/tokens.css` source of truth + `css/styles.css` consuming via `var(--...)`). Imagery generated via OpenAI gpt-image-2. Verification via Playwright screenshots at desktop (1440x900) and mobile (390x844) for all 15 pages.

**Tech Stack:** HTML5, CSS3 (custom properties, no framework), vanilla JS, Playwright (verification only), gpt-image-2 (asset generation), GitHub Pages, gh CLI.

**Spec:** [docs/superpowers/specs/2026-05-09-brothers-place-v2-design.md](../specs/2026-05-09-brothers-place-v2-design.md)

---

## File Structure

**Created:**
- `css/tokens.css` (source of truth for all CSS variables)
- `css/styles.css` (single component layer; consumes tokens via var())
- `images/hero-home.jpg` and 5 regenerated heroes (`hero-{about,case-mgmt,get-help,volunteer,church-partners,events}.jpg`)
- `images/og-default.jpg` (1200x630 home OG)
- `images/icons/{pillar-house,pillar-hand,pillar-cross,pillar-arrow,nav-phone,nav-pin,nav-mail,nav-fb,floyd-county-map}.svg`
- `scripts/regen-images.js` (extends gen-references.js with the additional images)
- `scripts/playwright-audit.js` (screenshots all 15 pages at desktop + mobile)
- `tests/playwright/screenshots/{desktop,mobile}/<page>.png` (artifacts)

**Modified:**
- All 15 HTML pages: hero swap, path-prefix sweep, emoji removal, link to new CSS files

**Deleted (final cleanup):**
- `css/design-system.css`
- `css/components.css`

---

## Task 1: Regenerate the remaining hero imagery + OG composite

**Files:**
- Create: `scripts/regen-images.js`
- Output: `images/hero-about-our-story.jpg`, `images/hero-case-management.jpg`, `images/hero-get-help.jpg`, `images/hero-volunteer.jpg`, `images/hero-church-partners.jpg`, `images/hero-events.jpg`, `images/og-default.jpg`

- [ ] **Step 1: Write `scripts/regen-images.js` modeled on `scripts/gen-references.js`** with the 6 supplemental prompts (about house daytime, hands-across-desk, warm interior get-help, hands serving meal, small Southern church, outdoor gathering) plus a 1536x1024 OG composition based on the dusk-house hero. Use `1536x1024` for heroes (3:2) and run the OG generation as a separate `1200x630`-equivalent via downscaling `1536x1024` with `sharp` in a final post-step (or generate at `1024x1024` and keep — OG can crop). Use the same `gpt-image-2` request body, same OPENAI key load.

- [ ] **Step 2: Run it**

```bash
cd /c/Users/corey/Desktop/Brothers-Place && node scripts/regen-images.js
```

Expected: 6 heroes + 1 OG composite written to `images/`. Each ~2-3MB PNG. Total ~$0.30.

- [ ] **Step 3: Convert all hero PNGs to JPEG via sharp for size discipline**

Hero images at 2-3MB each blow Pages bandwidth and LCP. Convert to optimized JPEGs at quality 82 + 1920px max width. Add a small step in `regen-images.js` or a follow-up `scripts/optimize-hero-images.js`.

Run:
```bash
cd /c/Users/corey/Desktop/Brothers-Place && node scripts/optimize-hero-images.js
```

Expected: each hero reduced to <250KB JPEG.

- [ ] **Step 4: Verify image dimensions and file sizes**

```bash
cd /c/Users/corey/Desktop/Brothers-Place && ls -la images/*.jpg
```

Expected: each hero JPEG is between 100KB and 350KB, dimensions 1920x1280 (or 1200x630 for og).

- [ ] **Step 5: Commit**

```bash
git add scripts/regen-images.js scripts/optimize-hero-images.js images/
git commit -m "build(v2): regenerate page heroes + OG via gpt-image-2, optimize to JPEG"
```

---

## Task 2: Build `css/tokens.css`

**Files:**
- Create: `css/tokens.css`

- [ ] **Step 1: Write `css/tokens.css`** with the full token list from the spec (colors, type, space, radius, motion, layout, elevation). Mirror the spec exactly. Add a `@media (prefers-reduced-motion: reduce)` block that zeroes `--dur-fast` and `--dur-med`.

- [ ] **Step 2: Verify by linking from a temp test HTML and inspecting in browser**

Quickly: create `_test-tokens.html` linking only `tokens.css` and inline `<div style="color: var(--c-window); font-family: var(--font-display);">test</div>`. Open in browser. Expect window-gold colored text in Lora.

- [ ] **Step 3: Delete `_test-tokens.html` and commit**

```bash
rm _test-tokens.html
git add css/tokens.css
git commit -m "feat(v2): tokens.css source of truth"
```

---

## Task 3: Build `css/styles.css` base layer

**Files:**
- Create: `css/styles.css`

- [ ] **Step 1: Write the base layer in `styles.css`:** reset, body, typography (h1-h6, p, a, blockquote), container (`.container { max-width: var(--container); padding-inline: var(--gutter); margin-inline: auto; }`), utility classes (`.section`, `.fade-up`), buttons (`.btn`, `.btn--primary` window-gold, `.btn--secondary` cream outline, `.btn--lg`, `.btn--sm`), and form inputs.

- [ ] **Step 2: Verify by viewing the existing `index.html` linked to new CSS**

Temporarily edit `index.html` to swap `design-system.css` and `components.css` for `tokens.css` + `styles.css`. Serve locally:

```bash
cd /c/Users/corey/Desktop/Brothers-Place && python -m http.server 5500 &
```

Visit `http://localhost:5500`. Expect: typography reads in Lora + Inter. Layout will look broken (no components yet), that's expected.

- [ ] **Step 3: Revert the index.html temp edit and commit base styles only**

```bash
git checkout index.html
git add css/styles.css
git commit -m "feat(v2): styles.css base (reset, type, container, buttons)"
```

---

## Task 4: Build `css/styles.css` component layer

**Files:**
- Modify: `css/styles.css` (append components)

- [ ] **Step 1: Append component styles for** header (sticky, scroll-translucent), hero (full-bleed image, gradient overlay, bottom-aligned content), proof-bar (gold rule + Lora numerals), pillars (4-up grid, custom SVG icon container), testimonial-card (image-left/quote-right + window-glow vignette), journey-block (navy 900 surface, scripture display block, gold rule), trust-block (Floyd County map vignette, "Serving Northwest Georgia"), cta-banner (porch image background + navy overlay), newsletter, footer, mobile-donate-bar, sticky giving counter (`.giving-chip`), and full-screen mobile menu takeover.

- [ ] **Step 2: Run a quick `grep` to ensure zero raw hex/rgba in styles.css**

```bash
grep -nE '#[0-9a-fA-F]{3,8}|rgba?\(' css/styles.css | grep -v '^/\*'
```

Expected: zero matches (every color via var()).

- [ ] **Step 3: Commit**

```bash
git add css/styles.css
git commit -m "feat(v2): styles.css component layer (header, hero, pillars, ...)"
```

---

## Task 5: Build SVG icon set

**Files:**
- Create: `images/icons/pillar-house.svg`, `pillar-hand.svg`, `pillar-cross.svg`, `pillar-arrow.svg`, `nav-phone.svg`, `nav-pin.svg`, `nav-mail.svg`, `nav-fb.svg`, `floyd-county-map.svg`

- [ ] **Step 1: Hand-write each SVG** as a 24x24 viewBox, single-color (`currentColor`), 1.5px thin stroke, no fill (or filled where appropriate like the FB icon). Floyd County map is a stylized outline of Floyd County, GA at 200x200 viewBox with a gold dot at the centroid for Rome. House, hand, cross, arrow-forward, phone, pin, mail, facebook.

- [ ] **Step 2: Verify each renders at 32px and 64px without rasterization issues**

Open one in browser directly. Confirm clean stroke.

- [ ] **Step 3: Commit**

```bash
git add images/icons/
git commit -m "feat(v2): custom SVG icon set (replaces emoji icons)"
```

---

## Task 6: Rebuild `index.html` on V2 design

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Rewrite `index.html`** with: only two CSS links (`tokens.css`, `styles.css`); new full-bleed hero using `images/hero-home.jpg` (the dusk house) with the new headline copy from the spec; pillars section using SVG icons not emoji; refined journey-of-hope block; trust block with Floyd County SVG vignette; CTA banner using porch image as background; sticky giving chip floating bottom-right; mobile donate bar slimmed and de-emoji'd; updated footer using SVG icons. Preserve all existing JSON-LD, OG (point at new `og-default.jpg`), Twitter Card, canonical, sitemap link, robots. All asset paths absolute with `/Brothers-Place/` prefix.

- [ ] **Step 2: Verify locally**

```bash
cd /c/Users/corey/Desktop/Brothers-Place && python -m http.server 5500 &
```

Visit `http://localhost:5500/Brothers-Place/` (the prefix matters — Pages serves under that path). Expect: full hero loads, no console errors, no failed image requests, all CTAs clickable.

- [ ] **Step 3: Verify with Playwright at desktop + mobile**

Run `node scripts/playwright-audit.js index` (built in Task 11; for now: a one-off browser check via DevTools is fine).

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(v2): rebuild home page on cathedral aesthetic"
```

---

## Task 7: Rebuild `programs/supportive-housing/index.html` (inner-page template proof)

**Files:**
- Modify: `programs/supportive-housing/index.html`

- [ ] **Step 1: Rewrite this page** as the canonical inner-page template: shared header + footer markup (copy-paste from index since no SSI), page-hero block (smaller than home hero, 50vh, image is `06-hopeful-circle.jpg`), content sections (program description, what it includes, eligibility, CTAs to donate + apply), trust block at bottom, CTA banner, mobile donate bar.

- [ ] **Step 2: Verify locally**

Visit `http://localhost:5500/Brothers-Place/programs/supportive-housing/`. Expect clean render, page hero, working back-to-home, working donate.

- [ ] **Step 3: Commit**

```bash
git add programs/supportive-housing/index.html
git commit -m "feat(v2): rebuild supportive-housing as inner-page template"
```

---

## Task 8: Propagate template to the remaining 13 inner pages

**Files modified (13):** `about/our-story/index.html`, `about/leadership/index.html`, `about/faith-foundation/index.html`, `about/financials/index.html`, `programs/case-management/index.html`, `programs/spiritual-formation/index.html`, `programs/reintegration-and-jobs/index.html`, `programs/second-step-program/index.html`, `get-help/index.html`, `get-help/apply/index.html`, `get-help/eligibility-and-faq/index.html`, `get-help/resources/index.html`, `get-involved/donate/index.html`, `get-involved/volunteer/index.html`, `get-involved/church-partners/index.html`, `get-involved/events/index.html`, `stories/index.html`, `contact/index.html`, `legal/index.html`.

(Note: that is 19 page files for the 15 logical pages because some have sub-pages.)

- [ ] **Step 1: Spawn one subagent per page-cluster (5 clusters: about, programs, get-help, get-involved, leaf-pages),** each given the v2 template from Task 7 plus the original content from the existing page. Each agent rewrites the cluster preserving content and SEO, applying new design.

- [ ] **Step 2: Verify each page locally** by visiting each route and confirming clean render.

- [ ] **Step 3: Commit per cluster**

```bash
git add about/ && git commit -m "feat(v2): rebuild About cluster"
git add programs/ && git commit -m "feat(v2): rebuild Programs cluster"
git add get-help/ && git commit -m "feat(v2): rebuild Get Help cluster"
git add get-involved/ && git commit -m "feat(v2): rebuild Get Involved cluster"
git add stories/ contact/ legal/ && git commit -m "feat(v2): rebuild leaf pages"
```

---

## Task 9: Path-prefix and content sweep across all pages

**Files:** all HTML pages, `js/main.js`, `sitemap.xml`, `robots.txt`

- [ ] **Step 1: Run a Grep for raw `/images/`, `/css/`, `/js/` references** that lack the `/Brothers-Place/` prefix, in any HTML/CSS/JS file. Fix each.

```bash
cd /c/Users/corey/Desktop/Brothers-Place && grep -rnE '"/(images|css|js)/' --include="*.html" --include="*.css" --include="*.js" . | grep -v "/Brothers-Place/"
```

Expected after fix: zero matches.

- [ ] **Step 2: Em-dash sweep**

```bash
grep -rn '—' --include="*.html" .
```

Replace each em dash with the appropriate punctuation (period, comma, or "and").

- [ ] **Step 3: Emoji-as-icon sweep**

```bash
grep -rnP '[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]' --include="*.html" .
```

Replace any remaining emoji icon with the matching SVG from Task 5.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "fix(v2): path-prefix sweep, em-dash + emoji removal"
```

---

## Task 10: Playwright audit harness

**Files:**
- Create: `package.json`, `scripts/playwright-audit.js`, `tests/playwright/screenshots/{desktop,mobile}/`

- [ ] **Step 1: Install Playwright locally**

```bash
cd /c/Users/corey/Desktop/Brothers-Place && npm init -y && npm i -D @playwright/test playwright && npx playwright install chromium
```

- [ ] **Step 2: Write `scripts/playwright-audit.js`** that: starts a `python -m http.server 5500` in background, defines the list of 15 page routes (under `/Brothers-Place/...`), launches chromium at 1440x900 and 390x844, navigates to each, waits for `networkidle`, captures full-page screenshots into `tests/playwright/screenshots/{desktop,mobile}/`, captures `console` and `pageerror` events into a JSON report at `tests/playwright/audit-report.json`, exits non-zero if any console errors or 404s detected.

- [ ] **Step 3: Run it**

```bash
cd /c/Users/corey/Desktop/Brothers-Place && node scripts/playwright-audit.js
```

Expected: 30 screenshots (15 desktop + 15 mobile), audit-report.json with zero errors.

- [ ] **Step 4: Review the screenshots** by opening the screenshots folder in Explorer.

```bash
explorer.exe 'C:\Users\corey\Desktop\Brothers-Place\tests\playwright\screenshots\desktop' &
```

Visual-inspect each. Note any layout regressions, off-color elements, broken images.

- [ ] **Step 5: Commit harness + screenshots**

```bash
git add package.json package-lock.json scripts/playwright-audit.js tests/playwright/
git commit -m "test(v2): Playwright audit harness + initial screenshots"
```

---

## Task 11: Fix Playwright-flagged issues

- [ ] **Step 1: For each issue surfaced** in audit-report.json or visual review, fix in the relevant page or in `styles.css`. Re-run `node scripts/playwright-audit.js` after each fix until report is clean and visuals match the spec.

- [ ] **Step 2: Commit fixes** in logical clusters with descriptive messages.

---

## Task 12: Delete legacy CSS, final hygiene pass

**Files:**
- Delete: `css/design-system.css`, `css/components.css`

- [ ] **Step 1: Delete the two old CSS files**

```bash
cd /c/Users/corey/Desktop/Brothers-Place && rm css/design-system.css css/components.css
```

- [ ] **Step 2: Confirm zero pages still reference them**

```bash
grep -rn 'design-system.css\|components.css' --include="*.html" .
```

Expected: zero matches.

- [ ] **Step 3: Re-run Playwright audit** to confirm nothing regressed.

```bash
node scripts/playwright-audit.js
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(v2): delete legacy design-system.css + components.css"
```

---

## Task 13: Push v2 branch + enable GitHub Pages preview

- [ ] **Step 1: Push the v2 branch**

```bash
cd /c/Users/corey/Desktop/Brothers-Place && git push -u origin v2
```

- [ ] **Step 2: Enable GitHub Pages on the v2 branch** via the gh CLI

```bash
gh api -X PUT /repos/forge-dev-studio/Brothers-Place/pages \
  -f source.branch=v2 -f source.path=/ 2>&1
```

(If the repo already has Pages on `main`, this may need to be a flip. Pages only supports one branch as the publish source. If already on main, switch to v2 for review and switch back after merge.)

- [ ] **Step 3: Wait for Pages build**

```bash
gh run watch --repo forge-dev-studio/Brothers-Place
```

Or poll:
```bash
gh api /repos/forge-dev-studio/Brothers-Place/pages/builds/latest --jq .status
```

Expected: `built`.

- [ ] **Step 4: Verify the live preview**

Visit `https://forge-dev-studio.github.io/Brothers-Place/` and verify the dusk-house hero renders. Spot-check 3 inner pages.

- [ ] **Step 5: Hand back the URL** and tell the user it is ready for review.

---

## Task 14: (Stretch) Package the workflow as a reusable skill

- [ ] **Step 1: Outline the skill** at `~/.claude/skills/forge-clientsite-rebuild/SKILL.md` describing the GPT-Image-2-reference -> spec -> build -> Playwright loop.

- [ ] **Step 2: Skip if Task 13 already shipped a great preview;** otherwise iterate first, package later.

---

## Acceptance Check (run before declaring done)

- [ ] Pages preview at `https://forge-dev-studio.github.io/Brothers-Place/` loads with the dusk-house hero and zero console errors.
- [ ] All 15 pages render at desktop + mobile (Playwright proof).
- [ ] `css/tokens.css` and `css/styles.css` are the only two CSS files in `css/`.
- [ ] `grep -rn 'design-system.css\|components.css'` returns zero.
- [ ] `grep -rnE '"/(images|css|js)/'` (without `/Brothers-Place/` prefix) returns zero.
- [ ] No emoji icons remain in HTML.
- [ ] No em dashes remain in HTML.
- [ ] Lighthouse mobile on home: perf >= 85, a11y >= 95, best-practices >= 90, SEO >= 95.
