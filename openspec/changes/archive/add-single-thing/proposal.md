# Proposal: Add Single Thing of the Day

## Why

Add one daily priority slot to reduce morning decision paralysis. The dashboard already has goals and notes, but those can become lists. This feature makes the intended product rule explicit: one thing that must ship today, visible near goals, easy to complete, and automatically scoped to the current date.

## What Changes

- Add a compact `Single Thing of the Day` widget near the existing goals section on `index.html`.
- Empty state shows one input with placeholder: `Lo único que tiene que salir hoy`.
- Once set, show the priority text with a checkbox/done button.
- Completing the item marks it done with strikethrough and a small lightweight celebration/toast.
- Persist per-day state in localStorage under `singleThing:<YYYY-MM-DD>` as `{ text, done, setAt, doneAt }`.
- On page load, derive today's key from the current local date; no carry-over if yesterday's item exists.
- Dispatch `dashboard-data-changed` after set/done/reset-relevant mutations.

## Capabilities

### New Capabilities
- `single-thing`: One daily priority slot with per-day localStorage persistence, done state, date rollover, and compact dashboard UI.

### Modified Capabilities
- None — this is additive beside existing goals and does not change goal behavior.

## Impact

| Area | Impact | Description |
|------|--------|-------------|
| `index.html` | Modified | Add widget mount point near goals and load the new module |
| `single-thing.js` | New | Encapsulate date keying, storage, rendering, input/done actions |
| localStorage | New | `singleThing:<YYYY-MM-DD>` stores one object per day |
| Existing helpers | Reused | `storeGet`, `storeSet`, `showToast`, `dashboard-data-changed` |

## Non-Goals

- Multi-item todo lists, ordering, priorities, tags, or recurring items.
- Editing historical days or carrying unfinished items forward automatically.
- Server sync, cross-device state, notifications, or calendar integration.
- Changing existing goals/today/tomorrow behavior.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Becomes a hidden todo list | Medium | Enforce one text value per day and no add-more UI |
| Date rollover confusion after midnight | Medium | Always compute key on load from local date; old keys remain historical only |
| Duplicate storage/helper logic | Low | Reuse existing storage helpers and event/toast patterns |
| Widget competes visually with goals | Medium | Keep it compact and place adjacent to goals without changing goal layout |

## Rollback Plan

Remove the `index.html` mount/script reference and delete `single-thing.js`. Existing `singleThing:*` localStorage keys are harmless and can be ignored or manually cleared.

## Success Criteria

- [ ] User can set exactly one thing for today.
- [ ] User can mark it done and see completed styling.
- [ ] Reload preserves today's state; tomorrow starts empty.
- [ ] No console errors and existing dashboard sections keep working.

## Open Questions

- None for this slice. Default assumption: unfinished items do not auto-carry into the next day.
