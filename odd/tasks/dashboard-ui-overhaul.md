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
- Status/evidence/commit: **done; committed**. `pnpm build` passed (writer and parent spot check): `✓ Compiled successfully`, type/lint clean, `Generating static pages (10/10)`. `html, body` moved from `height: 100%` to `min-height: 100%` so the document can grow; `scroll-behavior: smooth` added under `prefers-reduced-motion: no-preference` so the reduced-motion path stays genuinely instant; `scroll-padding-top` added carrying the safe-area inset; `maximumScale` and `userScalable` removed so pinch-zoom works again. Commit `3135c05`.
- Correction to the earlier map: the dashboard header is NOT sticky or fixed (`.header` is normal-flow with a one-shot `fadeUp`), so `scroll-padding-top` is a comfort gutter, not header clearance. No `touch-action: none` blocks pinch-zoom outside deliberate edit mode.
- Follow-up, not fixed (belongs to UX-3): `DashboardGrid.tsx:541-545` sets `document.body.style.overflow = 'hidden'` while the mentor overlay is alive, an independent scroll lock.

### UX-2 — English-only copy and consistent terminology
- [ ] Translate the entire `SettingsPanel` to English, using sentence case to match the rest of the app.
- [ ] Replace the Spanish/English hybrid `Pesos por Tile (%)` with a clean English label.
- [ ] Standardize "card" to "tile" in the copy so the UI has one name for the same object.
- Route: delegated direct. Trigger: many strings across one large file, each needing consistent terminology.
- Checks: `pnpm build`.
- Status/evidence/commit: **done; copy-only; uncommitted at time of writing**. 23 strings translated in `SettingsPanel` to sentence-case English. Vocabulary taken from the codebase itself: `equation` and `active goal` already appear in `lib/tiles/weights.ts` and `MentorPage.tsx`, so no competing term was invented. Tab pills stay lowercase because the button already applies `textTransform: 'uppercase'`. "card" standardized to "tile" in the two info-tab strings so the UI has one name for the same object.
- Verification: parent grep for Spanish accented characters and lexicon across `app/`, `components/`, `lib/`, `public/` returns **no matches**. `pnpm build` passed (writer and parent spot check): `✓ Compiled successfully`, `Generating static pages (10/10)`. Risk assessed medium, `review_due: false` (`under_budget`), so no native review.
- Reported, not fixed: `app/global-error.tsx:54` links to `href="/app"`, a dead route (the dashboard is at `/`; `DashboardGrid.tsx:176` correctly uses `/`). The settings tab-strip render order (profile, goals, data, how, yours) does not match the `TabType` declaration order (how declared between goals and yours) — harmless, since pills are driven by explicit ids.

### UX-3 — 3-column tile grid
- [ ] Replace the `.xRow` flex scroller with a real 3-column grid that grows by rows, and remove the horizontal scroll affordance.
- [ ] Keep the Mentor/Vee tile full-width above the grid, untouched.
- [ ] Make tile sizing fluid so tiles scale with the column instead of a hard `300x340`.
- [ ] Preserve tile DOM identity, the `data-orb` / `data-roam` / `data-pt` attributes, and the `useTileHost` registration.
- Route: delegated direct. Trigger: crosses the board component, the global tile stylesheet, and the dashboard module CSS.
- Checks: `pnpm build`.
- Status/evidence/commit: **done; uncommitted at time of writing**. The flex scroller `.xRow` is replaced by a real CSS grid `.xGrid` with `grid-template-columns: repeat(3, minmax(0, 1fr))` and a 16px gap. Cells carry `aspect-ratio: 15/17` — literally the old 300x340 reduced, so proportions are preserved rather than invented — with `align-self: start` so the row is sized by the ratio. `.xCell > .tile { width: 100%; height: 100% }` is load-bearing: every child of `.tile` is absolutely positioned, so without it tiles would collapse to a zero-height line. The hard `fixed={{ width: 300, height: 340 }}` is gone; `fixed` now only remains on the untouched Mentor hero.
- Columns: 3 -> 2 (at 760px) -> 1 (at 480px), reusing the file's existing breakpoints.
- Deleted with evidence of no remaining references (parent grep confirms zero hits for `xRow` and `className="grid"` in source): the dead absolute-positioned `.grid` system, the `.xRow` custom scrollbar, the mobile stack hack, the `overflowX`/mask/negative-margin inline styles, and the stale `.oneScreen .shell :global(.veeTiles .grid)` 1000px cap in `dashboard.module.css`. `lib/tiles/packLayout.ts` was deliberately KEPT and stays unreferenced: using it would mean JS owning `--x/--y` and therefore owning the column count, re-introducing the `matchMedia` state this task removes. Two lines in `docs/VISION.md` that advertised the scrollbar were corrected.
- Bridge contract preserved (parent grep confirms): `data-orb` / `data-roam` / `data-pt` still sit on the `.tile` element at `DashboardGrid.tsx:155-157`, `veeTilesAnim.ts:245` still keys off `.tile[data-orb]`, cell keys remain the stable slot `id`, and nothing re-parents or re-keys tiles on resize.
- `initVeeTiles` deps are now `[mounted, gridKey]` where `gridKey` is a sorted **set** signature of `gridIds`. The JS `cols` state and its `matchMedia` listener are deleted: they existed only to force a re-bind when the column bucket changed, and with CSS owning the columns a resize touches zero DOM nodes. Orb geometry is all SVG user-space, so no re-bind is needed. Adding or removing a tile re-runs the binding (so a removed tile stops animating); a pure reorder does not, so orbs do not teleport.
- Verification: `pnpm build` passed (writer and parent spot check): `✓ Compiled successfully`, `Generating static pages (10/10)`. Dev server returned HTTP 200 and was stopped afterwards. Risk assessed medium, `review_due: false` (`under_budget`), so no native review. **Layout was not eyeballed in a browser — no browser is attached to this session.**
- Known to need eyes at UX-6 or on deploy: at the 1180px shell width tiles become ~383x434, about 27% larger than before, and the 46px `%` readout plus the 22px `.label` are hard pixel sizes tuned for a 300px tile. The 1000px board cap was dropped rather than reinvented, so the grid is now flush with the full-width Mentor hero above it — a visual decision the user has not seen yet.
- Design change the writer had to make unilaterally: the decorative `+` glyphs that sat between tiles (and before the add button) are **gone**, because in a grid each would consume a cell and break the six-cell layout. This removes part of the "y on top, x + x + x below" equation metaphor noted in the board's own comments. Flagged to the user for a decision.

