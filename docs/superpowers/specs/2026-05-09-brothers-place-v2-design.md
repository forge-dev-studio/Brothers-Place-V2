# Brother's Place V2 Design Spec

| | |
|---|---|
| Date  | 2026-05-09 |
| Owner | Corey Redwine (Forge Dev.studio) |
| Client | Brother's Place (501c3, Rome GA) |
| Repo  | forge-dev-studio/Brothers-Place |
| Branch | v2 |
| Status | Approved, ready to plan |

## Context

Brother's Place is a Christ-centered men's recovery and supportive housing nonprofit in Rome, Georgia, founded by TK and Claudia Hamilton at 1709 Maple Street. The current GitHub Pages site is structurally competent (15 pages, JSON-LD, sitemap, accessibility scaffolding, donate flows) but visually generic, lacks imagery, has placeholder partner logos, and is partially broken on Pages because asset paths omit the `/Brothers-Place/` repo prefix.

V2 elevates the site to documentary-grade visual gravitas worthy of the mission, fixes the path bugs, replaces emoji icons with custom SVG, and gives the design system a clean two-file architecture so the cousin or any volunteer can maintain it without a build step.

## Goals

1. A V2 that reads as weighty, sanctuary-aligned, and donor-trustworthy on first view.
2. Every page works on GitHub Pages with no broken images.
3. CSS architecture is two files (`tokens.css` + `styles.css`), all values flow through `var(--...)`.
4. Mobile is co-equal, not an afterthought, since most donor traffic comes from phones in pews.
5. Standalone identity: zero dependency on Forge brand tokens or Forge assets.

## Non-Goals

- No build step (still vanilla static HTML/CSS/JS, GitHub Pages friendly).
- No CMS, no analytics swap-in beyond what already exists.
- No re-platforming away from GitHub Pages.
- No content rewrites beyond hero copy and minor microcopy fixes; the cousin's content stands.

## Visual Law (North Star)

The locked hero is `v2-references/04-cathedral-house-dusk.png`: the Maple Street home at blue hour, every window glowing warm gold, single oak tree, navy sky with a sunset glow at the horizon. Every other design decision flows from this frame.

Aesthetic: Cathedral / Sanctuary. The home is the protagonist. Humans appear gradually as the user scrolls into stories and programs. Gravity over pep. Reverence without preachiness. Documentary realism for human imagery, never staged stock.

## Design Tokens

`css/tokens.css` is the source of truth. Every value the site uses is declared here and consumed via `var(--...)` in `styles.css`. Zero raw hex or rgba in `styles.css`.

```css
:root {
  /* Color: surfaces and night */
  --c-navy-900: #0F1B33;
  --c-navy-700: #1B2B4B;
  --c-navy-500: #2A3D63;

  /* Color: warmth and accent */
  --c-window:    #E8B958;
  --c-window-2:  #C8973F;
  --c-horizon:   #B8754A;

  /* Color: paper */
  --c-cream:     #F4ECDB;
  --c-cream-2:   #EADFC6;
  --c-ink:       #1A1A1A;
  --c-ink-soft:  #4A4A4A;

  /* Type */
  --font-display: "Lora", Georgia, serif;
  --font-body:    "Inter", system-ui, -apple-system, sans-serif;
  --fs-display:   clamp(2.25rem, 4vw + 1rem, 3.5rem);
  --fs-h1:        clamp(2rem, 3vw + 1rem, 3rem);
  --fs-h2:        clamp(1.5rem, 2vw + 1rem, 2.25rem);
  --fs-body:      1.0625rem;
  --lh-tight:     1.15;
  --lh-body:      1.6;
  --tracking-tight: -0.02em;

  /* Space */
  --s-1:  0.25rem;
  --s-2:  0.5rem;
  --s-3:  0.75rem;
  --s-4:  1rem;
  --s-6:  1.5rem;
  --s-8:  2rem;
  --s-12: 3rem;
  --s-16: 4rem;
  --s-24: 6rem;

  /* Radius and motion */
  --r-sm: 6px;
  --r-md: 12px;
  --r-pill: 999px;
  --ease: cubic-bezier(.22,.61,.36,1);
  --dur-fast: 180ms;
  --dur-med:  320ms;

  /* Layout */
  --container: 1200px;
  --gutter:    clamp(1rem, 4vw, 2rem);

  /* Elevation */
  --shadow-soft: 0 12px 40px -16px rgba(15,27,51,.35);
  --shadow-glow: 0 0 80px -20px rgba(232,185,88,.5);
}
```

