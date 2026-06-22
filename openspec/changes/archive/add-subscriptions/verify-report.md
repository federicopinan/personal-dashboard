# Verification Report: add-subscriptions

## Verification Summary

- **Change**: `add-subscriptions`
- **Mode**: Standard SDD verification, Strict TDD inactive, no project test runner detected.
- **Artifacts reviewed**:
  - `openspec/changes/add-subscriptions/specs/subscriptions/spec.md`
  - `openspec/changes/add-subscriptions/design.md`
  - `openspec/changes/add-subscriptions/tasks.md`
  - Engram `sdd/add-subscriptions/apply-progress` after re-apply fix
- **Implementation files reviewed**:
  - `currency-migration.js` — 116 lines
  - `subscriptions.js` — 398 lines
  - `index.html`
  - `finance.html`
- **Verdict**: **PASS**

The re-apply fixed both previously-blocking criticals. Subscription cycle values are now strictly validated before persistence in `addSubscription()` and `updateSubscription()`, and persisted `subscriptions:v1` records now use the canonical storage fields `cycle`, `nextRenewal`, and `createdAt`. All 16 requirements and all 17 scenarios pass with runtime smoke evidence plus source inspection.

## Runtime / Build Evidence

| Command | Result | Evidence |
|---|---:|---|
| `node --check "currency-migration.js" && node --check "subscriptions.js"` | PASS | Both modules parse successfully. |
| Mocked localStorage/DOM Node smoke for `currency-migration.js` + `subscriptions.js` | PASS | Valid add, invalid cycle rejection, invalid update rejection, canonical persistence, edit identity preservation, delete, totals, legacy migration, and idempotent migration passed. |
| `grep` / source inspection for `billingCycle\|firstRenewalDate\|addedAt` in `*.js` and `*.html` | PASS | No app-source references remain. |
| `grep` / source inspection for unsupported static currency options | PASS | EUR/GBP/CHF only remain in `currency-migration.js` legacy currency constants, not user-facing selectors. |

Runtime smoke confirmed:

- `DashboardSubscriptions.addSubscription()` accepts valid `{ name, amount, currency, cycle, nextRenewal }` input and persists canonical `{ id, name, amount, currency, cycle, nextRenewal, createdAt, updatedAt }` records.
- `DashboardSubscriptions.addSubscription({ cycle: "weekly" })` returns `{ ok: false }` and leaves storage unchanged.
- `DashboardSubscriptions.updateSubscription(id, { cycle: "quarterly" })` returns `{ ok: false }` and leaves storage unchanged.
- Valid update preserves `id` and updates the existing record rather than duplicating it.
- `computeTotals()` keeps ARS and USD separate, counts yearly records as amount / 12 monthly and amount once annually, and performs no FX conversion.
- Legacy `subs` migration writes canonical `cycle`, `nextRenewal`, and `createdAt` fields and preserves `currencyMigratedFrom`.
- Re-running migration leaves previously migrated records unchanged.

## Completeness Table

| Area | Status | Notes |
|---|---:|---|
| Tasks | PASS | All tasks in `tasks.md` are checked complete; Engram apply progress records the post-fix strict-cycle and canonical-schema changes. |
| Design coherence | PASS | `subscriptions.js` follows the IIFE module style, storage key, canonical data model, inline UI, separate totals, and migration strategy from `design.md`. Shared `currency-migration.js` is consistent with the approved refactor. |
| Runtime evidence | PASS | Syntax checks and targeted mocked runtime smoke were executed. No browser/e2e runner exists in the project. |
| 400-line budget | PASS | `currency-migration.js` is 116 lines; `subscriptions.js` is 398 lines. |

## Requirement Compliance Matrix

### Capability: subscriptions

