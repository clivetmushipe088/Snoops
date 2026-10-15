# Snoops site

Hand-drawn studio site: Vite + plain HTML, CSS and JS. No framework. `reference/Main.dc.html` is the original design prototype (custom `<x-dc>` format). It is the visual source of truth, not code to run.

## Commands

- `npm run dev`: dev server
- `npm run build`: static build to `dist/` (four HTML pages plus one CSS and one JS bundle)
- `npm run preview`: serve `dist/`

Config lives in `.env` (see `.env.example`): `VITE_CONTACT_ENDPOINT` (required for the form to send) and `VITE_CONTACT_EMAIL` (optional).

## Deploying (GitHub Pages)

- `.github/workflows/deploy.yml` builds and deploys on every push to `main`. The Pages source must be "GitHub Actions", not a branch, because publishing the raw repo serves unbuilt HTML.
- The site is served from `https://<user>.github.io/<repo>/`. The workflow sets `BASE_PATH=/<repo>/`; locally it defaults to `/`.
- Write internal links root-relative (`<a href="/about/">`). The `html-partials` plugin prefixes the base, and `router.js` builds its routes from `import.meta.env.BASE_URL`. Never hard-code `/Snoops/`.
- Form settings come from Actions repository **variables** `VITE_CONTACT_ENDPOINT` and `VITE_CONTACT_EMAIL`. These are not secrets, since they end up in the HTML.

## Structure

- `index.html`, `about/index.html`, `projects/index.html`, `contact/index.html`: the four routes, each a real page so deep links and no-JS browsing work.
- `src/partials/`: shared markup, inlined at build time by the `html-partials` plugin in `vite.config.js`:
  - `<!-- @include top.html page=about -->` inlines a partial; `page=` sets `aria-current="page"` on the matching `data-route` nav link.
  - `{{VITE_X}}` inserts an escaped env value; `<!-- @if VITE_X -->…<!-- @endif -->` keeps a block only when it's set.
- Each page's content sits in `<div class="page-body" data-page-body><div class="drawing">pencil + content</div></div>`. The router swaps only the inside of `[data-page-body]`, so keep that wrapper and the `.drawing` / pencil include on every page.
- `src/router.js`: page transitions. `src/contact.js`: form. `src/styles.css`: all styles.

## Design rules (keep the hand-drawn look identical to the prototype)

**Palette.** Only these tokens from `:root`:
- ink `#25252b`, soft ink `#2b2b31`, muted ink `#4a4a52`
- paper `#f1ede1`, ruled lines `rgba(70,78,100,.14)` every 40px
- **one accent, `--accent: #b4492f`**

Never add a second accent or hard-code a colour. The accent is for small marks only: second underline strokes, filled stars, the pencil and eraser tips, field focus and error frames. It is never used for body text.

**Fonts.**
- Caveat (500/600/700) for display: logo, headings, nav, buttons, labels.
- Kalam (300/400) for body text.
- Both load from Google Fonts with a `'Comic Sans MS', cursive` fallback. Use no other fonts.

**Paper.**
- `.sheet` carries the ruled background (`background-position: 0 22px`).
- `.sheet-border` is the sketched frame.
- `.grain` is an feTurbulence noise layer with `mix-blend-mode: multiply; opacity: .55`, placed *above* the content (z-index 3) with `pointer-events: none`. Don't remove or reorder it.
- Lede text uses `line-height: 40px` to sit on the rules.

**Ink.**
- Every doodle is inline SVG with `class="ink"`: no fill, `stroke: var(--ink)`, width 2.4, round caps and joins.
- Modifiers: `.thin` (1.7), `.acc` (accent stroke), `.accf` (accent fill), `.paperf` (paper fill, used to knock out lines behind shapes), `.ns` (non-scaling stroke, for stretched frames with `preserveAspectRatio="none"`).
- Don't redraw or "clean up" the paths. Copy them from the reference, because the wobble is part of the paths themselves.

**Wobble filters.** These are defined once in `partials/top.html`:
- `#rough` (displacement scale 2.6) goes on SVG doodles, frames and underlines.
- `#wob` (scale 3.2) goes on large Caveat text: logo, `.display`, `.section-title`, captions.

New hand-drawn elements get one of the two. Never apply either to body copy or form inputs.

**Shared motifs.**
- Five-point star: `M0 -22 L6 -7 L22 -6 L10 4 L14 20 L0 11 L-14 20 L-10 4 L-22 -6 L-6 -7 Z`
- Four-point sparkle: `M0 -24 C2 -9 9 -2 24 0 C9 2 2 9 0 24 C-2 9 -9 2 -24 0 C-9 -2 -2 -9 0 -24 Z`
- Each heading gets a double underline: an ink stroke plus a shorter accent stroke.
- Cards get a 4-line sketched frame (lines overshoot the corners) and a slight `--tilt` of ±0.3–0.5deg.
- Text gets `.inkbleed` (a faint text-shadow).

**Motion.**
- `.draw` plus `pathLength="1"` makes a stroke draw itself in 0.5s.
- `.wo` writes text in from left to right.
- `.redraw` replays a stroke on hover.
- `.dd` wiggles a doodle on hover.
- `.pop` shows stars that appear on hover or focus.
- Entry animations have no stagger delays; the prototype forced every delay to 0.

**Page change, about 1s total.** Clicking a nav link runs `go()` in `router.js`:
1. The current `.page-body` gets `.erasing`: a 6-strip mask animation. The `.eraser` element scrubs back and forth along the same zig-zag path. This takes `--erase-ms` (500ms).
2. The new page HTML (prefetched on hover or focus) replaces the old one. The fresh `.drawing` node clip-reveals from top to bottom while `.pencil` sweeps down. This takes `--draw-ms` (500ms).

If you change a duration, change both the CSS variable and `ERASE_MS` / `DRAW_MS` in `router.js`. The header never animates out.

**Reduced motion is mandatory.** `prefers-reduced-motion: reduce` kills every animation and transition. The router skips the eraser and pencil and swaps the page instantly. Any new animation must stay inside that rule; never use `!important` animations that escape it.

## Accessibility and behaviour rules

- Decorative SVGs get `aria-hidden="true" focusable="false"`. Meaningful illustrations get `role="img"` plus `aria-label`.
- Keep the heading order on every page: exactly one `h1` (with `tabindex="-1"`, `id="page-title"`), then `h2`, then `h3`.
- After a route swap the router updates the title, meta description, `aria-current` and history, scrolls to the top and focuses the new `h1`. Don't break that sequence.
- Focus style is a 2px dashed ink outline (`:focus-visible`). There's a skip link to `#main`, and `forced-colors` is handled.
- Responsive: no horizontal scroll at 320px. The gutter is ≥16px (20px under 720px). Grids use `minmax(min(Npx, 100%), 1fr)`.
- Contact form:
  - Errors appear inline per field on blur and on submit.
  - Submit is `aria-disabled` (not `disabled`), with a "Still needed: …" hint.
  - The textarea has a character counter.
  - "Sending…" shows on the button while it posts.
  - Failures go in a `role="alert"` message that says what failed, why, and what to do next. Never fail silently.
  - `_gotcha` is a honeypot field.
  - Without JS the form posts natively to the same endpoint.

## Content

All copy is in the page HTML files. The project card lines on `/projects/` are labelled "Studio concept, 2026". Replace them with real client work when it exists; don't invent client names.
