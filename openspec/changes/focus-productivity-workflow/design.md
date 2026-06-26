# Design: Focus Productivity Workflow

## Technical Approach

Deliver the workflow as a small vanilla JS slice: keep page markup in `index.html`, move reusable data/import/task/note helpers into `dashboard-shell.js`, and keep timer behavior in `focus-timer.js`. Existing localStorage keys remain authoritative; new code normalizes old shapes at read boundaries instead of migrating destructively.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Timer state | Use explicit `idle`, `active`, `paused` state with `remainingSeconds`, `plannedDuration`, `startedAt`, `activeStartedAt`, and `focusedElapsedSeconds`. | Compute only from `startedAt`; persist timer state. | Pause requires elapsed time excluding paused periods; persistence is not required by specs and would add recovery complexity. |
| Fullscreen timer UI | Create a `#focusOverlay` DOM node in `focus-timer.js`, styled by injected CSS, shown only for active/paused. | Reuse sticky banner; large static markup in `index.html`. | The spec replaces sticky banner during focus mode and keeps index changes reviewable. |
| Backup schema | Export `{ schemaVersion: 1, exportedAt, source, data: { [key]: parsedValue } }` while accepting legacy `{ items: { [key]: string } }`. | Export raw localStorage strings only. | Versioned JSON enables validation and merge rules; legacy import preserves current backups. |
| Merge strategy | Per-key merge helpers in `DashboardState`: arrays dedupe by stable identity; scalar/object keys replace imported value only on replace, preserve existing on merge unless covered helper exists. | Blind overwrite on import. | Prevents duplicate notes/tasks/sessions and keeps unrelated keys untouched. |
| Pending tasks | Derive from `goals:YYYY-MM-DD` keys older than today; mark complete by updating the source key/index. Disable current `runRollover()` deletion/move behavior. | Continue moving old tasks into today. | Specs require original dated task data remains readable and overdue tasks are not duplicated as today. |
| Notes navigation | Render `hub_notes` as board cards; keep in-memory selected note index/id for detail/back. | New storage key for note detail state. | Existing notes are compatible and navigation state need not persist. |

## Data Flow

```text
Export: localStorage keys -> DashboardState.collectBackup() -> versioned JSON -> download
Import: file -> validateBackup() -> replace | merge -> write same keys -> dashboard-data-changed

Overdue: goals:* keys -> derivePendingTasks(today) -> pending UI -> mark complete -> source goals key

Timer: preset -> startTimer() -> overlay tick -> pause/resume/reset/stop -> focus:sessions
```

## File Changes

| File | Action | Description |
|---|---|---|
| `dashboard-shell.js` | Modify | Add `DASHBOARD_BACKUP_SCHEMA_VERSION`, covered-key detection, parsed backup export, legacy backup import adapter, validators, merge/dedupe helpers, and overdue task selectors. Export helpers through `window.DashboardState` for tests and `index.html`. |
| `focus-timer.js` | Modify | Replace running-only model with idle/active/paused, render fullscreen circular overlay, implement pause/resume/reset/stop/completion, and log `focus:sessions` records. |
| `index.html` | Modify | Add minimal pending-task container, import choice dialog/controls, notes board/detail containers, and wire UI to `DashboardState` helpers. Remove or neutralize destructive `runRollover()` behavior. |
| `dashboard-shell.test.js` | Modify | Add unit-style regression cases for schema validation, merge dedupe, legacy import compatibility, overdue derivation/resolution, and timer pure helpers if exported. |

## Interfaces / Contracts

```js
BackupV1 = {
  schemaVersion: 1,
  source: 'personal-dashboard',
  exportedAt: string,
  data: { 'focus:sessions'?: FocusSession[], 'hub_notes'?: Note[], 'goals:YYYY-MM-DD'?: Goal[] }
}
```

Merge identity:
- notes: `id`, else `createdAt + title + content`, else `time + text` for current notes.
- tasks: `date + id`, else `date + text`.
- focus sessions: `startedAt + plannedDuration + actualDuration + status`.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Backup validation, covered keys, merge/dedupe, overdue derivation, date handling | Extend `dashboard-shell.test.js` with localStorage fixtures. |
| Unit | Timer transitions and elapsed math | Export/attach a small `FocusTimer` test seam or pure reducer under `window.FocusTimerTest`. |
| Integration | Import replace/merge writes same localStorage keys and dispatches updates | DOM/localStorage VM harness in existing Node test. |
| Manual | Fullscreen overlay controls and notes detail/back UX | Browser check on `index.html`; no framework/e2e runner exists. |

## Migration / Rollout

No destructive migration. Reads normalize legacy `hub_notes` entries (`{ text, time }`) and goal entries without `id`. Import accepts legacy raw-string backups and writes compatible localStorage keys.

## Review Budget

The 800-line single-PR budget is realistic only if helper extraction stays tight and CSS is injected/minimal. Risk is Medium: fullscreen overlay styling plus import UI can grow quickly; avoid broad `index.html` cleanup in this PR.

## Open Questions

- None blocking.
