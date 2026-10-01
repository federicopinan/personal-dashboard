# Dashboard UI Overhaul

## Objective
Make the dashboard fully English, give scrolling a smooth feel, replace the default task day selector with one that matches the house design, give Notes and Tasks their own routes at `/notes` and `/tasks`, turn the tile row into a 3-column grid that grows with new tiles, and make the whole app properly responsive on mobile.

## Problem and Why
Six concrete gaps stand between this dashboard and a finished product:

1. The settings panel is the only non-English surface in the app; everything else (`html lang`, metadata, manifest, tiles) is already English.
2. Scrolling feels flat because no `scroll-behavior` exists anywhere, and `html, body` are locked to `height: 100%` with no scroll container.
3. The task day selector is a bare native `<input type="date">` with no class, no style, and no `color-scheme: dark`, so it renders default light chrome on a black page.
4. Notes and Tasks are inline blocks at the bottom of the dashboard. They deserve their own routes.
5. The tile board is a horizontal flex scroller (`.xRow`) with a fixed `300x340` per tile, not a grid.
6. Responsive rules are incoherent (four competing breakpoints: 480/560/760/980), tile height stays 340px on phones, and the viewport meta disables pinch-zoom so any overflow is unrecoverable.

## Scope and Constraints
- All product data stays in browser `localStorage`. No Supabase, accounts, sync, backend, OAuth, or new third-party APIs.
- Never rename or restructure the persisted key contract. `vitality:notes` is a single key; `vitality:tasks:YYYY-MM-DD` is a per-date family; tile data lives in `vitality:me:tile:<id>:data` and must not be touched.
- Preserve the existing optional Finnhub quote route unchanged.
- Generated artifacts excluded from authored-line forecasts. Forecast: roughly 700–1,200 authored changed lines across all tasks; advisory only, no cosmetic line reduction.
- Single-branch repo: commit directly to `master`. No branch to create, no PR, no push. The user owns delivery.
- Existing art, the tile bridge, and the `data-orb` / `data-roam` / `data-pt` attributes must survive every refactor.
- `useTileHost` registers iframes by `contentWindow` identity in a `WeakMap`. Re-parenting or re-keying a tile can fire `ref(null)` and drop the registration, so tile DOM identity must stay stable across layout changes.

## TDD and Verification
- TDD: **off**, explicitly selected by the user in this session.
- Source: explicit user instruction.
- Test runner: none configured. Do not add a framework solely to satisfy TDD.
- Required functional check for every task: `pnpm build` must pass (Next.js 14.2.35 compiles, type/lint checks pass, 10 static pages generate).
- Runtime check: hands-on browser verification of the six outcomes, deferred by the user until after deploy. Not claimed as passed.

## Decisions Locked With the User
- Tile board: **3 columns x 2 rows, growing with additional rows**. The five tiles plus the `+ New tile` button fill the first six cells.
- The **Mentor/Vee tile stays a full-width hero above the grid**, because its SVG art is composed for that format and it works as the board's focal point.
- The **horizontal scroller is removed**, not kept alongside the grid.
- Mobile column count: **3 -> 2 -> 1**.

## Authorized Scope and Route
Implementation route: **delegated direct**, one bounded writer per task, executed in order. Evidence: every task touches two or more non-trivial files across TSX, CSS modules, and route folders, and the reading that prepares those writes belongs with the writer. No SDD artifacts or phases authorize implementation under this route.

## Acceptance Criteria
- No non-English string remains in any user-facing surface, and terminology is consistent (the codebase says "tile", not "card").
- Scrolling uses the project's existing motion tokens and still respects `prefers-reduced-motion`.
- The day selector matches the house design, emits `YYYY-MM-DD` in **local** time, and is keyboard and screen-reader operable.
- `/notes` and `/tasks` each render their feature fully, and the dashboard links to both. Existing notes and tasks load unchanged.
- The board is a 3-column grid that grows by rows; the Mentor tile stays full-width above it; no horizontal scroll remains.
- No layout overflows a 360px-wide viewport, tap targets are reachable, and pinch-zoom is restored.

## Tasks

### UX-1 — Smooth scroll and motion foundation
- [ ] Add `scroll-behavior: smooth` plus `scroll-padding-top` for the header, honoring `prefers-reduced-motion`.
- [ ] Fix the `html, body { height: 100% }` lock so the document scrolls naturally without breaking the full-bleed backdrop.
- [ ] Restore pinch-zoom in the viewport meta.
- Route: delegated direct. Trigger: spans `globals.css`, `dashboard.module.css`, and `layout.tsx`.
- Checks: `pnpm build`.
- Status/evidence/commit: pending.

### UX-2 — English-only copy and consistent terminology
- [ ] Translate the entire `SettingsPanel` to English, using sentence case to match the rest of the app.
- [ ] Replace the Spanish/English hybrid `Pesos por Tile (%)` with a clean English label.
- [ ] Standardize "card" to "tile" in the copy so the UI has one name for the same object.
- Route: delegated direct. Trigger: many strings across one large file, each needing consistent terminology.
- Checks: `pnpm build`.
- Status/evidence/commit: pending.

### UX-3 — 3-column tile grid
- [ ] Replace the `.xRow` flex scroller with a real 3-column grid that grows by rows, and remove the horizontal scroll affordance.
- [ ] Keep the Mentor/Vee tile full-width above the grid, untouched.
- [ ] Make tile sizing fluid so tiles scale with the column instead of a hard `300x340`.
- [ ] Preserve tile DOM identity, the `data-orb` / `data-roam` / `data-pt` attributes, and the `useTileHost` registration.
- Route: delegated direct. Trigger: crosses the board component, the global tile stylesheet, and the dashboard module CSS.
- Checks: `pnpm build`.
- Status/evidence/commit: pending.

### UX-4 — House-designed day selector
- [ ] Build a custom day control matching the house tokens, replacing the bare native date input.
- [ ] Emit `YYYY-MM-DD` in local time so existing per-date task keys stay compatible.
- [ ] Keep the carry-forward action and the saved-dates history, and make the control keyboard and screen-reader operable.
- Route: delegated direct. Trigger: new module plus the tasks section it replaces.
- Checks: `pnpm build`.
- Status/evidence/commit: pending.

### UX-5 — Notes and Tasks get their own routes
- [ ] Extract `NotesSection` and `TasksSection` into reusable modules without changing the storage keys.
- [ ] Add `/notes` and `/tasks` routes following the existing `app/<segment>/page.tsx` + client child convention.
- [ ] Add buttons on the dashboard linking to each route, and remove the now-duplicated inline sections.
- [ ] Give both routes the dashboard page chrome, plus a way back to the board.
- Route: delegated direct. Trigger: new route folders, extracted modules, and the dashboard root all change together.
- Checks: `pnpm build`.
- Status/evidence/commit: pending.

### UX-6 — Mobile responsive pass
- [ ] Reconcile the four competing breakpoints into one coherent scale.
- [ ] Fix tile and Mentor art so neither overflows a narrow viewport.
- [ ] Fix the notes and tasks toolbars, the carry-forward control, and the settings panel at small widths.
- [ ] Verify touch targets are reachable and nothing overflows at 360px.
- Route: delegated direct. Trigger: cross-cutting CSS and inline-style changes across the modules the earlier tasks touched.
- Checks: `pnpm build`.
- Status/evidence/commit: pending.

## Progress
- Branch: `master` (single-branch layout).
- Completed: read-only exploration and mapping of the UI surface. No source changes yet.
- Current next step: UX-1, smooth scroll and motion foundation.
