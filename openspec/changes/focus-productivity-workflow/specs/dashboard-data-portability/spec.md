# Dashboard Data Portability Specification

## Purpose

This specification defines safe local dashboard data export and import across devices while preserving existing localStorage compatibility.

## Requirements

### Requirement: Versioned Export Payload

The system MUST export a JSON payload with a schema version and dashboard data from existing localStorage keys, including `focus:sessions`, `goals:*`, and `hub_notes`. Export MUST NOT rename or remove the source keys.

#### Scenario: Export supported dashboard data

- GIVEN dashboard data exists in localStorage
- WHEN the user exports data
- THEN the payload includes a supported schema version
- AND includes data from covered keys using their existing key names

#### Scenario: Export with missing optional keys

- GIVEN one or more covered keys are absent
- WHEN the user exports data
- THEN the payload remains valid
- AND missing collections are represented as empty or omitted consistently

---

### Requirement: Safe Import Validation

The system MUST validate imported JSON before writing. It MUST reject unsupported schema versions, invalid top-level shape, and invalid covered collection values without modifying localStorage.

#### Scenario: Valid import is accepted for restore choice

- GIVEN an imported payload has a supported version and valid covered keys
- WHEN validation runs
- THEN the user is offered replace or merge

#### Scenario: Invalid import is rejected safely

- GIVEN an imported payload has an unsupported version or invalid data shape
- WHEN validation runs
- THEN no localStorage keys are modified
- AND the user sees an import failure state

---

### Requirement: Replace or Merge Restore

The system MUST prompt for replace or merge when current dashboard data exists. Replace MUST clear only covered keys before writing imported values. Merge MUST preserve existing data and combine compatible collections while avoiding duplicates when stable fields are available.

#### Scenario: Replace restore keeps compatibility

- GIVEN valid imported data and existing dashboard data
- WHEN the user chooses replace
- THEN covered keys are replaced using the same localStorage key names
- AND unrelated localStorage keys are preserved

#### Scenario: Merge restore deduplicates compatible records

- GIVEN valid imported data and existing dashboard data
- WHEN the user chooses merge
- THEN notes dedupe by id, else createdAt + title + content
- AND tasks dedupe by date + id, else date + text
- AND focus sessions dedupe by startedAt + plannedDuration + actualDuration + status
