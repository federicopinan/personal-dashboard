# Tasks: Premium UI/UX Animations

## Review Workload Forecast
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

## Tasks

### Phase 1: Shared Foundation
- [x] **Task 1.1**: Update [topbar.js](file:///home/federico/Desktop/dashboard/topbar.js) to inject shared CSS: `--ease-spring-pop`, `--ease-apple-decel`, `--ease-modal` timing tokens; `.spotlight-card` layout & hover styling, checkbox pop, and page entrance animations (`fadeIn` on `body::before`).
- [x] **Task 1.2**: Update [topbar.js](file:///home/federico/Desktop/dashboard/topbar.js) to inject `@media (prefers-reduced-motion: reduce)` overrides to disable animations.
- [x] **Task 1.3**: Implement the `window.animateNumber` utility using `requestAnimationFrame` in [topbar.js](file:///home/federico/Desktop/dashboard/topbar.js).

### Phase 2: Navigation & Document Transitions
- [x] **Task 2.1**: Insert `<meta name="view-transition" content="same-origin">` into `<head>` of [index.html](file:///home/federico/Desktop/dashboard/index.html), [finance.html](file:///home/federico/Desktop/dashboard/finance.html), [gym.html](file:///home/federico/Desktop/dashboard/gym.html), [water.html](file:///home/federico/Desktop/dashboard/water.html), [weight.html](file:///home/federico/Desktop/dashboard/weight.html), and [sleep.html](file:///home/federico/Desktop/dashboard/sleep.html).

### Phase 3: Page-Specific Interactive Polish
- [x] **Task 3.1**: In [index.html](file:///home/federico/Desktop/dashboard/index.html), animate goals checkbox check event with `checkboxPop` keyframe. Apply transition to goal text (50% opacity, `line-through` decoration) on check without layout shifts. Animate goals completion header with `window.animateNumber`.
- [x] **Task 3.2**: In [finance.html](file:///home/federico/Desktop/dashboard/finance.html), add `.spotlight-card` classes and mousemove listeners for dynamic spotlight coordinates `--mouse-x`, `--mouse-y`. Animate numeric logs with `window.animateNumber`.
- [x] **Task 3.3**: In [gym.html](file:///home/federico/Desktop/dashboard/gym.html), integrate `window.animateNumber` for drink, weight, and log counters. Animate list entries on append/remove.
- [x] **Task 3.4**: In [water.html](file:///home/federico/Desktop/dashboard/water.html), animate daily totals counter with `window.animateNumber`.
- [x] **Task 3.5**: In [weight.html](file:///home/federico/Desktop/dashboard/weight.html), animate logs counters with `window.animateNumber`.
- [x] **Task 3.6**: Animate modal entry (fade/slide up) and exit transitions, delaying modal element hide until transition ends (all pages).

### Phase 4: Local Verification
- [x] **Task 4.1**: Verify accessibility: animations resolve instantly when `prefers-reduced-motion` is active.
- [x] **Task 4.2**: Verify page-to-page View Transitions and CSS opacity fallback in unsupported browsers.
- [x] **Task 4.3**: Verify numeric counting animation finishes in exactly 400ms using tabular spacing.
- [x] **Task 4.4**: Verify checklist check pops, spotlight highlights, and modal entry/exit transitions.
