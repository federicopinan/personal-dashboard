# Subscriptions Specification

## Purpose

The Subscriptions capability SHALL track recurring charges on the dashboard and SHALL enforce the app-wide Argentina currency rule: only ARS and USD are user-facing currencies, with ARS as the default for new records.

## Requirements

### Capability: subscriptions

### Requirement: REQ-S1 Add a subscription

The system MUST let the user add a subscription with name, amount, currency, billing cycle, and first renewal date. Currency MUST be ARS or USD and default to ARS; cycle MUST be monthly or yearly.

#### Scenario: Add valid subscription

- GIVEN the subscription form is empty
- WHEN the user saves `Netflix`, amount `10000`, currency `ARS`, cycle `monthly`, and a valid renewal date
- THEN the subscription is added with those values
- AND the form defaults currency to ARS for the next entry

#### Scenario: Reject invalid subscription

- GIVEN name, positive amount, allowed currency, cycle, or renewal date is missing or invalid
- WHEN the user saves
- THEN no subscription is persisted

### Requirement: REQ-S2 List subscriptions

The system MUST list saved subscriptions with name, formatted amount, currency, cycle, and next renewal date.

#### Scenario: Render saved subscriptions

- GIVEN subscriptions exist in storage
- WHEN the dashboard renders
- THEN each row shows name, amount with ARS or USD, cycle, and next renewal date

### Requirement: REQ-S3 Edit a subscription

The system MUST let the user edit all subscription fields while preserving the subscription identity.

#### Scenario: Save edited subscription

- GIVEN a subscription exists
- WHEN the user changes its amount, cycle, currency, or renewal date and saves
- THEN the existing record is updated rather than duplicated

### Requirement: REQ-S4 Delete a subscription

The system MUST let the user delete a subscription.

#### Scenario: Delete existing subscription

- GIVEN a subscription exists
- WHEN the user deletes it
- THEN it is removed from the list and storage

### Requirement: REQ-S5 Monthly total

The system MUST show monthly totals separately for ARS and USD. It MUST NOT perform FX conversion for MVP.

#### Scenario: Sum monthly equivalents by currency

- GIVEN monthly and yearly subscriptions exist in ARS and USD
- WHEN totals render
- THEN monthly items count once per month and yearly items count as amount / 12 in their own currency

### Requirement: REQ-S6 Annual total

The system MUST show projected annual spend separately for ARS and USD.

#### Scenario: Sum annual equivalents by currency

- GIVEN monthly and yearly subscriptions exist in ARS and USD
- WHEN annual totals render
- THEN monthly items count as amount * 12 and yearly items count once in their own currency

### Requirement: REQ-S7 Persistence

The system MUST persist subscriptions in localStorage key `subscriptions:v1` as records containing id, name, amount, currency, cycle, nextRenewal, createdAt, and updatedAt.

#### Scenario: Reload restores subscriptions

- GIVEN valid subscriptions are stored under `subscriptions:v1`
- WHEN the dashboard reloads
- THEN the same subscriptions and totals are restored

### Requirement: REQ-S8 Empty state

The system MUST show a helpful empty state when no subscriptions exist.

#### Scenario: No subscriptions prompt

- GIVEN `subscriptions:v1` is empty or missing
- WHEN the dashboard renders
- THEN a prompt explains that recurring charges can be added

### Capability: currency-restriction

### Requirement: REQ-C1 Allowed currencies

The system MUST only allow ARS and USD in every user-facing currency selector across the app.

#### Scenario: Selectors exclude unsupported currencies

- GIVEN any currency selector is rendered
- WHEN the user opens it
- THEN only ARS and USD are offered

### Requirement: REQ-C2 Default currency

The system MUST default new entries to ARS.

#### Scenario: New entry default

- GIVEN a new finance or subscription entry form is rendered
- WHEN no prior explicit selection applies
- THEN ARS is selected

### Requirement: REQ-C3 Unsupported currency migration

The system MUST migrate existing EUR, GBP, or CHF records to ARS on load and MUST preserve the original currency in `currencyMigratedFrom`.

#### Scenario: Migrate unsupported record

- GIVEN a stored record has currency EUR, GBP, or CHF
- WHEN the feature loads
- THEN its currency becomes ARS
- AND `currencyMigratedFrom` stores the original currency

### Requirement: REQ-C4 Dashboard finance summary currency

The system MUST show the `index.html` finance summary in ARS by default, not CHF.

#### Scenario: Summary renders ARS

- GIVEN net worth is available
- WHEN `summaryFinance` renders
- THEN the value is labeled ARS

### Requirement: REQ-C5 Exchange base cleanup

The system MUST NOT require CHF as the finance base currency; any retained base MUST be ARS or removed.

#### Scenario: Finance calculations avoid CHF dependency

- GIVEN finance totals are calculated
- WHEN exchange-rate logic runs
- THEN CHF is not required for user-facing totals or storage migration

### Requirement: REQ-C6 Money formatting

The system MUST format only ARS and USD and MUST coerce non-conforming currency values gracefully to ARS.

#### Scenario: Format unsupported currency

- GIVEN a record has an unsupported currency value
- WHEN money is formatted
- THEN the displayed currency is ARS and rendering does not fail

### Requirement: REQ-C7 Existing selector cleanup

The system MUST remove EUR, GBP, and CHF from `netWorthCurrency`, `subCurrency`, `ordCurrency`, and `wishCurrency`, including generated edit forms.

#### Scenario: Legacy controls are restricted

- GIVEN finance controls or edit forms render
- WHEN their currency options are inspected
- THEN EUR, GBP, and CHF are absent

### Requirement: REQ-C8 Idempotent migration

Currency migration MUST be idempotent and MUST NOT double-convert or overwrite the original migration metadata on repeated loads.

#### Scenario: Re-run migration

- GIVEN a record was already migrated with `currencyMigratedFrom`
- WHEN migration runs again
- THEN amount and metadata remain unchanged
