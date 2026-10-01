# Vitality Base Dashboard

Your own personal dashboard, forkable in a couple of minutes. It boots as the
**full Vitality equation dashboard** — your goal on top, every tile an input
feeding it, the AI Mentor running the math. Every tile starts with bare-bones
data (yours to fill), every tile is swappable, and `/detonate` takes it down
to a blank canvas if you'd rather build from nothing.

**No backend. No login. No accounts.** Fork it, deploy it, done.

The dashboard is local-only: every tile's saved data lives in your browser's
localStorage through `window.Vitality.save(data)` and `window.Vitality.load()`.
There is no cloud sync, no connector, no Supabase — just files in
`public/tiles/` and data in the browser. Netlify is the documented deployment
target (a serverless static host cannot persist server writes into a browser's
localStorage, so the cloud lane that used to live behind the connector is
intentionally gone).

---

## Deploy in 2 minutes

1. **Use this template** (green button on GitHub) to create your own repo.
2. **Deploy to Netlify**: import the repo, click Deploy. There are **no
   environment variables** required to ship the dashboard. (Optional: set
   `FINNHUB_API_KEY` to enable the live stock-price quote; see "Live data"
   below.)

   Netlify auto-detects Next.js via `netlify.toml` and the
   `@netlify/plugin-nextjs` plugin — no extra wiring.

That is it. Your dashboard is live at your Netlify URL.

### Make it yours

Edit one line in [`content/site.ts`](content/site.ts) to put your name in the
greeting:

```ts
export const site = { name: 'Your Name' }
```

### Live data (optional)

By default the dashboard needs no environment variables. The one optional
live-data path is the **Finnhub stock quote** (`/api/finance/quote`), which
serves live prices to the Finance tile without ever exposing the API key to
the browser:

1. Create a free account at https://finnhub.io
2. Add your own API key in Netlify → Site settings → Environment variables
   (`FINNHUB_API_KEY`), and in `.env.local` for local dev
3. Restart dev / redeploy so the platform picks up the key

The key stays server-side; it is never bundled into the deployed app. Without
the key, the Finance tile just shows "add a key" and manual entry still works.
Treat the key as **your own, per-user** — never share one. A shared key hits
its free quota and gets revoked for everyone at once.

## Run it locally

```bash
git clone <your-fork-url>
cd vitality-base
npm install
npm run dev
```

Then open http://localhost:3000. Requires Node 20+ (see `.nvmrc`).

---

## Filling the tiles

Click any tile and it opens a panel telling you how to build it. A tile fills when a
file exists at `public/tiles/<id>.html` **and** that id is listed in
`public/tiles/manifest.json` — the roster the board reads, because a static host
cannot list a folder. Two ways to fill one:

- **Use predefined library tiles.** Copy any tile from `tiles-library/` into `public/tiles/<id>.html`.
- **Build custom tiles.** Open this repo in Claude Code, OpenCode, or any AI harness and
  ask for a tile, or run `/tile <id>`. The harness writes the file and adds the id to the
  manifest; then press **Re-scan tiles** in the "+ New tile" panel — no reload, no rebuild.

Any id works. A tile whose id has no bespoke poster art in `lib/tiles/coreTiles.tsx` is drawn
as a plain neutral face labelled from its id, so a new tile is a real tile the moment its
file and manifest entry land.

A tile is one self-contained HTML file. It saves its own data through the dashboard
bridge, `window.Vitality.save()` and `window.Vitality.load()`, which the dashboard
provides. Full contract: [`public/tiles/README.md`](public/tiles/README.md) and
[`.claude/commands/tile.md`](.claude/commands/tile.md).

The tiles that ship: `train`, `fuel`, `vitals`, `sleep`, `screen`, `vee`, `peak`, `finance`.

`tiles-library/` is the source these are copied FROM. Editing a tile means
editing `public/tiles/<slot>.html` and copying the change back
(`cp public/tiles/<slot>.html tiles-library/`), so the `/vitality` install
command below never installs a stale tile.

---

## Tech

Next.js 14 (App Router) · React 18 · TypeScript · vanilla CSS · Three.js for the
header gem · deployed on Netlify. Zero-backend by default: tiles are static
files committed to the repo, and tile data lives in the browser's localStorage
through the host bridge. There is no cloud sync, no connector, and no
database — by design, because the documented host (Netlify) cannot persist
server writes into a browser's localStorage.