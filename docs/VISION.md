# Vitality — improvement roadmap

This is the live vision for where the dashboard goes next. Each item is an
independent vector; do the ones that excite you.

## 1. Live stats on tile faces

Right now every tile shows beautiful static poster art — but the stat slot
exists in CSS (`.veeTiles .stat`) and the `CoreTile.stat()` method is never
called. The bridge has a `Vitality.report()` lane that already works. Wiring
it means each tile shows a glanceable live number on its face without opening
the overlay.

- **Target**: Train tile shows today's set count, Fuel shows today's water,
  Vitals shows recovery %, Finance shows on-track %, Peak shows score.
- **How**: `DashboardGrid` reads reported values from each tile's data,
  passes them as `data-stat` on the poster face. `veeTilesAnim.ts` picks
  them up.
- **Effort**: 2–3 hours. Mostly plumbing — the CSS is already done.

## 2. Library tile — bring it back

`DEFAULT_HOME_ORDER` includes `library` but it's filtered out in
`DashboardGrid.tsx` line 29. The Library was a scrollable gallery of design
presets. It's fully registered in the type system and has CSS — just needs
unblocking.

- **Options**: (a) Re-enable as a tile face that opens the design picker.
  (b) Fold it into the Vee/Mentor tile as a sub-tab.
- **Effort**: 30 min to ungate, 2–3 hours to make it useful.

## 3. Visual polish

- **Scrollbar**: Done — custom mint thin scrollbar on `.xRow`.
- **Missing `designs.ts`**: `veeTiles.css` references `lib/tiles/designs.ts`
  (line 215 comment) but it doesn't exist. Create it with the widget motion
  design SVGs so the `wmArt` class works properly.
- **Overlay scrollbars**: The `openStage` panels use `overflow: auto` with
  default browser scrollbars. Style them like the xRow.
- **SettingsPanel**: Already simplified, but the "How" / "Make it yours" /
  "Data" tabs could use content polish.
- **Toast notifications**: No feedback when data is saved. A tiny mint toast
  after `Vitality.save()` would make the bridge feel alive.

## 4. Arm the arsenal tiles

The Vitality arsenal ships: Logger, Stack, Radar. Only Logger (`train`) is
wired. The Stack and Radar can become new tiles or merge into existing ones.

- **Stack** → a `supplements` tile (or merge into Fuel)
- **Radar** → a `subs` tile for subscription monitoring
- Both have `.claude/commands/` entries and `code/` sources ready

## 5. Data persistence — Supabase sync

The `lib/sync.ts` module exists but is gated on Supabase keys. The
`backend.sql` and `supabase/` folder have the schema ready. Turning it on
means: create a Supabase project, add the env vars, and the dashboard
syncs across devices automatically.

- **Dependency**: A Supabase account (free tier works).
- **Effort**: 1 hour setup, then it just works.

## 6. Mentor — the math comes alive

The `y = Σ w·x` equation is all in `weights.ts` and `coreTiles.ts` but the
Mentor tile shows a static score. The `Vitality.report()` lane was built to
feed x values from each tile. Wiring it means:

- Each tile reports its 0–100 score
- The Vee tile computes `Σ w·x / 100` in real time
- The noticed feed (weights.ts) starts finding patterns
- Tiles retune weights by their correlation to the active goal

## 7. Clean up legacy dead ends

- `openspec/` — review if still needed for the MCP connector API or archive
- `netlify/` — already deleted
- `lib/vitality/dashboardStats.ts` — vestigial, 9 lines, imported but unused

## Quick wins (this week)

| Task | Effort | Impact |
|------|--------|--------|
| Wire stat() on tile faces | 2h | High — tile faces come alive |
| Create designs.ts | 1h | Fixes broken wmArt CSS |
| Ungate Library tile | 30m | Another tile on the board |
| Style overlay scrollbars | 15m | Consistent look |
| Clean dashboardStats.ts | 5m | Remove dead import |