| Requirement | Status | Evidence |
|---|---:|---|
| REQ-S1 Add a subscription | PASS | Valid add passed in runtime smoke. Currency defaults to ARS in markup and `resetForm()`. `validateInput()` rejects blank name, non-positive amount, unsupported currency, unsupported cycle, and invalid date before persistence. |
| REQ-S2 List subscriptions | PASS | `render()` lists normalized records with escaped name, formatted ARS/USD amount, cycle, and next renewal date. |
| REQ-S3 Edit a subscription | PASS | Runtime smoke confirmed valid update preserves `id` and count; source inspection confirms row Edit fills all fields. Invalid update cycle is rejected before persistence. |
| REQ-S4 Delete a subscription | PASS | Runtime smoke confirmed `deleteSubscription(id)` removes the record; row Delete calls it and re-renders. |
| REQ-S5 Monthly total | PASS | Runtime smoke confirmed monthly items count once and yearly items count as amount / 12 in their own currency. |
| REQ-S6 Annual total | PASS | Runtime smoke confirmed monthly items count as amount * 12 and yearly items count once in their own currency. |
| REQ-S7 Persistence | PASS | Storage key is `subscriptions:v1`; runtime smoke confirmed records contain canonical `id`, `name`, `amount`, `currency`, `cycle`, `nextRenewal`, `createdAt`, and `updatedAt`. App-source grep found no stale `billingCycle`, `firstRenewalDate`, or `addedAt` references. |
| REQ-S8 Empty state | PASS | `subscriptionsEmpty` says “Add fixed recurring charges.” and `render()` displays it when no records exist. |

**Subscriptions requirements passed**: 8 / 8

### Capability: currency-restriction

| Requirement | Status | Evidence |
|---|---:|---|
| REQ-C1 Allowed currencies | PASS | `index.html` subscription selector and `finance.html` `netWorthCurrency`, `subCurrency`, `ordCurrency`, `wishCurrency` expose only ARS/USD. Generated finance edit selector builds from `['ARS', 'USD']`. |
| REQ-C2 Default currency | PASS | Subscription form defaults to ARS in markup and `resetForm()`. Finance selectors list ARS first and saved invalid `nw_currency` values migrate to ARS. |
| REQ-C3 Unsupported currency migration | PASS | `currency-migration.js` normalizes `nw:*`, `subs`, `incoming_orders`, `wishlist`, and `subscriptions:v1`, rewriting EUR/GBP/CHF to ARS and preserving `currencyMigratedFrom`. Runtime smoke verified legacy `subs` migration through `subscriptions:v1`. |
| REQ-C4 Dashboard finance summary currency | PASS | `summaryFinance` renders ARS-style `$ ...` using `toLocaleString('es-AR')`; no CHF label remains. |
| REQ-C5 Exchange base cleanup | PASS | `finance.html` uses `exchangeRates = { ARS: 1, USD: 1 / 890 }`; CHF is not required for user-facing totals or migration. |
| REQ-C6 Money formatting | PASS | `finance.html` `fmtMoney()` and `subscriptions.js` `formatMoney()` coerce unsupported currency values to ARS and render only ARS/USD. |
| REQ-C7 Existing selector cleanup | PASS | Static selectors and generated edit selector exclude EUR, GBP, and CHF. Grep found EUR/GBP/CHF only in migration legacy constants. |
| REQ-C8 Idempotent migration | PASS | Runtime smoke verified repeated `runMigration()` and legacy-copy calls preserve amount and `currencyMigratedFrom` metadata. |

**Currency-restriction requirements passed**: 8 / 8

## Scenario Compliance Matrix

