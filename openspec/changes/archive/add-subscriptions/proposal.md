# Proposal: Subscription Tracker

## Why

Most recurring charges disappear into card statements. Add a home dashboard panel that shows fixed monthly burn at a glance: active subscriptions, monthly total in ARS and USD, next renewal, and year-to-date spend. This also cleans the existing finance currency model so the app matches the user’s Argentina context: only ARS and USD.

## What Changes

### A. New subscription tracker feature

- Add a compact subscription section to `index.html`, near Finance/Notes.
- Add `subscriptions.js` to own rendering, form handling, totals, renewals, edit/delete, and localStorage persistence.
- Store subscriptions under `subscriptions:v1` with `{ id, name, amount, currency, cycle, nextRenewal, createdAt, updatedAt }`.
- Support only monthly/yearly cycles; normalize yearly costs into monthly totals and year-to-date spend.
- Dispatch `dashboard-data-changed` and reuse `storeGet`, `storeSet`, and `showToast` patterns.

### B. Currency cleanup

- Restrict all user-facing currency pickers/displays to ARS and USD only; default new subscription currency to ARS.
- Remove EUR/GBP/CHF options from existing finance controls and generated edit forms.
- Migrate existing localStorage records with unsupported `entered_currency` to ARS, preserving value by converting through the current stored/base amount where possible and marking records with `currencyMigratedFrom`.
- Keep migrated records in totals; do not delete or silently exclude user data.

## Capabilities

### New Capabilities
- `subscriptions`: Dashboard recurring-charge tracker with ARS/USD-only entry, renewal dates, monthly totals, year-to-date spend, edit/delete, and localStorage persistence.

### Modified Capabilities
- None currently archived as a main spec. Finance behavior changes should be captured as part of `subscriptions` because no `finance` spec exists yet.

## Impact

| Area | Impact | Description |
|------|--------|-------------|
| `index.html` | Modified | Add section mount point and load `subscriptions.js`; summary may show subscription totals |
| `subscriptions.js` | New | Encapsulate subscription storage, calculations, rendering, migration |
| `finance.html` | Modified | Remove unsupported currency options/defaults and migrate old records |
| localStorage | Modified | New `subscriptions:v1`; existing `subs`, `incoming_orders`, `wishlist`, `nw:*`, `nw_currency` may need currency cleanup |

## Non-Goals

- Push/payment reminders, calendar sync, bank/card import, auto-categorization.
- Shared subscriptions, tax handling, inflation adjustment, historical analytics beyond current year.
- Rebuilding the whole finance page architecture.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Currency migration changes perceived values | Medium | Preserve original currency in `currencyMigratedFrom`; convert once and keep records visible |
| Existing `subs` conflicts with new tracker | Medium | Read/migrate old `subs` into `subscriptions:v1` idempotently |
| ARS/USD conversion rate ambiguity | Medium | Keep entered currency totals separate unless a known conversion rate exists |
| Finance page depends on CHF base math | High | Limit cleanup to user-facing options first; document any internal-base follow-up if needed |
| More home UI clutter | Low | Keep section compact, row-based, and visually aligned with existing cards |

## Rollback Plan

Remove the `index.html` section/script reference and delete `subscriptions.js`. Restore removed finance currency options if needed. Leave `subscriptions:v1` and migration flags in localStorage; they are inert if no code reads them.

## Success Criteria

- [ ] New subscriptions default to ARS and only allow ARS/USD.
- [ ] Dashboard shows list, monthly ARS/USD totals, next renewal, and current-year spend.
- [ ] Edit/delete works without page reload or console errors.
- [ ] Existing unsupported currencies are migrated gracefully, not deleted.
- [ ] No user-facing EUR/GBP/CHF/BRL/MXN currency options remain.

## Open Questions

- None for this slice; default decision is migration to ARS with `currencyMigratedFrom` metadata.
