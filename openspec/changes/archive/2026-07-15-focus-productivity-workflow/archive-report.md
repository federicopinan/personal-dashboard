# Archive Report: focus-productivity-workflow (archived 2026-07-15)

## Final Status

ARCHIVED — never promoted; orphaned by an earlier cleanup.

## Why it was archived without promotion

The change was authored for a different codebase:

| Reference in the change | Actual project today |
|-------------------------|----------------------|
| `index.html` (single-file dashboard) | `app/app/Dashboard.tsx` (Next.js client component) |
| `dashboard-shell.js` | does not exist |
| `focus-timer.js` | does not exist |
| `single-thing.js` | does not exist |
| `netlify/functions/store.mjs` | does not exist |
| `dashboard-shell.test.js` | does not exist |
| `focus:sessions` / `goals:YYYY-MM-DD` / `hub_notes` localStorage keys | `vitality:me:tile:<slot>:data` (sealed-tile bridge, see lib/tiles/tileStore.ts) |
| `supabase/sync.sql` | removed in the Netlify/localStorage migration |

Nothing in this change could be promoted to `openspec/specs/` without
contradicting the actual project.

## Final Diff Size

- Original change folder (6 source files + 4 spec deltas) was copied into this
  archive folder before the source folder was zeroed with an ARCHIVED notice.
- No code was changed.

## Spec Sections Promoted

None. The four deltas (`focus-timer`, `dashboard-data-portability`,
`notes-board`, `pending-task-continuity`) describe behavior of files that do
not exist in this repo today. The legitimate Next.js+React focus-timer and
single-thing features live in the dashboard chrome / SettingsPanel today;
specs for them live alongside the legacy `openspec/specs/` content (which
carries an archive notice — see those files).

## Warnings Carried Forward

The original `verify-report.md` was a FAIL verdict (manual browser
verification blocked, multi-lens coverage incomplete). It is preserved
here for traceability but has no live counterpart.

## Archive Location

`openspec/changes/archive/2026-07-15-focus-productivity-workflow/`

The legacy source folder at `openspec/changes/focus-productivity-workflow/`
now contains a single `ARCHIVED.md` pointing here.