---
description: REMOVED — there is no connector. The dashboard is local-only; round data in via /tile + window.Vitality.save.
---

This command was retired in the Netlify/localStorage migration.

The Vitality Base dashboard is local-only now: every tile persists its data
into the browser's localStorage through `window.Vitality.save(data)` (see
public/tiles/README.md), and there is no server endpoint to file data into.
The previous `/sweep` command routed file data through the MCP connector's
`save_data` tool, which no longer exists.

If you want to file numbers into a tile from outside the dashboard today,
your options are:

- **Type them in the tile** — the simplest path. Click the tile, paste/edit,
  save. It persists in the browser.
- **Have Claude (Code) write them** — paste numbers into the chat and ask
  Claude to update the right `window.Vitality.save(...)` payload, then save.
- **Build it into the tile** — edit `public/tiles/<slot>.html` so the tile
  reads its own source (a file the user drops into the inbox folder, a CSV
  they paste, etc.) and writes it through `window.Vitality.save`.

There is no scheduled round; the dashboard has no server to schedule against.