### UX-4 — House-designed day selector
- [ ] Build a custom day control matching the house tokens, replacing the bare native date input.
- [ ] Emit `YYYY-MM-DD` in local time so existing per-date task keys stay compatible.
- [ ] Keep the carry-forward action and the saved-dates history, and make the control keyboard and screen-reader operable.
- Route: delegated direct. Trigger: new module plus the tasks section it replaces.
- Checks: `pnpm build`.
- Status/evidence/commit: **done; uncommitted at time of writing**. The bare native `<input type="date">` is replaced by a four-part control in `dashboard.module.css`: previous-day stepper, a serif-italic formatted readout doubling as a `YYYY-MM-DD` text entry, next-day stepper, and a calendar button that calls `showPicker()` on a visually-hidden native input. The saved-dates chips are kept, restyled as pills, with `aria-pressed` marking the selected day. Styles went into `dashboard.module.css` rather than `globals.css` because the module is already imported by `Dashboard.tsx`, the control has exactly one consumer, and the real focus-ring convention lives there; `globals.css` holds primitives shared across pages.
- **Storage contract guaranteed structurally, not by convention.** `setDay` is reachable from exactly one function, `commitDay`, which accepts only values `normaliseDayKey` validated and that `localDateKey` itself produced. All four input paths (both steppers via `shiftDayKey`, the text field, the native picker, the chips) route through it. Parent grep confirms `toISOString` appears nowhere in `TasksSection` and the `vitality:tasks:YYYY-MM-DD` key pattern is untouched. `dayFromKey` builds a **local** `Date` anchored at 12:00, which makes stepping DST-safe and rejects impossible dates like `2026-02-31` (which would otherwise roll into March) and the `new Date(50, ...)` → 1950 trap. The writer verified the helpers across 8 timezones including UTC+14, UTC−11 and a 30-minute DST zone: 34 assertions, 120 round-trips, and a ~15.7M-hour sweep confirming `normaliseDayKey` is the identity function on every `localDateKey` output.
- Accessibility: real `<label htmlFor>` via `useId()`; Enter commits, Escape reverts the draft while keeping the caret (a ref guards the blur that would otherwise re-commit abandoned text); invalid input reverts and shows `role="alert"` wired through `aria-invalid` and `aria-describedby`; steppers announce their destination in their `aria-label`; a `role="status"` region announces the selected day; `:focus-within` tints the whole card so mouse focus is visible too, since `:focus-visible` alone never fires for mouse. The adjacent note/task inputs set inline `outline:'none'` with no replacement; that a11y gap was identified and deliberately left alone as out of scope.
- Deliberate decision: stepping **past today is allowed**. A task list is for planning, clamping would be a regression versus the native input it replaces, and a hard ceiling would break the carry-forward affordance, which is inherently "prepare the next day". One conditional plus a `disabled` attribute if a ceiling is ever wanted.
- Verification: `pnpm build` passed (writer and parent spot check): `✓ Compiled successfully`, `Generating static pages (10/10)`. Dev server returned HTTP 200 and was stopped. Risk assessed medium, `review_due: false` (`under_budget`), so no native review. **Painted appearance, real `showPicker()` behaviour, and screen-reader announcement order were not verified — no browser attached.**
- Proposed for UX-6, not applied: shorten `Carry incomplete tasks from previous date` to `Carry forward` with a descriptive `title`/`aria-label`; the section heading already says "Tasks by local date", and the long sentence is the mobile wrapping culprit.
- Correction to the earlier map: the `.field`/`.label`/`.input` primitives are at `globals.css:363-402`, not `341-378`.

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
- Completed: read-only exploration and mapping of the UI surface. UX-1 committed (`3135c05`), UX-2 committed (`f802b8f`), UX-3 committed (`9c9988a`). UX-4 verified, ready to commit.
- Current next step: UX-5, Notes and Tasks get their own routes.
