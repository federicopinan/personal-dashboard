---
description: Build a self-contained Vitality dashboard tile and drop it into its slot.
---

You are building ONE dashboard tile for a Vitality Base fork.

The argument is the tile's id — a short lowercase name, no spaces (`coffee`,
`reading`, `guitar`). It must be one of:
`train, fuel, vitals, sleep, screen, vee, brand, peak, finance`

If the argument is not one of those, it is a NEW tile. That is allowed and
normal: this is how every new input on the board gets made. If no id is given,
ask what to call it, then continue.

Build the tile as a single self-contained HTML file and write it to:
`public/tiles/<id>.html`

## The two-file rule (a new tile needs BOTH)

The board reads `public/tiles/manifest.json` — the roster — to learn which ids
exist. A static host cannot list a folder, so a tile file nobody listed is
invisible: no error, no tile, and a board that looks like nothing happened.

So, for a NEW id, after writing the file:

1. add the id to the `"tiles"` array in `public/tiles/manifest.json`, and
2. tell the user to press **Re-scan tiles** in the "+ New tile" panel — no
   reload, no rebuild, and their tile order and removed tiles are untouched.

An EXISTING id needs only step 2 (its manifest entry is already there).
Copy `public/tiles/<id>.html` back to `tiles-library/<id>.html` too if the
library should carry the new tile, since that is what `/vitality` installs from.

Ids are the file name: lowercase letters, digits, dot and dash, up to 40
characters. The board shows a tile whose id it has no descriptor for as a plain
neutral face labelled from the id itself, which is expected for a new tile — it
is not a broken tile. If the user wants a bespoke poster (art, glyph, an animated
orb) rather than a neutral one, that means a descriptor in
`lib/tiles/coreTiles.tsx` as well, and `CoreTileId` must gain the id with it —
ask before editing that file, it is a hand-written registry.

Rules (the Sealed Tile Contract):

1. One file. All CSS and JS inline. No external requests, no imports, no CDN links, no fonts
   over the network. The tile runs in a sandboxed iframe with no network, so anything not inline
   will not load.
2. Match the look: pure black background, mint accent `#6EE7B7`, Inter or system font, minimal
   and premium. No emojis in the UI.
3. Save data through the host bridge, never localStorage (localStorage is blocked inside the
   sealed tile). The dashboard provides `window.Vitality` for you:
   - `await window.Vitality.save(data)` to persist (data is JSON; an array of records is the
     natural shape).
   - `const data = await window.Vitality.load()` to read it back (returns `[]` when empty).
   Do not define `window.Vitality` yourself. The dashboard injects it at mount.
4. On load, call `window.Vitality.load()` first and render whatever comes back, so the tile
   restores its state every time it opens.

The dashboard is local-only now (Netlify is the documented deployment target and a
serverless function cannot persist into a browser's localStorage), so tile data lives
in the browser's localStorage through the bridge above. There is no Supabase, no MCP
connector, no backend to wire into. The tile ships in the repo; the user re-scans (or
reloads) and it appears.

After writing the file, tell the user to press **Re-scan tiles** in the "+ New tile"
panel so the `<id>` tile fills right away, and to commit the file (and the manifest
entry, for a new id) so it survives a redeploy.