# Single Thing Specification

## Purpose

The Single Thing capability provides one daily priority slot on the dashboard near goals. It MUST stay intentionally constrained to a single current-day item, persist within the same local date, support completion, and avoid carrying unfinished work into the next day.

## Requirements

### Requirement: Set single thing

The system MUST allow the user to save exactly one text item for the current local date.

#### Scenario: Save today's priority

- GIVEN the current day has no saved single thing
- WHEN the user enters text and saves it
- THEN the dashboard shows that text as today's single thing
- AND no UI is shown for adding a second item

#### Scenario: Reject empty priority

- GIVEN the input is empty or whitespace-only
- WHEN the user attempts to save it
- THEN no single thing is saved for today

### Requirement: Mark done

The system MUST allow the user to mark today's saved single thing as done and MUST record a completion timestamp.

#### Scenario: Complete today's item

- GIVEN today's single thing exists and is not done
- WHEN the user marks it done
- THEN the item state is done
- AND `doneAt` is recorded for the current time

### Requirement: Day rollover

The system MUST derive the active slot from the current local date and MUST NOT auto-fill today's slot from any previous date.

#### Scenario: Load after midnight

- GIVEN yesterday has a saved single thing
- WHEN the dashboard loads on a new local date
- THEN today's single thing slot is empty
- AND yesterday's item is not shown as active

### Requirement: Edit existing

The system MUST allow the user to change the current day's text before the item is marked done.

#### Scenario: Edit before completion

- GIVEN today's single thing exists and is not done
- WHEN the user changes the text and saves
- THEN the updated text replaces the previous text for today

#### Scenario: Prevent editing completed item

- GIVEN today's single thing is marked done
- WHEN the user views the widget
- THEN the completed text remains displayed as the final item for the day

### Requirement: Persistence

The system MUST persist today's item in localStorage as `singleThing:<YYYY-MM-DD>` with `{ text, done, setAt, doneAt }`.

#### Scenario: Reload same day

- GIVEN today's single thing was saved in localStorage
- WHEN the dashboard reloads on the same local date
- THEN the same text and done state are restored

#### Scenario: Mutations notify dashboard

- GIVEN the user saves, edits, or marks today's single thing done
- WHEN the mutation succeeds
- THEN the system dispatches `dashboard-data-changed`

### Requirement: Visual done state

The system MUST visually distinguish completed items with strikethrough and dim styling.

#### Scenario: Show completed styling

- GIVEN today's single thing is done
- WHEN the widget renders
- THEN the text appears struck through and visually dimmed

### Requirement: Reset on day change

The system MUST make day changes explicit by showing an empty current-day slot while preserving old date keys only as historical storage.

#### Scenario: Previous day remains historical

- GIVEN localStorage contains `singleThing:<yesterday>`
- WHEN today's key has no saved item
- THEN the widget renders an empty state for today
- AND it does not delete or display yesterday's key

### Requirement: Empty state

The system MUST show a helpful empty-state input placeholder and MUST NOT show legacy text from previous days.

#### Scenario: Helpful placeholder

- GIVEN today's slot is empty
- WHEN the widget renders
- THEN the input placeholder says `Lo único que tiene que salir hoy`

#### Scenario: No yesterday fallback

- GIVEN yesterday has an unfinished item and today is empty
- WHEN the widget renders
- THEN no yesterday text appears in the input or display state
