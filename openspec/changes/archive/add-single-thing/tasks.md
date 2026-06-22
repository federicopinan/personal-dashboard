# Tasks: Add Single Thing of the Day

## [x] 1. Create `single-thing.js` foundation

Add a top-level IIFE with `'use strict'`, constants for `singleThing:<YYYY-MM-DD>`, guarded access to `storeGet`, `storeSet`, and `showToast`, and an `init()` that no-ops if the widget root is missing.

### Acceptance
- Manual: load `index.html`; no console errors when the widget root is absent or helpers are unavailable.

### Files
- `single-thing.js`

## [x] 2. Add widget markup and styles

Insert the Single Thing section before the Goals block in `index.html`, including a root container, empty-state input, display area, done/edit controls, targeted CSS, and the `single-thing.js` script tag.

### Acceptance
- Manual: widget appears above Goals with placeholder `Lo único que tiene que salir hoy` and existing dashboard layout remains intact.

### Files
- `index.html`

## [x] 3. Implement save behavior

Wire input save on button click, Enter, and blur where appropriate. Trim text, reject whitespace-only values, persist `{ text, done: false, setAt, doneAt: null }`, and rerender.

### Acceptance
- Manual: saving text displays exactly one item; empty/whitespace saves do not create localStorage state.

### Files
- `single-thing.js`

## [x] 4. Implement done behavior

Add checkbox/done handling that sets `done: true`, records `doneAt`, writes today's key, calls `showToast`, and rerenders with completed styling.

### Acceptance
- Manual: marking done strikes through and dims the item; localStorage includes a numeric `doneAt`.

### Files
- `single-thing.js`, `index.html`

## [x] 5. Implement edit-before-done behavior

Add explicit pencil/edit control for non-done items, showing an edit input with save/cancel. Hide or disable editing once `done === true`.

### Acceptance
- Manual: an unfinished item can be edited and resaved; a completed item cannot be edited.

### Files
- `single-thing.js`, `index.html`

## [x] 6. Implement day rollover selection

On load, compute today's local date key and read only that key. Preserve old `singleThing:*` keys without displaying or deleting them.

### Acceptance
- Manual: seed yesterday's key and leave today's key empty; reload shows the empty placeholder and yesterday remains in localStorage.

### Files
- `single-thing.js`

## [x] 7. Render persisted state on page load

Render empty, set, editing, and done states from the current stored object, guarding malformed storage by falling back to empty UI without breaking the page.

### Acceptance
- Manual: reload restores today's text and done state; malformed storage does not throw console errors.

### Files
- `single-thing.js`

## [x] 8. Add manual smoke test checklist

Verify all spec scenarios manually: save, reject empty, complete, edit before completion, prevent completed edit, same-day reload, no yesterday fallback, and dashboard mutation notification.

### Acceptance
- Manual: checklist passes with no console errors and existing Goals behavior unchanged.

### Files
- `openspec/changes/add-single-thing/tasks.md`

### Manual Smoke Test Results
- [x] Save: non-empty text persists to `singleThing:<YYYY-MM-DD>` and displays exactly one item.
- [x] Reject empty: empty/whitespace text does not create a stored item.
- [x] Complete: done control records numeric `doneAt`, rerenders with strikethrough/dim styling, and calls toast.
- [x] Edit before completion: unfinished displayed text or pencil enters edit mode and resaves the same single slot.
- [x] Prevent completed edit: completed items hide edit controls and disable text editing.
- [x] Same-day reload: today's valid stored object restores text and done state on page load.
- [x] No yesterday fallback: only today's date key is read; old `singleThing:*` keys are preserved but not displayed.
- [x] Dashboard mutation notification: save, edit, and done write through `storeSet` when available, dispatching `dashboard-data-changed`.
- [x] Existing Goals behavior unchanged: Goals markup and handlers remain intact; Single Thing is inserted above Goals.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 165-240 |
| Chained PRs recommended | No |
| 400-line budget risk | Low |
| Decision needed before apply | No |
| Delivery strategy | single-pr |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low
