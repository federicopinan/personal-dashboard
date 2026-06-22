# Tasks: Add Focus Timer

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~280–340 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Foundation — focus-timer.js skeleton

- [x] 1.1 Create `focus-timer.js` as an IIFE module exporting nothing to global scope. Inside, define module-level state: `state` object (`phase: 'idle'`, `selectedDuration: null`, `startedAt: null`, `plannedDuration: null`), `notifPermission` (`'default'`), `intervalId: null`. Define `IDLE`/`RUNNING` constants. Define `storeGet`/`storeSet` helpers (same as index.html). Define `appendSession(record)` that reads `focus:sessions`, pushes record, writes back, then dispatches `'dashboard-data-changed'`. Define `requestNotificationPermission()` that calls `Notification.requestPermission()` and stores result; skip if not `'default'`. No DOM, no event listeners yet.
- [x] 1.2 Add state machine helpers: `startTimer(durationSeconds)` sets `state = { phase: 'running', startedAt: Date.now(), plannedDuration: durationSeconds }` and calls `requestNotificationPermission()` if first start. `stopTimer(status)` clears interval, computes `actualDuration = Math.round((Date.now() - state.startedAt) / 1000)`, calls `appendSession({ id, startedAt, plannedDuration, actualDuration, status, completedAt: Date.now() })`, resets state to idle and clears intervalId. `tick()` checks elapsed >= plannedDuration and calls `stopTimer('completed')` or updates a live tick. No DOM updates yet.
- [x] 1.3 Add `paintFocusArc()` that reads all sessions from `focus:sessions`, filters to today, computes for each session: `startMinuteOfDay = hour*60+minute`, `startAngle = (startMinuteOfDay/1440)*360 - 90`, `sweepAngle = (actualDuration/86400)*360`; sets `stroke='#8b5cf6'`, `strokeWidth=8`, `strokeLinecap='round'` on `#focusArc`; sets `strokeDasharray=circumference`, `strokeDashoffset=circumference*(1-sweepAngle/360)`, `transform='rotate(startAngle 60 60)'`. Calls `dispatchEvent('dashboard-data-changed')` when done. No DOM creation; operates on existing `#focusArc`.

## Phase 2: Core Implementation — HTML additions

- [x] 2.1 In `index.html`, inside `.container` before the `<!-- Day Ring + Streak Row -->` section, add a `<div id="focusPresets" class="focus-presets">` containing5 buttons: `data-duration="900"` (15 min), `data-duration="1500"` (25 min), `data-duration="1800"` (30 min), `data-duration="2700"` (45 min), `data-duration="5400"` (90 min). Add `focusStartBtn` button after the preset buttons (enabled only when a preset is selected and state is idle). Add `focusStopBtn` button (hidden by default). All buttons use class `focus-preset-btn` (preset buttons) and `focus-start-btn`/`focus-stop-btn`.
- [x] 2.2 Add sticky banner HTML `<div id="focusBanner" class="focus-banner" style="display:none">` right after `<div class="container">` opening tag: inner div `focus-banner-inner` with `<span id="focusRemaining" class="focus-time-display">`, `<span id="focusElapsed" class="focus-time-display">`, and the `focusStopBtn`. Add `<circle id="focusArc" cx="60" cy="60" r="52" fill="none" stroke="#8b5cf6" stroke-width="8" stroke-linecap="round" style="display:none"/>` inside `#dayRingSvg` (after existing `<filter>` defs, before the background circle).
- [x] 2.3 Add CSS classes in the existing `<style>` block: `.focus-presets` grid layout; `.focus-preset-btn` as a tappable button with `background:rgba(255,255,255,0.05)`, `border:1px solid rgba(255,255,255,0.08)`, `border-radius:10px`; `.focus-preset-btn.selected` with violet background `rgba(139,92,246,0.2)` and violet border; `.focus-banner` as `position:fixed`, `top:max(52px,env(safe-area-inset-top))`, `left:0`, `right:0`, `z-index:40`, `background:rgba(20,20,22,0.95)`, `backdrop-filter:blur(14px)`, `border-left:3px solid #8b5cf6`; `.focus-banner-inner` flex row with gap; `.focus-time-display` monospace font; `.focus-stop-btn` danger styling. Inject `<script src="focus-timer.js"></script>` before `</body>`.

## Phase 3: Wiring — timer logic to DOM

- [x] 3.1 In `focus-timer.js`, add `renderStickyBanner()` that sets `focusBanner.style.display` to `'flex'`, updates `focusRemaining` and `focusElapsed` textContent. Add `hideStickyBanner()` that sets `focusBanner.style.display = 'none'`. Wire `startTimer()` to call `renderStickyBanner()` after setting state. Wire `stopTimer()` to call `hideStickyBanner()` and `paintFocusArc()` after logging.
- [x] 3.2 Add1-second `setInterval` inside `startTimer()` that calls `tick()`. `tick()` computes `elapsed = Math.floor((Date.now() - state.startedAt)/1000)`, `remaining = state.plannedDuration - elapsed`; updates `focusRemaining.textContent = formatMMSS(remaining)`, `focusElapsed.textContent = formatMMSS(elapsed)`; if `remaining <= 0` calls `stopTimer('completed')`. Add `formatMMSS(seconds)` helper returning `'MM:SS'`.
- [x] 3.3 Wire preset button clicks: on `.focus-preset-btn` click, set `selectedDuration` in state, add `.selected` class to clicked button, remove from siblings, enable `focusStartBtn`. On `focusStartBtn` click (only when state is idle and duration selected), call `startTimer(selectedDuration)`. On `focusStopBtn` click (only when running), call `stopTimer('stopped-early')`. Start button disabled state logic: disabled when state is not idle OR no preset selected.
- [x] 3.4 On page load in `focus-timer.js`, call `paintFocusArc()` to render any pre-existing sessions from localStorage. Listen for `'dashboard-data-changed'` to re-paint the focus arc when other data changes.

## Phase 4: Notifications

- [x] 4.1 In `stopTimer()`, after computing `actualDuration` and before `appendSession()`, check `notifPermission === 'granted'` and if so fire `new Notification('Focus session complete', { body: Math.round(actualDuration/60) + ' min', icon: '...' })`. If `'denied'`, silently skip. On first `startTimer()` call when `notifPermission === 'default'`, call `requestNotificationPermission()` and store the result.

## Phase 5: Smoke Test

- [x] 5.1 Manual verification checklist: (a) Tap each preset — start button enables only after selection. (b) Start25-min session — banner appears with correct "25:00" remaining, "00:00" elapsed, stop button visible. (c) Wait 5 seconds — elapsed increments, remaining decrements. (d) Tap Stop — banner hides, arc appears on day ring, `focus:sessions` in DevTools has one record with `status: 'stopped-early'`. (e) Start1-min session, wait 65s — notification fires (if permitted), session logged with `status: 'completed'`. (f) Reload page — active timer is gone (expected), arc persists from localStorage.
