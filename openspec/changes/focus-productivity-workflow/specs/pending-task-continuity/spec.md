# Pending Task Continuity Specification

## Purpose

This specification ensures overdue incomplete dashboard tasks remain visible until resolved without blocking normal app or session exit.

## Requirements

### Requirement: Overdue Incomplete Task Visibility

The system MUST show incomplete tasks from `goals:YYYY-MM-DD` keys dated before today in a pending task area. Today’s tasks MAY remain in their existing section and MUST NOT be duplicated as overdue.

#### Scenario: Overdue task appears as pending

- GIVEN an incomplete task exists under yesterday's `goals:YYYY-MM-DD` key
- WHEN the dashboard loads today
- THEN the task appears in the pending task area
- AND the original dated task data remains readable

#### Scenario: Completed overdue task is hidden

- GIVEN an overdue task is already marked complete
- WHEN the pending task area renders
- THEN that task is not shown as pending

---

### Requirement: Pending Task Resolution

The system MUST allow a pending task to be resolved by marking it complete. Resolution MUST update the original dated task record so the task does not reappear on reload.

#### Scenario: User resolves a pending task

- GIVEN an overdue incomplete task is visible as pending
- WHEN the user marks it complete
- THEN the source `goals:YYYY-MM-DD` item is marked complete
- AND the task is removed from pending on the next render

#### Scenario: Imported duplicate pending tasks are minimized

- GIVEN merge import produces tasks with matching date + id, or date + text when id is absent
- WHEN pending tasks render
- THEN only one pending entry is shown for that stable match

---

### Requirement: Non-Blocking Continuity

The system MUST NOT block browser close, navigation, reload, or focus session exit because pending tasks exist.

#### Scenario: User leaves with pending tasks

- GIVEN pending tasks exist
- WHEN the user closes, reloads, or navigates away from the dashboard
- THEN no blocking confirmation is required by this feature
- AND unresolved tasks remain visible on the next dashboard load
