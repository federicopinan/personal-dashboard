## Exploration: focus productivity workflow

### Current State
- Focus timer is a page-scoped module (`focus-timer.js`) with `idle/running` state, preset durations, a sticky banner, stop-only controls, session logging to `focus:sessions`, and day-ring painting after stop/completion.
- Dashboard backup/import already exists in `index.html`, but export only captures raw localStorage strings and import only restores string values.
- Tasks live as date-keyed arrays (`goals:YYYY-MM-DD`) in `index.html`; `runRollover()` moves unfinished past-day goals into today and deletes the old key. There is no pending queue or session lifecycle tied to task completion.
- Notes are stored in `hub_notes` as a flat array of `{ text, time }` and rendered inline in the dashboard; users can add/delete and expand the list, but there is no persistent note board, note detail view, or back navigation.

### Affected Areas
- `index.html` — main dashboard UI, backup/import buttons, goals, notes, and current inline data helpers.
- `focus-timer.js` — timer state machine, session logging, banner rendering, and day-ring painting.
- `dashboard-shell.js` — shared localStorage/cache helpers and daily snapshot data already used by multiple pages.
- `single-thing.js` — existing example of a small daily item module; useful pattern if the workflow gets split into focused modules.
- `netlify/functions/store.mjs` — only if we decide import/export should evolve into a synced device-transfer flow instead of local file exchange.

### Approaches
1. **Incremental extension of the current shell** — keep `index.html` as the integration surface, add a fullscreen focus overlay, versioned backup/import, a pending-tasks section, and a note detail view directly in the existing app.
   - Pros: lowest code-motion, reuses current storage keys and event flow, fastest to ship.
   - Cons: `index.html` grows further; multiple concerns remain coupled.
   - Effort: Medium.

2. **Small shared data layer + feature surfaces** — add a tiny normalized data adapter for backup/import and the new workflow states, then let timer/tasks/notes consume it through focused UI modules.
   - Pros: better for cross-device import, cleaner schema/versioning, easier to grow the workflow.
   - Cons: slightly more upfront work; needs careful compatibility with existing keys.
   - Effort: Medium/High.

### Recommendation
Start with a versioned data-contract slice: define import/export schema and normalize notes/tasks/timer data first, then layer the fullscreen timer and persistent note board on top. That de-risks device transfer and gives the pending-task/session behavior a stable source of truth.

### Risks
- Import/export currently ignores non-string values, so richer objects need schema/version handling or data loss will occur.
- The requested pending-task/session behavior conflicts with today’s simple `goals:` rollover model and needs a clear rule for when a session remains open.
- The fullscreen timer and persistent note board both push against the current “single long `index.html`” composition, increasing maintenance risk if we do not split concerns.

### Ready for Proposal
Yes — but the user should confirm two product rules first: how import should resolve conflicts (replace vs merge) and what exactly qualifies a task as “pending” versus “done” for keeping the work/session open.