## Typography

- Display (`--font-display` / Lora 700) for h1, h2, large pull quotes, scripture.
- Body (`--font-body` / Inter 400) for paragraphs and UI.
- Inter 600 for buttons, labels, footer headings.
- All h1 use `--tracking-tight` for editorial tightness.

## Hero Treatment (home page)

- Full-bleed `04-cathedral-house-dusk.png` (1536x1024 source, served at 1920x1280 desktop / 750x1000 mobile via responsive `<picture>`).
- Vertical gradient overlay: `linear-gradient(to top, var(--c-navy-900) 10%, rgba(15,27,51,.5) 45%, transparent 75%)`. Keeps house and sky visible, content readable.
- Content anchored bottom-left on desktop, full-width centered on mobile.
- Headline (Lora 700, --fs-display, cream):
  > A Light On for Every Man Who Walks Through the Door.
- Sub (Inter 400, 1.125rem, cream-2):
  > Brother's Place is supportive housing, recovery, and Christ-centered community for men in Rome, Georgia who are rebuilding from homelessness, addiction, and crisis.
- CTA pair: `Donate` (window-gold pill, navy text) + `Get Help` (cream outline).
- Soft fade-up animation on load, 320ms.

## Imagery Plan

| Page | Hero | Source |
|---|---|---|
| `/index.html` | House at dusk | `04-cathedral-house-dusk.png` (locked) |
| `/about/our-story/` | House daytime exterior | regenerate |
| `/about/leadership/` | TK and Claudia placeholder card, no AI portraits | hold for real photos |
| `/about/faith-foundation/` | Bible in shaft of light | `03-cathedral-bible.png` |
| `/about/financials/` | none, data-led page | none |
| `/programs/supportive-housing/` | Recovery circle | `06-hopeful-circle.png` |
| `/programs/case-management/` | Hands across desk, paperwork | regenerate |
| `/programs/spiritual-formation/` | Bible in shaft of light | `03-cathedral-bible.png` |
| `/programs/reintegration-and-jobs/` | Workshop | `02-documentary-workshop.png` |
| `/programs/second-step-program/` | Lockup of all 4 program tiles | composed |
| `/get-help/` and subpages | Warm interior, light through window | regenerate one shared shot |
| `/get-involved/donate/` | Porch, emotional close | `01-documentary-porch.png` |
| `/get-involved/volunteer/` | Hands serving meal | regenerate |
| `/get-involved/church-partners/` | Small Southern church golden hour | regenerate |
| `/get-involved/events/` | Outdoor gathering wide | regenerate |
| `/stories/` | Porch | `01-documentary-porch.png` |
| `/contact/` | Map card, no hero | none |
| `/legal/` | none | none |
| OG image | 1200x630 crop of `04` | composed from locked hero |

Total to regenerate: about 6 images, plus an OG composition. Estimated additional gpt-image-2 spend: under fifty cents.

## Component Upgrades

