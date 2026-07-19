# The Design Lab — demo archive

Saved before deleting `public/demo/index.html`. See below for what each file
was and what it linked to.

## Files & their purpose

| File | Role |
|------|------|
| `index.html` | **Lab entry.** Linked from DashboardGrid "+ New tile" → "Design Lab". Tabbed page: Install (copy command), Logger (iframe), Stack (iframe), Radar (iframe). Theme: dark, mint `#6EE7B7`, Instrument Serif + JetBrains Mono. |
| `customize-demo.html` | **Phone mockup.** Interactive dashboard customization demo: edit greeting, pick wallpaper, choose accent color. Originally used for the "Make it yours" flow. |
| `backend.sql` | Supabase schema shown in the lab (same as root `backend.sql`). |
| `lab/logger.html` | Full workout logger preview (standalone sealed HTML). Embeds the exact same code as `code/the-living-logger.html`. |
| `lab/stack.html` | Supplement stack preview. Embeds the stack code from the arsenal. |
| `lab/subs.html` | Subscription radar preview. |
| `lab/tesseract-deck.html` | Tesseract deck — tile design system preview. |
| `tiles/peak.html` | Peak tile standalone preview (duplicate of `public/tiles/peak.html` in design-lab context). |
| `tiles/vitals.html` | Vitals tile standalone preview (duplicate of `public/tiles/vitals.html` in design-lab context). |

## What referenced it

`app/app/DashboardGrid.tsx` line ~355:
```ts
const DESIGN_LAB_URL = '/demo/index.html'
```
Used in the `NewTileOverlay` component — the "Design Lab →" link.

## Design tokens (shared)

```
--mint:#6EE7B7   --mint-ink:#042a1c   --mint-cool:#A7F3D0
--amber:#F59E0B  --mint-glow:rgba(110,231,183,.4)
--ease-premium:cubic-bezier(.16,1,.3,1)
--spring:cubic-bezier(.34,1.56,.64,1)
```

## Notes

- The lab index had 4 tabs: Install (default), Logger, Stack, Radar
- Each tab showed a command hero with copy button + an iframe exhibit
- The "Install" tab showed the one-liner curl command to get the arsenal
- The Logger tab embedded logger.html in an exhibit iframe
- Season badges showed S1/S2 episode counts per tab
