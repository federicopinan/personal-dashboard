# The Equation — the layout, the model, the business (2026-07-10)

Luke's one-liner: **find yourself, your algorithm.** The dashboard is an equation:

```
y  =  w1·x1 + w2·x2 + w3·x3 + …

y  = the Mentor tile (the OUTPUT): your #1 goal, everything summed
x  = each input tile (Train, Fuel, Vitals, … and every tile you add)
w  = that tile's weight toward the goal (≈ 22% bottom-right badge)
```

If the goal is "famous YouTuber + 185 lb lean" — Brand and Train carry big weights,
every tile is an input you feed, and the Mentor notices everything.

## The layout (SHIPPED — commits 7c56c4e + 558712c)

- **y on top:** the Mentor tile, full width. Label "Mentor", kicker "Notices everything".
  Eyebrow: *y = the output — every tile, summed*.
- **x below:** ONE horizontally scrollable row, every tile the same size (300×340),
  serif `+` glyphs in the gaps (x + x + x…), edges fade out. Eyebrow: *x = the inputs*.
- **+ tile** at the end (same size, dashed, transparent) → New-tile creator, which also
  promos the **Vitality Design Lab** ("out of ideas? browse Rowan & Luke's tiles —
  support them") → Patreon.
- **Edit** (small, above the row): tiles wobble, ✕ removes, drag reorders; persisted
  (`vitality:eq:order` / `vitality:eq:removed`).
- **Weights:** `lib/tiles/weights.ts` — plain numbers shown ≈ N% on each tile.
  **No AI key at runtime.** The user tells Claude Code their goal; Claude re-runs the
  math and edits the file (or a goals UI edits the
  `vitality:goals` localStorage override).

## Data-in — the teaching core ("the biggest problem")

Sealed tiles can't fetch (sandboxed, no network). So ALL automation flows one lane:

> **Tile = the gauge. One bridge = the pipe. Claude = the robot that fills it.**

| Lane | How | Status |
|---|---|---|
| Manual | type in the tile → `Vitality.save()` → localStorage | works |
| Claude in VS Code | ask Claude to write data / edit the tile | works |
| **File edits** | Claude edits `public/tiles/<slot>.html` and the tile picks it up on reload | works |

The historical connector lane (MCP `create_tile` / `read_tile` / `save_data` /
`read_data` → server-side Supabase backend) is retired in the
Netlify/localStorage migration: a serverless function cannot persist server
writes into a browser's localStorage, so the connector had nowhere to land.
The dashboard is local-only by design today.

Canonical local recipe: *finances → Finnhub key → edit the Finance tile to
read its own source (a CSV they paste, an exported brokerage file) and write
through `window.Vitality.save`* — same shape, no cloud lane.

## The Mentor (y) — next build

- Set the **#1 goal** on the Mentor in a nice design (goal text + target date).
- **Peak score, no Anthropic key:** each tile ships a deterministic score function
  (0–100, computed from its own data — defined per episode); it reports through the
  existing trusted bridge (`Vitality.report`, per-tile identity in useTileHost — the
  report lane exists in code but is currently a no-op in the base). Host aggregates:
  **score = Σ weight × tile score**, shows per-tile contribution (x = vitals = 45.3%).
- Claude (optional, user's own subscription) advises ON TOP of the numbers — the
  numbers themselves never need a key.

## The business loop

- **Free (YouTube):** the base — blank board, the equation layout, build-your-own
  tiles, everything shown on camera. One-paste setup + `/vitality` installs the demo set.
- **Paid (Patreon):** the **Vitality Design Lab** — the site with every episode's
  `/command` (e.g. `/logger`, `/finance`): run it and the tile lands in your row.
  Some free, most blurred behind the paywall. The **tile-customize / skin editor**
  (already built in the main app) becomes a paid Design Lab button too.
- **Each episode = one new input tile + one data-in method** (manual → file
  edit → on-tile paste/import → on-device read of a user-supplied file).
  That's the content engine and the income.
- Patreon: https://www.patreon.com/cw/RowanTBK/shop · prod: https://vitality-jade.vercel.app

## Next steps (in order)

1. **Deterministic tile scores** (each tile reports 0–100 through `Vitality.report`;
   Mentor aggregates `Σ w·x / 100` and shows per-tile contribution). Server-side
   `tile_data` writes are gone with the connector — score aggregation is purely
   client-side over localStorage.
2. **Mentor goal UI + on-device patterns** (goal, weights editor, Σ w·x, per-tile %).
   Patterns are computed by the mentor (Claude Code) at write time, not by the app
   at runtime, and land in the noticed feed through the same localStorage write path.
3. **Prove one on-tile data flow on camera:** Finnhub → edit the finance tile to
   read its own CSV paste → tile updates itself every time the user pastes a new
   export. No key in the app, no cloud lane.
4. Dynamic slots (beyond the fixed 6) so every future episode adds a brand-new tile.