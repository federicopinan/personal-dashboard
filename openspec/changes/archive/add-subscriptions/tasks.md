# Tasks: Add Subscriptions

## 1. Currency cleanup foundation

- [x] 1.1 Add an idempotent localStorage migration helper in `index.html` or `subscriptions.js` for `nw:*`, `subs`, `incoming_orders`, and `wishlist`, rewriting EUR/GBP/CHF user-facing currencies to ARS with `currencyMigratedFrom`.
- [x] 1.2 Update `index.html` `summaryFinance` to default to ARS, remove CHF labeling, and include `incoming_orders` plus `subscriptions:v1` where available.
- [x] 1.3 Restrict `finance.html` selectors `netWorthCurrency`, `subCurrency`, `ordCurrency`, and `wishCurrency` to ARS/USD with ARS defaults.
- [x] 1.4 Replace `finance.html` multi-currency `exchangeRates`/CHF base logic with a small ARS/USD constant and no CHF dependency.
- [x] 1.5 Update `finance.html` `fmtMoney(amount, currency)` to render only ARS/USD and coerce unsupported currencies to ARS.
- [x] 1.6 Run the migration before first render on both `index.html` and `finance.html`.

### Acceptance

- REQ-C1–C8 pass: selectors only show ARS/USD, new forms default ARS, summary renders ARS, CHF is not required, unsupported currencies migrate once without metadata loss.

### Files

- `index.html`
- `finance.html`
- `subscriptions.js` if shared migration helpers are centralized there

## 2. Subscription storage and calculations

- [x] 2.1 Create `subscriptions.js` as an IIFE loaded after `single-thing.js`, with guarded DOM lookups and wrappers for `storeGet`, `storeSet`, and `showToast`.
- [x] 2.2 Implement `listSubscriptions`, `addSubscription`, `updateSubscription`, and `deleteSubscription` using `subscriptions:v1` records with timestamps.
- [x] 2.3 Implement validation for name, positive amount, ARS/USD currency, monthly/yearly cycle, and valid `YYYY-MM-DD` renewal date.
- [x] 2.4 Implement `computeTotals` with separate ARS/USD monthly and annual totals; do not perform FX conversion.
- [x] 2.5 Copy valid legacy `subs` records into `subscriptions:v1` once, preserving source metadata and migration flags.

### Acceptance

- REQ-S1, REQ-S3, REQ-S4, REQ-S5, REQ-S6, and REQ-S7 pass for add/edit/delete, persistence, and separate currency totals.

### Files

- `subscriptions.js`

## 3. Dashboard subscription UI

- [x] 3.1 Add the `index.html` subscriptions section near Finance/Notes with mount points for totals, next renewal, list, empty state, and inline form.
- [x] 3.2 Render saved subscription rows with name, formatted amount, currency, cycle, next renewal, Edit, and Delete actions.
- [x] 3.3 Wire the inline add/edit form with ARS default currency, ARS/USD-only dropdown, monthly/yearly cycle, save/cancel behavior, and toast feedback.
- [x] 3.4 Refresh dashboard rendering after mutations and dispatch `dashboard-data-changed` when subscription data changes.

### Acceptance

- REQ-S1–S8 pass: add, list, edit, delete, reload restore, totals, and empty state work without page reload or console errors.

### Files

- `index.html`
- `subscriptions.js`

## 4. Manual smoke verification

- [x] 4.1 Seed legacy EUR/GBP/CHF data in localStorage, load both pages twice, and verify one-time ARS migration with preserved `currencyMigratedFrom`.
- [x] 4.2 Add monthly ARS, monthly USD, yearly ARS, and yearly USD subscriptions; verify monthly and annual totals stay separated by currency.
- [x] 4.3 Edit and delete one subscription; reload `index.html` and confirm storage, rows, totals, and empty state remain correct.
- [x] 4.4 Inspect finance selectors and generated edit forms to confirm no EUR/GBP/CHF options remain.

### Acceptance

- All 17 scenarios in `openspec/changes/add-subscriptions/specs/subscriptions/spec.md` are manually covered.

### Files

- `index.html`
- `finance.html`
- `subscriptions.js`

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 280–380 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium
