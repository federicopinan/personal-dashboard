# Notes Board Specification

## Purpose

This specification defines saved note cards on the dashboard with a detail view and explicit back navigation.

## Requirements

### Requirement: Notes Board Cards

The system MUST render saved `hub_notes` entries as note cards on the dashboard. Cards MUST preserve compatibility with existing `hub_notes` data and SHOULD show stable summary fields when available.

#### Scenario: Saved notes render as cards

- GIVEN `hub_notes` contains saved notes
- WHEN the dashboard renders the notes board
- THEN each note appears as a card
- AND each card shows a title or readable content preview

#### Scenario: Empty notes board

- GIVEN `hub_notes` is empty or absent
- WHEN the dashboard renders the notes board
- THEN an empty state is shown
- AND no invalid note card is rendered

---

### Requirement: Note Detail Navigation

The system MUST open a note detail view when a note card is selected. The detail view MUST provide explicit back navigation to the notes board without losing saved note data.

#### Scenario: User opens note detail

- GIVEN a note card is visible
- WHEN the user selects the card
- THEN the dashboard shows that note's detail view
- AND the detail includes the saved note content

#### Scenario: User returns to notes board

- GIVEN the user is viewing note detail
- WHEN the user activates back navigation
- THEN the notes board is shown again
- AND the same saved notes remain available

---

### Requirement: Note Identity During Merge

The notes board MUST avoid duplicate cards after data merge when notes have stable identity. Notes MUST dedupe by id when present, otherwise by createdAt + title + content.

#### Scenario: Duplicate note suppressed after merge

- GIVEN imported and existing notes match by id or fallback stable fields
- WHEN the notes board renders after merge
- THEN only one card is shown for that note
