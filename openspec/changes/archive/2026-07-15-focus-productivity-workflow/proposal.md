# Proposal: Focus Productivity Workflow

## Problem Statement

The dashboard has focus, backup, tasks, and notes features, but lacks an end-to-end workflow for immersive focus, device transfer, unresolved work, and note browsing.

## Goals

- Turn focus start into a fullscreen circular clock with pause, reset, stop, and active counting.
- Add import support so users can move local dashboard data between devices.
- Keep overdue incomplete tasks visibly pending until resolved, without blocking app/session close.
- Render saved notes as board cards with card detail and back navigation.

## Non-Goals

- Cloud sync, accounts, or Netlify-backed device transfer.
- Blocking app/session close while pending tasks exist.
- Full `index.html` decomposition beyond small helper extraction.

## Proposed Scope

### In Scope
- Versioned import/export payload for localStorage dashboard data.
- Import conflict prompt: replace or merge existing dashboard data.
- Fullscreen focus overlay over the existing timer model.
- Pending task section derived from any overdue incomplete `goals:YYYY-MM-DD` items.
- Notes board from `hub_notes` with detail/back flow.

### Out of Scope
- Multi-user conflict resolution.
- Server persistence or realtime sync.
- Historical task analytics.

## UX Behavior Summary

- Starting the timer enters fullscreen focus mode immediately and starts the counter.
- Pause freezes time; reset returns to planned duration; stop exits focus mode and logs.
- Import opens a replace/merge choice when current dashboard data exists.
- Pending tasks remain visible until checked complete or otherwise resolved.
- Notes show as cards; selecting a card opens a detail view with explicit back navigation.

## Data Migration and Import/Export

- Export emits versioned JSON, not only raw localStorage strings.
- Import validates schema version and keys before writing.
- Replace clears covered keys; merge preserves existing data and combines compatible collections.
- Existing keys (`focus:sessions`, `goals:*`, `hub_notes`) stay readable.

## Capabilities

### New Capabilities
- `dashboard-data-portability`: Versioned export/import and replace-or-merge restore behavior.
- `pending-task-continuity`: Overdue incomplete task visibility until resolution.
- `notes-board`: Saved note card board with detail/back navigation.

### Modified Capabilities
- `focus-timer`: Fullscreen circular focus mode plus pause/reset/stop behavior.

## Approach

Use a first reviewable slice: tiny versioned data contract plus focused UI additions. Keep work local to `index.html`, `focus-timer.js`, and `dashboard-shell.js` helpers only if needed.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `index.html` | Modified | Import UI, pending tasks, notes board/detail |
| `focus-timer.js` | Modified | Fullscreen overlay and timer controls |
| `dashboard-shell.js` | Modified | Shared schema/storage helpers if extraction is needed |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Single PR exceeds 800 changed lines | Medium | Keep first slice minimal; defer module cleanup |
| Merge semantics lose or duplicate data | Medium | Specify per-key merge rules before implementation |
| Timer state complexity grows | Medium | Preserve explicit state transitions and testable helpers |

## Open Questions

- Exact merge rules for duplicate notes, focus sessions, and overdue task collisions.

## Rollback Plan

Revert this change folder and later implementation PR. Storage remains localStorage-compatible, so older code keeps reading existing keys; versioned backup import may become unsupported.

## Success Criteria

- [ ] Starting focus shows fullscreen circular clock and supports pause/reset/stop.
- [ ] Exported data can be imported on another device with replace or merge.
- [ ] Any overdue incomplete task is visible as pending without blocking close.
- [ ] Notes render as cards with detail and back navigation.