1. **Header** stays minimal. Cream background by default, transitions to translucent navy 900 on scroll. Donate pill is sticky on scroll. Mobile menu becomes a full-screen takeover with navy 900 background and a single column of links at `--fs-h2`.
2. **Pillars.** Replace four emoji icons with custom thin-stroke SVG icons (house, hand, cross, arrow forward). Same four-up grid on desktop, two-up on tablet, one-up on mobile.
3. **Proof bar.** Keep count-up animation. Tighten to Lora display numerals, gold rule above each.
4. **Featured story.** Image left, quote right on desktop. Quote is Lora italic at 1.25rem inside a soft window-glow vignette behind it. Stack on mobile.
5. **Journey of Hope.** Full-width band, navy 900 surface, scripture pulled out as display block (Lora italic, --fs-h1, cream), attribution below in Inter small caps.
6. **Trust block.** Replace placeholder. Custom SVG outline of Floyd County with a subtle gold pin at Rome, plus headline "Serving Northwest Georgia" and a one-line copy. Real partner logos slot in here later when the cousin sends them.
7. **CTA banner.** Use `01-documentary-porch.png` as background with a navy 900 50% overlay. White headline, cream sub, window-gold donate button.
8. **Mobile donate bar.** Slim, no emoji, navy 900 surface, gold button.
9. **Sticky giving counter.** Floating chip (bottom-right desktop only) showing "92% of donations go to direct services" with a small gold ring icon.
10. **Footer.** Same 4-col grid, but with refined typography, gold rules between sections, and a cleaner social row.

## Site-Wide Fixes

- All asset paths normalized to absolute paths with `/Brothers-Place/` prefix. This removes the current 404 on hero and testimony images.
- Strip every emoji used as an icon: pillars (4), contact dots (4), mobile donate bar heart, get-involved page bullets. Replace with `<svg>` icons.
- Em dash sweep: scan all 15 pages and replace `—` with appropriate punctuation.
- Replace existing `og:image` and `twitter:image` references with the new 1200x630 composed OG.
- Verify `lang`, `<meta description>`, canonical, and JSON-LD on each page; current pages have these but rewrite needs to preserve them.

## CSS Architecture

Two files only:
- `css/tokens.css` (source of truth, all custom properties)
- `css/styles.css` (single component layer, every value via `var(--...)`)

Every page links exactly these two files in order. The current `design-system.css` and `components.css` are deleted at the end of the rebuild. JS stays in `js/main.js`, no framework.

## Build and Deploy Plan

1. Working directory: `c:\Users\corey\Desktop\Brothers-Place` on branch `v2`.
2. Generate the remaining 6 images plus the OG, in parallel via `scripts/gen-references.js` (extended).
3. Build `tokens.css` and `styles.css`.
4. Rebuild `index.html` against new system as the proof page.
5. Apply page-hero pattern to `programs/supportive-housing/index.html` to validate the inner-page template.
6. Propagate template to remaining 13 pages.
7. Path-bug sweep across all pages, all CSS, all JS.
8. Playwright audit: 1440x900 desktop and 390x844 mobile, all 15 pages. Capture screenshots, console, network. Fix regressions.
9. Push `v2` branch to `forge-dev-studio/Brothers-Place`.
10. Enable a Pages preview for the v2 branch (or temporarily flip publish source) so the user can review at the github.io URL.
11. Hand back the link.
12. Stretch: write up the workflow as a reusable skill if it proved out.

## Acceptance Criteria

- All 15 pages render with no console errors and no failed asset requests on Pages.
- Hero on the home page is the locked dusk house image, full-bleed, with the new headline.
- `tokens.css` and `styles.css` are the only two CSS files; both `design-system.css` and `components.css` are removed.
- Every emoji previously used as an icon is replaced with SVG.
- Lighthouse mobile performance >= 85, accessibility >= 95, best-practices >= 90, SEO >= 95 on the home page.
- A Playwright run produces a clean screenshot for each of the 15 pages at desktop and mobile and is committed under `tests/playwright/screenshots/`.
- The v2 branch is pushed and reviewable at a public URL.

## Risks

- The cousin may have content updates or photo plans I am not aware of. The path here is reversible: V2 lives on a branch and only merges when approved.
- Image regenerations could come back off-brand; mitigation is a one-shot regenerate-and-review loop using the same north-star reference for visual continuity.
- Pages preview on a non-default branch requires either flipping publish source or shipping a one-off action; if blocked, fallback is local Playwright screenshots and a Firebase Hosting preview channel under `forgedev.studio` for review.
