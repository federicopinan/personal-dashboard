# Design: Add Focus Timer

## Technical Approach

A session-scoped vanilla JS timer — no framework, no build step. State lives only in memory; page reload discards it (accepted per spec). All UI lives in `index.html` (sticky banner, preset buttons container, focus arc circle) and `focus-timer.js` (IIFE module pattern). Session log persists to `focus:sessions` in localStorage; day ring focus arc rendered from that log on load.

## Architecture Decisions

### Decision: State lives only in memory, not localStorage

**Choice**: Timer state (running/stopped, elapsed, plannedDuration) is kept in JS variables. localStorage only receives completed/stopped-early session records.
**Alternatives considered**: Persist timer tick to localStorage every second — adds complexity and potential race conditions for no practical benefit.
**Rationale**: Scope explicitly disclaims cross-page navigation recovery. Simpler to implement and test.

### Decision: Focus arc as separate SVG circle, not modifying the existing day ring

**Choice**: Add a second `<circle>` element inside `#dayRingSvg` for the focus arc (violet `#8b5cf6`), distinct from the existing `#dayRingFill`.
**Alternatives considered**: Modify `#dayRingFill` to render multi-segment arcs — requires rewriting the existing ring's fill logic.
**Rationale**: Existing day ring logic uses a single continuous arc with transition; focus arcs are discontinuous and per-session. Separate circle avoids touching working code.

### Decision: Notification permission requested on first start only

**Choice**: `Notification.requestPermission()` called when user first taps Start. Result (`granted`/`denied`/`default`) stored in a module variable; subsequent starts skip the request.
**Alternatives considered**: Request on page load — premature and annoying. Request on first preset tap — confusing since preset doesn't start the session.
**Rationale**: Follows spec's "on first start" language. Graceful degradation if denied (silent skip, normal logging continues).

## Data Flow

```
User taps preset → state.selectedDuration = seconds
User taps Start
  → requestNotificationPermission() if first time
  → state = { startedAt, plannedDuration, phase: 'running' }
  → renderStickyBanner()
  → start setInterval(1s) → tick() updates remaining/elapsed

tick()
  → if Date.now() - startedAt >= plannedDuration → autoStop()
  → else update banner display

autoStop() / user taps Stop
  → compute actualDuration
  → appendSession({ startedAt, plannedDuration, actualDuration, status })
  → state = IDLE
  → hideStickyBanner()
  → paintFocusArc()  // compute arc from session log

appendSession()
  → storeGet('focus:sessions') ?? []
  → push new record
  → storeSet('focus:sessions', updatedArray)

paintFocusArc()
  → storeGet('focus:sessions') for today
  → for each session: compute startAngle = (startMinuteOfDay / 1440) * 360°
                       sweepAngle = (actualDuration / 86400) * 360°  (actualDuration in seconds / 86400)
  → set stroke-dasharray and stroke-dashoffset on focus circle
  → fire 'dashboard-data-changed' custom event
```

**Day ring arc math (pseudocode):**
```
For a session with startedAt timestamp T and actualDuration D seconds:
  startMinuteOfDay = (hour(T) * 60 + minute(T))   // 0–1439
  startAngle = (startMinuteOfDay / 1440) * 360 - 90   // rotate so 0° is top, -90° offset
  sweepAngle = (D / 86400) * 360                     // fraction of full day

  circumference = 2 * π * 52
  strokeDasharray = circumference
  strokeDashoffset = circumference * (1 - sweepAngle/360)   // offset from start
  transform = rotate(startAngle 60 60)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `focus-timer.js` | Create | IIFE module: state machine, banner DOM, timer interval, session logging, arc rendering, notification handling |
| `index.html` | Modify | Add preset buttons container `<div id="focusPresets">` inside `.container` before the day ring section; add focus arc `<circle id="focusArc">` inside `#dayRingSvg`; add sticky banner HTML block; inject `<script src="focus-timer.js">`; add CSS classes for focus UI |
| (no other files) | — | No changes to service worker, manifest, or other pages |

## Interfaces / Contracts

**localStorage key**: `focus:sessions`
```js
// Array of session records, oldest first, append-only
[
  {
    id: string,           // `${Date.now()}-${Math.random().toString(36).slice(2)}`
    startedAt: number,    // Date.now() at session start (ms)
    plannedDuration: number, // seconds (from preset: 900, 1500, 1800, 2700, 5400)
    actualDuration: number,  // seconds, rounded to nearest second
    status: 'completed' | 'stopped-early',
    completedAt: number   // Date.now() at session end (ms)
  }
]
```

**State machine** (in-memory only):
```
IDLE ──[tap Start with selectedDuration]──→ RUNNING
RUNNING ──[tick: elapsed >= plannedDuration]──→ (autoStop) → IDLE
RUNNING ──[tap Stop]──→ (manualStop) → IDLE
```

**New DOM IDs** (added to index.html):
- `focusPresets` — container for preset duration buttons
- `focusStartBtn` — start control (enabled only when a preset is selected and state is IDLE)
- `focusStopBtn` — stop control (visible only when state is RUNNING)
- `focusBanner` — sticky banner div (hidden when IDLE)
- `focusRemaining` — remaining time display (MM:SS)
- `focusElapsed` — elapsed time display (MM:SS)
- `focusArc` — violet arc `<circle>` inside `#dayRingSvg`

## CSS Classes Added

| Class | Purpose |
|-------|---------|
| `focus-presets` | Container grid for preset buttons |
| `focus-preset-btn` | Individual preset button (15/25/30/45/90 min) |
| `focus-preset-btn.selected` | Active preset selection |
| `focus-banner` | Sticky banner: `position: fixed`, `top: max(52px, env(safe-area-inset-top))`, `z-index: 40`, violet left border accent |
| `focus-banner-inner` | Flex row: remaining + elapsed + stop button |
| `focus-time-display` | Monospace MM:SS display |
| `focus-stop-btn` | Stop button with danger styling |
| `focus-arc-glow` | SVG filter or box-shadow for the violet arc glow |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Manual | Timer starts/stops correctly with each preset | Tap through all 5 presets, start, wait 5s, stop |
| Manual | Banner shows correct remaining/elapsed | Start 15min, verify banner appears with correct initial values |
| Manual | Auto-stop fires notification | Start 1min preset, wait 65s, verify notification + log |
| Manual | Day ring focus arc appears after session | Complete a session, reload page, verify violet arc on ring |
| Manual | localStorage log is correct | Open DevTools, check `focus:sessions` array after session |
| Manual | Page reload loses active timer (expected) | Start session, reload, verify banner gone and no log entry |

## Migration / Rollout

No migration required. New feature is purely additive. Focus arc rendering reads existing `focus:sessions` log on page load — no retroactive painting of historical days unless user opens a past date (out of scope).

## Open Questions

- [ ] **Arc overlap**: If multiple sessions overlap on the ring, should they stack or show the most recent? (Assumption: stack by painting all sessions' arcs in order; later sessions may overlap earlier ones — acceptable for MVP.)
- [ ] **Focus arc glow**: Use SVG `<filter>` with `feGaussianBlur` (matching existing `#ringGlow` pattern) or CSS `filter: drop-shadow`? (Assumption: SVG filter, matching existing pattern.)