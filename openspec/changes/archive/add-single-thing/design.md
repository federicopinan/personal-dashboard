# Design: Add Single Thing of the Day

## Architecture

Add a small, additive widget to `index.html` and isolate behavior in a new `single-thing.js` file. The module will follow the existing `focus-timer.js` pattern: top-level IIFE, `'use strict'`, module constants/state, private render/action helpers, and a small `init()` at the end.

State ownership belongs to `single-thing.js`. `index.html` only owns markup, CSS, and script inclusion. The module reuses the dashboard conventions already present in `index.html`: `storeGet`, `storeSet`, `showToast`, and `dashboard-data-changed`. If those globals are unavailable, the module should fail softly by no-op rendering rather than breaking the dashboard.

Design decisions:

| Choice | Tradeoff | Decision |
|---|---|---|
| New `single-thing.js` IIFE | One extra script request, but keeps `index.html` from growing more inline JS | Use it; matches `focus-timer.js` and preserves separation |
| Widget above Goals section | Slightly more vertical content before Today goals | Use it; the feature is a daily priority and should lead the goals list |
| No day ring integration | Less visual payoff | Keep MVP simple and avoid touching working ring logic |

## Data Model

Storage key is date-scoped by local date:

```js
singleThing:<YYYY-MM-DD>
```

Value schema:

```js
{
  text: string,
  done: boolean,
  setAt: number,   // Date.now() when created or edited
  doneAt: number | null
}
```

Retention is passive. Old `singleThing:*` keys stay in localStorage as historical data, but the active widget only reads today's key. There is no cleanup, carry-over, or history UI in this change.

## UI Layout

Insert a new `.section` immediately before the existing `<!-- Goals Summary + Quick Add -->` block in `index.html`, after the day ring/streak section. Use the same card language as Goals (`.gm-card`, `.gm-input-wrap`, `.goal-input`, `.goal-add-btn`) and add only targeted classes for single-thing-specific state.

Visual states:

- Empty: card title `Single Thing`, input placeholder `Lo único que tiene que salir hoy`, save button.
- Set: show the saved text, a done control, and a small pencil/edit control.
- Editing: replace display text with an input + save/cancel controls; only available before completion.
- Done: show final text with `text-decoration: line-through` and `opacity: 0.5`; editing hidden/disabled.

Prefer a small pencil icon/button for edit. Clicking text to edit is faster but easier to trigger accidentally; an explicit edit button is clearer on touch screens.

## State Machine

```text
empty --save non-empty text--> set
set --edit + save non-empty text--> set
set --mark done--> done
done --view only--> done
```

Whitespace-only saves are ignored. Mutations (`save`, `edit`, `done`) write today's key with `storeSet`, rerender the widget, and dispatch the existing dashboard data-change event through `storeSet`. Completing also records `doneAt` and calls `showToast` with a lightweight completion message.

## Day Rollover

On module initialization, compute today's local `YYYY-MM-DD` and read only `singleThing:<today>`. If yesterday has data but today does not, render empty. This is a key-selection reset, not data deletion.

Background tabs may stay open across midnight and will not automatically reset unless code actively watches the clock. For this MVP, rollover is guaranteed on page load/reload only, matching the spec. A future enhancement could check the date on visibility change or a low-frequency timer.

## File Changes

| File | Action | Lines approx | Description |
|---|---:|---:|---|
| `index.html` | Modify | +45–70 | Add widget markup before Goals, targeted CSS, and `<script src="single-thing.js"></script>` after `focus-timer.js` or adjacent to it |
| `single-thing.js` | Create | +120–170 | IIFE module for date keying, storage reads/writes, rendering, edit/done handlers, and init |

Estimated total: +165–240 lines, below the cached 400-line budget.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Widget becomes another todo list | Store exactly one object per date and expose no add-more UI |
| Completed item accidentally edited | Hide/disable edit controls when `done === true` |
| Date rollover confusion in long-lived tabs | Document MVP as load-time rollover; do not show previous-date fallback |
| Inline JS bloat in `index.html` | Keep behavior in `single-thing.js`; `index.html` only gets structure/styles/script tag |
| Missing helper globals breaks page | Guard initialization and DOM lookups; fail softly |

## Open Questions

None.
