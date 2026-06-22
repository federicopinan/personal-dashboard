# Design: Add Subscriptions

## Architecture

Add `subscriptions.js` as a dashboard module loaded after `single-thing.js`. It follows the existing IIFE style: `'use strict'`, module constants/state, guarded DOM lookups, helper wrappers around `window.storeGet`, `window.storeSet`, and `window.showToast`, then `init()`.

The subscriptions widget belongs on `index.html`, not `finance.html`: the proposal’s job is “monthly burn at a glance,” and the dashboard is the always-visible surface. `finance.html` remains the deeper money-management page and is only touched for ARS/USD cleanup and migration.

`subscriptions.js` should also expose a small `window.DashboardSubscriptions` API for shared migration/format helpers. Load it on `finance.html` before the finance inline script if reuse is practical; otherwise duplicate only the small migration constants to avoid a larger refactor.

## Data Model

Storage key: `subscriptions:v1`.

```js
{
  id: string,
  name: string,
  amount: number,
  currency: 'ARS' | 'USD',
  cycle: 'monthly' | 'yearly',
  nextRenewal: 'YYYY-MM-DD',
  createdAt: number,
  updatedAt: number,
  currencyMigratedFrom?: 'EUR' | 'GBP' | 'CHF'
}
```

Retention is passive: records stay in localStorage until the user deletes them. Invalid rows are skipped at render time, not deleted. Legacy `subs` can be copied into `subscriptions:v1` once, preserving source data.

## UI Layout

Insert a compact `.section` near the Finance summary / Notes area, preferably before `Notes` so recurring burn is visible without opening finance. Use existing `.gm-card`, `.gm-input-wrap`, `.goal-input`, and `.goal-add-btn` styling with targeted subscription classes.

Render: header with monthly totals by currency, projected annual totals by currency, next renewal, then a row list. Empty state explains “Add fixed recurring charges.” Add/edit uses an inline form, not a modal: lower friction, matches existing quick-add patterns, and avoids introducing modal state. Row actions: Edit and Delete buttons. Validation rejects blank name, non-positive amount, unsupported currency, unsupported cycle, and invalid date.

No FX conversion for MVP: ARS totals and USD totals are displayed separately. Yearly items count as `amount / 12` for monthly total and `amount` for annual total; monthly items count as `amount` monthly and `amount * 12` annual.

## Currency Cleanup Plan

| File | Change |
|---|---|
| `index.html` | Change `summaryFinance` from `CHF ...` to ARS formatting. Read migrated `nw:*` ARS amounts; note should count `incoming_orders` plus `subscriptions:v1` instead of legacy `subs` where available. Load `subscriptions.js`. |
| `finance.html` | Remove EUR/GBP/CHF from `netWorthCurrency`, `subCurrency`, `ordCurrency`, `wishCurrency`, and generated edit selectors. Default selectors to ARS. |
| `finance.html` | Replace remote `exchangeRates` fetch with a small ARS/USD constant, e.g. `USD_TO_ARS = 890`, used only where finance still needs ARS↔USD display/input conversion. No CHF base. |
| `finance.html` | Update `fmtMoney(amount, currency)` to coerce unsupported currency to ARS. ARS renders as `$ 1.234,56`; USD renders as `USD 1,234.56`. |
| `finance.html` | Rename CHF-oriented locals/comments during touched edits (`amountCHF`, `nwGrandCHF`) to ARS/base-neutral names where practical. |

## Migration Strategy

Run migration on page load before first render in both `index.html` and `finance.html`.

1. Normalize `nw_currency`: if not `ARS` or `USD`, set to `ARS`.
2. For `nw:*`, `subs`, `incoming_orders`, and `wishlist`, inspect currency fields (`currency`, `entered_currency`, `ccy`) plus legacy CHF-base fields.
3. If currency is EUR/GBP/CHF and `currencyMigratedFrom` is absent, set `currencyMigratedFrom` to the original value and rewrite the user-facing currency field to `ARS`.
4. Preserve numeric value when no reliable entered amount exists. If `entered_amount` exists, use it as the ARS amount after migration; this avoids deleting data or making a guessed live FX conversion.
5. Copy valid legacy `subs` into `subscriptions:v1` only when the target id/source marker is not already present.
6. Idempotency: never touch records that already have `currencyMigratedFrom`; never overwrite the original metadata; never reconvert amount on re-run.

## File Changes

| File | Action | Lines approx |
|---|---:|---:|
| `index.html` | Modify | +70–110 |
| `finance.html` | Modify | +90–140 / -40–70 |
| `subscriptions.js` | Create | +160–210 |

Estimated net change: ~280–380 lines, within the 400-line review budget if kept tight.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Data loss during migration | Never delete legacy keys; copy/normalize only; tag migrated rows. |
| FX conversion errors | Do not convert subscription totals; for legacy migration, preserve entered numeric value when possible. |
| Migration double-runs | `currencyMigratedFrom` is the idempotency guard. |
| Finance regression from CHF removal | Keep the cleanup surgical: ARS canonical values, USD display constant, render existing sections after migration. |
| Dashboard clutter | Compact card, inline form collapsed/row-based, totals first. |

## Open Questions

None.
