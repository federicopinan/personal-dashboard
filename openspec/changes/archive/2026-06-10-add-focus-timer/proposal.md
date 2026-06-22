# Proposal: Add Focus Timer

## Intent

Add a zero-friction focus timer to the dashboard PWA — a one-tap start/stop session timer with a sticky banner, day-ring integration, localStorage logging, and browser notifications. Goal: help the user track focused work time without ceremony.

## Scope

### In Scope
- Preset duration buttons: 15, 25, 30, 45, 90 minutes
- One-tap start / one-tap stop (auto-stop at end)
- Sticky banner at top of home page showing active session (remaining time, elapsed, stop)
- Day ring gets a new "focus" color segment (violet/indigo) painted on session end
- Auto-log every session to localStorage: start timestamp, planned duration, actual duration, completion status (completed | stopped-early)
- Browser Notification API alert when session ends
- Permission request handled gracefully (fallback if denied)

### Out of Scope
- Categories (no "frontend/meetings/study")
- Journaling, mood/energy tracking, or any post-session reflection
- Multiple concurrent timers
- Server sync or cross-device persistence
- Pomodoro short/long break cycles (single session only)
- Timer running across page navigations (timer state lives in index.html session)

## Capabilities

### New Capabilities
- `focus-timer`: One-tap timer with preset durations, sticky banner UI, day-ring segment, localStorage session log, and browser notification on completion.

### Modified Capabilities
- None — day ring painting is additive to existing ring rendering; no existing capability behavior changes.

## Approach

- **Storage key**: `focus:sessions` — array of session objects in localStorage, matching the pattern of `goals:<YYYY-MM-DD>` and `po_*` keys already in use.
- **Banner**: Injected near top of `index.html` (below topbar), absolutely positioned, visible only when a session is active. Hidden on stop/complete.
- **Timer logic**: Vanilla JS interval (1s tick), `Date.now()`-based elapsed calc to avoid drift. Stores `{startedAt, plannedDuration}` at start; computes actual on stop.
- **Day ring**: Read existing SVG arc math in `index.html`; add a new `<circle>` or arc segment in violet (`#8b5cf6` or similar) representing focus time. Paint on session end by recalculating the arc proportional to the session's start minute of day.
- **Notification**: `Notification.requestPermission()` on first start. On session end, fire `new Notification(...)` if permission granted; silently skip if denied.
- **Logging**: On stop/complete, push `{startedAt, plannedDuration, actualDuration, status}` to `focus:sessions`. No-op if denied notification.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `index.html` | Modified | Sticky banner HTML, timer UI injection point, day ring SVG focus segment |
| `pwa.js` / `service-worker.js` | No change | Timer is session-scoped; no offline concerns for this phase |
| `manifest.webmanifest` | No change | No new PWA features required |
| localStorage | New | `focus:sessions` key — array of session records |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Notification permission denied | Medium | Banner and localStorage still work; notification silently skipped |
| Timer state lost on page reload | Low | Acceptable per scope — session is tied to page load |
| Day ring arc math is complex/touchy | Medium | Write unit-style manual verification: confirm arc renders at correct angle for any minute-of-day value |
| User opens another page (gym.html etc.) during session | Low | Timer banner lives only in index.html; user accepts this tradeoff |

## Rollback Plan

1. Remove the sticky banner HTML block from `index.html`.
2. Remove the focus arc segment from the day ring SVG.
3. Delete `focus:sessions` from localStorage (or leave it — it's append-only, harmless).
4. No schema migration needed; no other pages touched.

## Dependencies

- Browser Notification API (available in all target browsers; no polyfill needed)
- No external libraries or CDN resources

## Success Criteria

- [ ] User can start a timer with one tap and stop with one tap
- [ ] Sticky banner shows remaining/elapsed time during active session
- [ ] Session is logged to `focus:sessions` on both completion and early stop
- [ ] Day ring displays a violet focus segment after a session ends
- [ ] Browser notification fires when session completes (if permission granted)
- [ ] No console errors on page load with or without active session
