# Proposal: Frontend Modernization

## Intent

Modernize the personal dashboard to deliver a smooth, high-performance, native-app-like experience across all viewports. This change addresses rendering delays due to repeated DOM selections and synchronous local storage operations, provides seamless page transitions across all internal links using the View Transitions API, introduces staggered card entrance animations, and refines the mobile layout zone for better thumb ergonomics and tap accuracy.

## Scope

### In Scope
- **Component Performance**:
  - Implement a centralized DOM selector caching registry for hot-path page redraws.
  - Implement a memory caching wrapper for `localStorage` to avoid redundant synchronous reads, invalidating properly on cross-window/tab updates.
  - Enable passive event listeners on touch/scroll interactions.
  - Wrap visual layout modifications (e.g., progress rings, dynamic lists) in `requestAnimationFrame` loops.
- **Page Transitions**:
  - Extend navigation transitions to all internal links (`a[href]`) on the pages (ignoring external links, target `_blank`, page anchors, or modifier keys).
  - Use native View Transitions API feature-detection to bypass the artificial 130ms JS sliding delay in supported browsers.
  - Set `view-transition-name: main-navigation` on `.tabbar-inner` to keep the navigation dock visually static and stable.
- **Staggered Animations**:
  - Apply custom CSS properties (`--stagger-index`) dynamically on page load to card and list container elements to cascade entrance fades.
  - Respect `prefers-reduced-motion: reduce` by resolving all animations instantly with zero duration.
- **Mobile UI**:
  - Anchor the navigation `.tabbar` to the bottom on viewports below 768px.
  - Handle safe-area boundaries dynamically (`env(safe-area-inset-bottom)`) to prevent system-bar clipping.
  - Expand touch interactive target sizes (e.g., checkboxes, list delete buttons) to a minimum of 44x44px using absolute pseudo-elements.

### Out of Scope
- Migrating the site into a single-page application framework (e.g., React, Vue, Svelte).
- Rewriting backend/Netlify functions or data schemas.
- Modifying third-party analytics or external links.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- **ui-ux-animations**: Update requirements to incorporate cross-document View Transitions navigation triggers across all internal links, staggered element cascading animations, bottom dock placement on mobile viewports, and touch-target minimums.

## Approach

1. **Storage Memoization & Event Performance**:
   - In `dashboard-shell.js`, implement a read-through memory cache for storage keys (e.g., `po_water_v1`, `po_sleep_v1`).
   - Listen to window `storage` events and custom `dashboard-data-changed` events to invalidate cached states.
   - Refactor event listener setups in shell initialization to declare `{ passive: true }` on touch events.
2. **Selector Caching Registry**:
   - For page scripts (`index.html`, `water.html`, `gym.html`, `sleep.html`, `weight.html`, `finance.html`, `supplements.html`), bundle DOM selector queries into a cached mapping object initialized on `DOMContentLoaded`.
3. **Advanced Transitions**:
   - Refactor the document click listener in `dashboard-shell.js` to catch any internal click to local pages.
   - If `'startViewTransition' in document` is true, delegate page navigation to the browser's native transitions without delay, else fall back to the 130ms JS sliding fade.
   - Specify transition rules in CSS to bind the dock layout via `view-transition-name: main-navigation`.
4. **Stagger Entrance**:
   - Write a helper script utility (or add to `dashboard-shell.js`) that automatically queries entrance targets (`.summary-card`, `.section`, etc.) and assigns their `--stagger-index` incrementally.
   - Style cards with `.cascade-item` containing `animation-delay: calc(var(--stagger-index, 0) * 45ms)`.
5. **Mobile layout**:
   - Adjust CSS layouts inside `@media (max-width: 767px)` to snap `.tabbar` to bottom and shift page container margins/padding bottom-heavy.
   - Apply absolute `::before` overlays on `.goal-checkbox` and delete links to expand clickable regions to 44x44px.

## Affected Areas

| Area | Impact | Description |
| :--- | :--- | :--- |
| `dashboard-shell.js` | Modified | Add storage cache registry, extended click transitions handler, View Transitions feature support, and responsive CSS structure for mobile dock relocation. |
| `index.html` | Modified | Implement DOM selector cache registry, stagger triggers, and verify touch targets. |
| `water.html` | Modified | Implement DOM selector cache registry, stagger triggers, and verify touch targets. |
| `gym.html` | Modified | Implement DOM selector cache registry, stagger triggers, and verify touch targets. |
| `sleep.html` | Modified | Implement DOM selector cache registry, stagger triggers, and verify touch targets. |
| `weight.html` | Modified | Implement DOM selector cache registry, stagger triggers, and verify touch targets. |
| `finance.html` | Modified | Implement DOM selector cache registry, stagger triggers, and verify touch targets. |
| `supplements.html` | Modified | Implement DOM selector cache registry, stagger triggers, and verify touch targets. |

## Risks

| Risk | Likelihood | Mitigation |
| :--- | :--- | :--- |
| **Out-of-sync Storage Caches** | Medium | Listen strictly to `storage` events across tabs to invalidate and redraw immediately. |
| **Mobile safe-area clipping** | Low | Standardize container padding using CSS `env(safe-area-inset-*)` values on body/shell wrappers. |
| **Transition flicker / blink** | Low | Keep the fallback transition duration low and utilize `@view-transition` CSS flags on compatible engines. |
| **Tap target layout overlaps** | Low | Use transparent absolute-positioned pseudo-elements (`::before`) to increase click targets without expanding element visual borders. |

## Rollback Plan

- Revert changes via git rollback/restore to the previous stable commit on the current branch:
  ```bash
  git restore dashboard-shell.js index.html water.html gym.html sleep.html weight.html finance.html supplements.html
  ```
- No persistent storage schema changes or database migrations are run, making code rollback safe and immediate.

## Success Criteria

- [x] DOM selector cache objects query nodes exactly once on page load instead of on every redraw.
- [x] Multiple consecutive synchronous `localStorage.getItem` reads hit the memory cache instead of requesting storage repeatedly during a single paint loop.
- [x] Internal page links transition smoothly via native View Transitions API when supported, bypassing the 130ms timeout.
- [x] Elements load progressively with visual stagger delays without layout jumps.
- [x] The tab bar navigation appears at the bottom of the screen on devices with viewports `< 768px`.
- [x] Safe area bottom margins are respected on mobile viewports.
- [x] Touch target sizes of interactive checkboxes and delete buttons cover a minimum of 44x44px.
- [x] All page transitions and entrance animations resolve instantly with zero duration when `prefers-reduced-motion: reduce` is enabled.
