# Tile slots — the connector

Your dashboard has fixed tile **slots**. A slot is empty until a file exists at:

```
public/tiles/<slot>.html
```

When that file exists, its tile on the dashboard becomes "filled" — clicking the
tile opens the file live in a sandboxed frame. When it's missing, clicking the tile
shows the "how to build this" panel instead.

## The slots

| Slot id  | Tile     | File                       |
|----------|----------|----------------------------|
| `train`  | Train    | `public/tiles/train.html`  |
| `fuel`   | Fuel     | `public/tiles/fuel.html`   |
| `vitals` | Vitals   | `public/tiles/vitals.html` |
| `sleep`  | Sleep    | `public/tiles/sleep.html`  |
| `screen` | Screen   | `public/tiles/screen.html` |
| `vee`    | Vee      | `public/tiles/vee.html`    |
| `peak`   | Peak     | `public/tiles/peak.html`   |
| `finance`| Finance  | `public/tiles/finance.html`|

## The tile format

Each slot file is **one self-contained HTML file**: all CSS and JS inline, no
external requests. It runs in a sandboxed frame with `allow-scripts` and no
same-origin access, so it has no network and cannot use localStorage. Match the
look: dark background, mint accent `#6EE7B7`.

### Saving data

A tile persists its data through the host bridge, which the dashboard provides. Do
not use localStorage (it is blocked in the sealed frame). Just call:

```js
// inside your tile
await window.Vitality.save(myData)         // persist
const data = await window.Vitality.load()  // read it back, returns [] when empty
```

By default this saves in the browser. There is no cloud lane — the dashboard is
local-only — so the data lives in this device's localStorage and stays with the
device.

## Two ways to fill a slot

1. **A Patreon episode.** Drop the episode's command into `.claude/commands/` and run
   it in Claude Code (e.g. `/logger`). It writes the exact slot file for you.
2. **Build your own.** Run `/tile <slot>` (see `.claude/commands/tile.md`), or ask
   Claude Code to "build a `<slot>` tile and save it to `public/tiles/<slot>.html`".

Then commit + redeploy (or reload locally) and the tile appears on your dashboard.

## Keeping `tiles-library/` in step

`tiles-library/` is what `/vitality` copies INTO `public/tiles/`, so it is a copy
OF the tiles, not the origin. After editing a tile in `public/tiles/`, copy it
back so a fresh install does not overwrite your change with an older one:

```bash
cp public/tiles/<slot>.html tiles-library/
```

### Sleep is keyed by the night

`sleep.html` owns the hours. A night is stored under the day it **began** — the
night of Tuesday is `2026-09-30`, even though you type it on Wednesday morning.
Any tile reading the hours must look back one night from the day it is
displaying. `vitals.html` and `peak.html` both do this; the date helpers are
copied into each file on purpose, because a tile is one sealed file with no
imports and no network, so there is nowhere to share them from.

### Fuel is keyed by the day, and it owns the water

`fuel.html` keeps glasses of water, one entry per calendar **day** — a day is
stored under the day it happened, so no shift applies — as
`{ target, 'YYYY-MM-DD': { glasses } }`. It also still carries the older
`{ water: { 'YYYY-MM-DD': count } }` object in the same store and imports from it
on every load, so `/sweep` and `save_data` can keep filing into the old shape.
There is no `water` slot: hydration moved into Fuel, so a second tile logging the
same number would be a second store for one fact.