| Scenario | Status | Evidence |
|---|---:|---|
| Add valid subscription | PASS | Runtime smoke added a valid ARS monthly record; UI resets currency to ARS via `resetForm()`. |
| Reject invalid subscription | PASS | Runtime smoke proved invalid `weekly` add is rejected and storage remains unchanged. Source inspection confirms invalid currency, non-positive amount, blank name, and invalid date also reject. |
| Render saved subscriptions | PASS | Source inspection of `render()` row markup shows name, formatted amount, cycle, and renewal date. |
| Save edited subscription | PASS | Runtime smoke confirmed update preserves identity and rejects invalid cycle. |
| Delete existing subscription | PASS | Runtime smoke confirmed delete removes the record from storage. |
| Sum monthly equivalents by currency | PASS | Runtime smoke verified monthly/yearly monthly-equivalent totals remain separated by ARS/USD. |
| Sum annual equivalents by currency | PASS | Runtime smoke verified annual-equivalent totals remain separated by ARS/USD. |
| Reload restores subscriptions | PASS | `listSubscriptions()` reads `subscriptions:v1`, normalizes records, and `render()`/`computeTotals()` derive rows and totals from restored records. |
| No subscriptions prompt | PASS | Source inspection of empty state markup and display logic. |
| Selectors exclude unsupported currencies | PASS | Source inspection and grep confirm user-facing selectors expose only ARS/USD. |
| New entry default | PASS | Source inspection of ARS defaults in subscription markup, `resetForm()`, and finance selectors. |
| Migrate unsupported record | PASS | Runtime smoke verified EUR legacy subscription migrates to ARS with `currencyMigratedFrom`. Source inspection covers CHF/GBP paths through the same constants. |
| Summary renders ARS | PASS | Source inspection of `summaryFinance` ARS formatting. |
| Finance calculations avoid CHF dependency | PASS | Source inspection of ARS/USD exchange table and no CHF dependency outside legacy migration constants. |
| Format unsupported currency | PASS | Source inspection of `fmtMoney()` and `formatMoney()` coercion. |
| Legacy controls are restricted | PASS | Source inspection and grep confirmed static and generated controls exclude legacy currencies. |
| Re-run migration | PASS | Runtime smoke verified repeat migration preserves amount and metadata. |

**Scenarios passed**: 17 / 17

## Re-Verification of Previous Criticals

| Previous Critical | Status | Evidence |
|---|---:|---|
| Invalid billing cycles accepted | FIXED | `validateInput()` now checks `['monthly', 'yearly'].indexOf(cycle) < 0` before returning a valid value. Runtime smoke proved invalid add/update cycles reject and do not persist. |
| Storage schema field names diverged | FIXED | Runtime smoke persisted canonical `cycle`, `nextRenewal`, and `createdAt`; source grep found zero `billingCycle`, `firstRenewalDate`, or `addedAt` references in app source. |

## Refactor-Specific Verification

| Check | Status | Evidence |
|---|---:|---|
| `currency-migration.js` exports right API | PASS | Exports `runMigration`, `normalizeCurrencyFields`, `migrateArrayKey`, `migrateNetWorthKeys`, `coerceCurrency`, `isLegacyCurrency`, and `isAllowedCurrency` on `window.currencyMigration`. |
| Shared migration is idempotent | PASS | Uses `currencyMigratedFrom` guard and runtime smoke confirmed no double conversion on repeated run. |
| `subscriptions.js` consumes shared migration | PASS | Calls `window.currencyMigration.runMigration()` in `init()` and exposes `DashboardSubscriptions.migrateLegacyCurrencies()` as a compatibility wrapper. |
| No duplicated app-source schema aliases | PASS | No `billingCycle`, `firstRenewalDate`, or `addedAt` references remain in app `*.js`/`*.html`. |
| `index.html` load order | PASS | Loads `currency-migration.js` before the inline dashboard script; `renderSnapshot()` runs migration before summary render. `subscriptions.js` loads after the inline dashboard script and exports `DashboardSubscriptions`. |
| `finance.html` load order | PASS | Loads `currency-migration.js` before `subscriptions.js` and before finance inline script; inline startup calls shared migration and legacy subscription copy. |

## Issues by Severity

### CRITICAL

- None.

### WARNING

- None.

### SUGGESTION

- None.

## Recommended Fixes

None. The change is ready for SDD archive.

## Final Verdict

**PASS** — all subscription and currency-restriction requirements pass, all 17 scenarios are covered by runtime smoke and/or source inspection, and both previously-failing criticals are fixed.
