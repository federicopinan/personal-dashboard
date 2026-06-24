# Tasks: Frontend Modernization

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~350–450 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

## Phase 1: Foundation — Storage Cache & Performance Helpers

- [x] 1.1 In `dashboard-shell.js`, implement a read-through storage memory cache wrapper (`storageCache = new Map()`). Update `readJSON` to check if key exists in cache map; if found, return cached parsed object; if not, query `localStorage.getItem` and cache the parsed value (or fallback). Update `writeJSON` to store the value in `storageCache` before calling `localStorage.setItem`.
- [x] 1.2 In `dashboard-shell.js`, attach window event listeners to invalidate `storageCache` keys: listen for window `'storage'` events (to clear/invalidate updated keys on cross-tab updates) and custom `'dashboard-data-changed'` events (to delete cache entry for the modified key, or sync state).
- [x] 1.3 Refactor event listeners in `dashboard-shell.js` and common utilities to specify `{ passive: true }` on touch events (like `touchstart`, `touchmove`) to improve scrolling performance.
- [x] 1.4 Wrap UI redraw functions and layout-altering writes (such as progress rings, dynamic list redraws, or canvas rendering) in `requestAnimationFrame` loops to prevent layout thrashing and align paints with monitor refresh rate.

## Phase 2: Interceptor & Navigation — View Transitions API

- [x] 2.1 Refactor click event listeners in `dashboard-shell.js` (like `installNavigationMotion`) to intercept click events on all internal anchor tags (`a[href]`) instead of just `.tab` elements.
- [x] 2.2 Inside the interceptor, screen links to ignore: external origins, links with `target="_blank"`, hash/anchor links referencing the current page, and clicks with command modifier keys (`ctrlKey`, `metaKey`, `shiftKey`, `altKey`).
- [x] 2.3 Check if `'startViewTransition' in document` is true. If supported, allow the page to navigate instantly without artificial delays to trigger cross-document view transitions.
- [x] 2.4 If unsupported, implement a fallback that applies the exit class `pd-page-leave` to `document.body` and schedules navigation via `setTimeout` after a 130ms delay.
- [x] 2.5 Update the shell CSS injection (`installShellStyles`) to declare `@view-transition { navigation: auto; }` and assign `view-transition-name: main-navigation` to `.tabbar-inner` (ensuring the navigation dock remains visually static and stable in position across view transitions).

## Phase 3: Page DOM Cache & Cascade Animations

- [x] 3.1 Update the page-level scripts inside `index.html`, `gym.html`, `water.html`, `sleep.html`, `weight.html`, `finance.html`, and `supplements.html` to declare a `domCache` registry initialized on `DOMContentLoaded`.
- [x] 3.2 Refactor all hot-path functions (e.g. `renderSnapshot`, `updateHistory`, `drawChart`, log-handling redraws) in each HTML page to retrieve elements from `domCache` rather than calling `document.getElementById` or `document.querySelector` repeatedly.
- [x] 3.3 Add a helper function `applyCascadeStagger()` (either in `dashboard-shell.js` or in individual pages) that queries entrance elements (like `.summary-card`, `.section`, `.gm-card`, `.cascade-item`) and assigns a sequential, dynamic CSS custom property `--stagger-index` (0, 1, 2, etc.) to each.
- [x] 3.4 In the shell/page CSS, define the `.cascade-item` animation styles: implement entrance fade-in and slide-up keyframes (`pdCascadeEnter`), set `animation-delay: calc(var(--stagger-index, 0) * 45ms)`.
- [x] 3.5 Respect user reduced-motion preferences: add CSS overrides within `@media (prefers-reduced-motion: reduce)` to disable all cascade animations (set animation to `none`, opacity to `1`, and transform to `none`) and navigation transition delays.

## Phase 4: Mobile Layout, Dock & Touch Targets

- [x] 4.1 In the CSS block injected by `dashboard-shell.js`, adjust the `.tabbar` layout within a `@media (max-width: 767px)` media query to fix the dock at the bottom of the viewport (`top: auto; bottom: 0;`).
- [x] 4.2 Restructure the page container offsets on mobile viewports: shift top padding/margins to the bottom to prevent dock content overlaps (e.g., set `body.pd-has-dock { padding-top: 0; padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px)); padding-top: 0; }` on mobile devices, keeping the desktop layouts at top).
- [x] 4.3 Handle mobile device safe areas dynamically by incorporating CSS `env(safe-area-inset-bottom)` and `env(safe-area-inset-top)` into the padding values of `.tabbar` and the body wrapper.
- [x] 4.4 Expand touch targets for small interactive components (such as `.goal-checkbox` and delete/remove buttons or icons) to at least 44x44px. Use absolute transparent `::before` pseudo-elements to expand the clickable boundary without altering the visual layouts or borders of elements.

## Phase 5: Verification

- [x] 5.1 Run Node.js regression tests (`dashboard-shell.test.js`) and ensure they pass. Update tests if needed to align with the new caching patterns.
- [x] 5.2 Verify in Chrome/Firefox DevTools that `localStorage` reads are cached: consecutive reads during redraws or page interactions must hit the memory map rather than invoking `localStorage.getItem` repeatedly.
- [x] 5.3 Verify that internal links correctly trigger the native View Transition API when supported, showing a seamless blend with a static navigation bar, and fall back to the 130ms delay only in unsupported browsers.
- [x] 5.4 Confirm staggered animation sequences execute dynamically: verify that `--stagger-index` values are mapped from `0` upwards on cards and widgets, and fade in sequentially.
- [x] 5.5 Verify mobile viewport layout: simulate viewports < 768px in responsive dev tools, ensuring the navigation dock relocates to the bottom, respects safe areas, and has padding offsets matching the body content.
- [x] 5.6 Inspect checkboxes and delete buttons to ensure their bounding touch targets are at least 44x44px via transparent `::before` pseudo-elements.
- [x] 5.7 Verify reduced motion: toggle system-level prefers-reduced-motion setting and confirm all page transitions and entrance animations resolve instantly with zero duration.
