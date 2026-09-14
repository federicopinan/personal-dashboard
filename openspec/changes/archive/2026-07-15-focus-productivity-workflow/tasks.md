# Tasks: Focus Productivity Workflow

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 650-780 |
| 800-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR with work-unit commits |
| Delivery strategy | single-pr-default |
| Chain strategy | none |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: none
800-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Rollback boundary |
|------|------|-----------|-------------------|
| 1 | Data contract, import/export, pending selectors | PR 1 | Revert `dashboard-shell.js` helper additions and tests |
| 2 | Pending tasks, import UI, notes board/detail wiring | PR 1 | Revert `index.html` UI wiring; storage keys remain compatible |
| 3 | Fullscreen focus timer overlay/state machine | PR 1 | Revert `focus-timer.js`; existing `focus:sessions` remains readable |

## Phase 1: Data Foundation

- [x] 1.1 Add `DASHBOARD_BACKUP_SCHEMA_VERSION`, covered-key detection, parsed backup collection, and legacy `{ items }` adapter in `dashboard-shell.js`.
- [x] 1.2 Add backup validation and replace/merge helpers in `dashboard-shell.js`; dedupe notes, tasks, and focus sessions by the design identities.
- [x] 1.3 Add overdue task selectors/resolvers in `dashboard-shell.js` that read `goals:YYYY-MM-DD` keys older than today and update the source record.
- [x] 1.4 Export new helpers through `window.DashboardState` for `index.html` and `dashboard-shell.test.js`.

## Phase 2: Dashboard Wiring

- [x] 2.1 Replace `index.html` raw backup export/import with `DashboardState` versioned export, validation, and replace-or-merge restore flow.
- [x] 2.2 Add minimal import choice dialog/controls in `index.html`; invalid imports must not modify localStorage.
- [x] 2.3 Add pending task container in `index.html`; render overdue incomplete tasks and mark completion against the original `goals:YYYY-MM-DD` key.
- [x] 2.4 Neutralize destructive `runRollover()` behavior in `index.html`; it MUST NOT move/delete overdue tasks into today.
- [x] 2.5 Render `hub_notes` as note cards in `index.html`, with empty state, detail view, and explicit back navigation.

## Phase 3: Focus Timer

- [x] 3.1 Refactor `focus-timer.js` state to `idle`, `active`, and `paused` with explicit remaining/planned/elapsed fields.
- [x] 3.2 Replace sticky running banner behavior with a generated `#focusOverlay` fullscreen circular countdown for active/paused states.
- [x] 3.3 Implement pause/resume, reset without logging, stop with `stopped-early`, and auto-complete with `completed` session records.
- [x] 3.4 Expose a small `window.FocusTimerTest` seam or pure reducer for timer transition/elapsed tests.

## Phase 4: Verification

- [x] 4.1 Extend `dashboard-shell.test.js` for versioned export, legacy import, invalid import no-write, replace/merge dedupe, and dispatch behavior.
- [x] 4.2 Extend `dashboard-shell.test.js` for overdue derivation, resolving source dated tasks, duplicate minimization, and `runRollover()` no destructive move/delete.
- [x] 4.3 Add timer transition tests for start, pause/resume, reset, early stop, and completion elapsed math.
- [ ] 4.4 Manually verify `index.html`: fullscreen timer controls, import replace/merge prompt, pending task resolution, notes detail/back.
- [x] 4.5 Run `node dashboard-shell.test.js` and record results in the SDD verify phase.
