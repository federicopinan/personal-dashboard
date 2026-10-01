# Local-First Dashboard Features

## Objective
Bring the relevant, locally compatible features found in RowanThistlebrooke's public repositories and Wise Twinz material into this dashboard, while keeping all product data in browser `localStorage` and preserving existing user data.

## Problem and Why
The dashboard already supports local tiles, goals, notes, and daily tasks, but lacks several useful continuity, history, portability, and aggregation behaviors described by the related public projects. The source projects also contain cloud services, APIs, accounts, and wearable integrations that do not fit the user's local-only requirement. Implement compatible behavior here rather than copying incompatible infrastructure.

## Scope and Constraints
- Persist product data in browser `localStorage` only; no Supabase, accounts, cloud sync, backend, hosted jobs, OAuth, MCP, wearable connections, or new third-party APIs.
- Preserve the existing optional Finnhub quote behavior unchanged; it is existing remote behavior, not a new persistence path.
- Exclude photo/binary blobs because `localStorage` is unsuitable for them.
- Evolve existing stores incrementally; retain opaque per-tile keys, existing user data, and unrelated dashboard behavior.
- Validate imported and tile-reported data. Failed writes must be visible and must not replace last-known-good values.
- Generated artifacts excluded from authored-line forecasts. Forecast: approximately 850–1,450 authored changed lines across all tasks; advisory only, with no cosmetic line reduction.
- Delivery preference: `single-pr` from the session preflight. No PR or remote operation is authorized by this document.
- User selected pnpm instead of npm for dependency setup and build verification. The existing `package-lock.json` must be imported to pnpm format before a reproducible pnpm install; do not silently discard existing lock history.

## TDD and Verification
- TDD: **off**, explicitly selected by the user.
- Source: explicit user instruction in this session.
- Test runner: none configured; do not add a framework solely to satisfy TDD.
- Required functional check: `pnpm build` after importing the npm lockfile to pnpm format and installing dependencies.
- `pnpm lint` is not an applicable check until an ESLint configuration exists; it opens an interactive setup wizard.
- Runtime check: manually exercise each changed dashboard flow in the local app when available; record unavailable runtime checks honestly.

## Authorized Scope and Route
Implementation route: **delegated direct**, using one bounded writer for each task. Evidence: each task requires coordinated changes across multiple non-trivial UI, storage, tile, or bridge files; reading that prepares those writes belongs with the writer. No SDD artifacts or phases authorize implementation under this route.

## Acceptance Criteria
- New and existing records remain local to the browser and survive reloads.
- Existing tile, task, note, profile, preference, and goal data remain readable and are never silently erased or overwritten.
- Date grouping has explicit, predictable user-facing semantics rather than silent UTC/DST shifts.
- Import/restore and tile reports are validated; storage/quota failures are visible and non-destructive.
- Goal summaries are deterministic and show contributing, missing, or stale inputs without inventing scores.
- No Supabase, account, sync, new API, wearable/OAuth, hosted automation, or photo-blob behavior is added.
- Each task is closed only after its behavior and checks are observed, its result is recorded below, and a Conventional Commit is created on this feature branch.

## Tasks

### LF-1 — Daily task continuity and local notes/check-ins
- [ ] Add local-date-aware task continuity, completion history, and explicit carry-forward/recurrence behavior without silently moving or deleting existing entries.
- [ ] Add dated local note/check-in history with browse, edit, and search behavior while preserving existing notes.
- [ ] Verify reload persistence, legacy data preservation, date boundaries, and visible storage failure behavior.
- Route: delegated direct. Trigger: changes span dashboard UI and persisted state; writer owns preparation and implementation.
- Checks: `pnpm build`; manual browser/runtime exercise of tasks, notes/check-ins, date boundary, and reload.
- Status/evidence/commit: **implemented; partial functional verification; publish deferred by user**. `exec "$SHELL" -lic` confirmed WSL zsh exposes Node v24.21.0 and pnpm v12.8.1. Linux pnpm install with `--frozen-lockfile --ignore-scripts --registry=https://registry.npmjs.org` completed. Parent spot-check `pnpm build` passed: Next.js 14.2.35 compiled, type/lint checks passed, and 10 static pages generated. `pnpm dev --hostname 0.0.0.0` starts at `http://localhost:3000`; `curl -I http://127.0.0.1:3000` returned HTTP 200; the dev server was stopped after verification and port 3000 is free. An independent read-only verifier confirmed the scoped fixes in `Dashboard.tsx` structurally. Per the user's direction, interactive persistence/date-boundary checks are deferred until the feature is visible on Netlify; they were not run and are not claimed as passed. Commits: `6bfc8b1` (`feat(tasks): add local-date history and notes editing`), `10a6b0c` and `db7c35b` (tracker evidence), `d7e0461` (`chore(openspec): declare engram store and drop stale change stubs`). All now live on `master`; the temporary feature branch was deleted after a fast-forward. Remote `origin` has only `refs/heads/master` (no `main`); `netlify.toml` declares build/publish but no production branch. No remote push has been performed.

### LF-2 — Local event/metric history and portability
- [ ] Add validated dated manual metric/event records with unit and provenance metadata and useful history/trends where supported by existing UI.
- [ ] Add user-initiated local export/backup and previewed, validated import/restore with additive/non-destructive semantics.
- [ ] Preserve existing namespaced tile and unnamespaced application keys; do not introduce a wholesale data migration.
- Route: delegated direct. Trigger: storage, import/export, validation, and UI span multiple non-trivial files.
- Checks: `pnpm build`; manually test valid/invalid import, export/restore, reload, and quota/write failure paths when runtime permits.
- Status/evidence/commit: pending.

### LF-3 — Manual wellness, fitness, and finance tracking
- [ ] Fill evidenced local-only gaps with manual records for water, supplements, training, body measurements, and finance notes/holdings as appropriate to existing tiles.
- [ ] Avoid duplicating existing Fuel, Train, Vitals, Finance, Tasks, or Notes behaviors; preserve the current optional Finnhub route unchanged.
- [ ] Keep records in existing tile/localStorage boundaries and provide clear units and dated history.
- Route: delegated direct. Trigger: touches multiple tile HTML files and their persistence/host behavior.
- Checks: `pnpm build`; manually exercise create/edit/history/reload for each changed tile.
- Status/evidence/commit: pending.

### LF-4 — Transparent deterministic goal aggregation
- [ ] Connect validated tile reports to the equation/goal UI using deterministic rules and current goal weights.
- [ ] Show contributing inputs and missing/stale/unavailable data; never fabricate a score from absent or malformed reports.
- [ ] Preserve existing weights, tile ordering, and user data; keep iframe boundaries intact.
- Route: delegated direct. Trigger: crosses report validation, tile host bridge, dashboard aggregation, and UI.
- Checks: `pnpm build`; manually exercise valid, missing, stale, and malformed report scenarios.
- Status/evidence/commit: pending.

## Progress
- Branch: `master` (single-branch layout at the user's request; the temporary `feat/local-first-dashboard` branch was fast-forwarded into `master` and deleted).
- Completed: read-only public-source exploration/proposal and LF-1 code pass; verification remains partial.
- LF-1 implementation is present in `app/app/Dashboard.tsx`; all LF-1 checkboxes remain open pending functional verification.
- Current next step: user-owned `git push origin master` when ready, then hands-on browser verification of persistence, date boundaries, and storage failures. LF-2 through LF-4 remain pending and unimplemented.
