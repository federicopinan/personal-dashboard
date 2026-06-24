# UI/UX Animations Delta Specification (frontend-modernization)

This delta specification defines the system behavior modifications and additions for the `frontend-modernization` change under the `ui-ux-animations` domain. It modifies cross-document view transitions to leverage native capabilities, and introduces staggered cascade animations, mobile dock layout refactoring with safe area padding, and performance caching mechanisms.

## MODIFIED Requirements

### Requirement: Cross-Document View Transitions

The system MUST support page-to-page View Transitions to animate navigation. Navigation transitions MUST apply to all internal site links (ignoring external links, target="_blank", anchors, or modifier keys). To prevent navigation delays, the system MUST detect `document.startViewTransition` support; if supported, transitions MUST execute instantly without artificial JavaScript delays. Unsupported browsers MUST fall back to a CSS-only opacity fade-in. The navigation tab bar MUST be kept in position and remain visually static across transitions using `view-transition-name: main-navigation` on the inner container of the tab bar.

#### Scenario: Navigating between pages using internal links
- GIVEN a user triggers a page navigation by clicking an internal link (`a[href]`) without modifier keys
- WHEN the browser supports `document.startViewTransition`
- THEN the transition MUST execute a smooth cross-fade animation immediately without artificial delays
- AND the navigation dock inner container (`.tabbar-inner`) MUST remain visually static and stable in position across the transition using `view-transition-name: main-navigation`
- ELSE the transition MUST fall back to executing a CSS-only fade-in entrance after a 130ms JavaScript sliding delay

---

## ADDED Requirements

### Requirement: Staggered Cascade Animations

Content cards and list items MUST animate sequentially on page load using custom transition delays to create a staggered entrance cascade.

#### Scenario: Loading a page with content cards and list items
- GIVEN a page contains multiple card or list container elements with the `.cascade-item` class
- WHEN the page loads (DOMContentLoaded)
- THEN the system MUST dynamically assign an incremental `--stagger-index` custom property (0, 1, 2, etc.) to each target element
- AND each target element MUST execute a staggered entrance fade-in and slide-up animation using `animation-delay: calc(var(--stagger-index, 0) * 45ms)`
- AND the animations MUST resolve instantly with zero duration if the user has enabled reduced motion preferences (`prefers-reduced-motion: reduce`)

---

### Requirement: Mobile Navigation Dock and Safe Areas

The navigation dock MUST adapt its layout on mobile viewports, respect device safe area insets, and ensure interactive elements have tap targets with a minimum size of 44x44px.

#### Scenario: Rendering the navigation on mobile viewports
- GIVEN a mobile device viewport width of less than 768px
- WHEN the navigation dock (`.tabbar`) renders
- THEN the dock MUST adapt its layout to be fixed at the bottom of the screen
- AND the layout MUST respect the device's safe area insets using CSS `env(safe-area-inset-bottom)` and `env(safe-area-inset-top)` to prevent system-bar clipping or overlap
- AND interactive targets such as checkboxes (`.goal-checkbox`) and delete buttons MUST have minimum touch target dimensions of 44x44px (using transparent absolute-positioned pseudo-elements if necessary) to prevent layout shifts or overlaps

---

### Requirement: Performance Cache and Optimization

Data storage operations and DOM queries MUST be cached to prevent layout thrashing and redundant synchronous calls during page drawing operations.

#### Scenario: Accessing DOM elements and localStorage data
- GIVEN a page redraw or state update is triggered
- WHEN DOM elements are queried
- THEN the system MUST retrieve them from a centralized DOM selector caching registry instead of performing repeated DOM queries
- AND WHEN `localStorage` keys (e.g., `po_water_v1`, `po_sleep_v1`) are accessed
- THEN the system MUST retrieve them from a read-through memory cache wrapper rather than making repeated synchronous calls to `localStorage`
- AND the storage cache wrapper MUST invalidate cached keys upon receiving cross-window/tab `storage` updates or custom `dashboard-data-changed` events
- AND visual layout modifications (e.g., progress rings, dynamic list redraws) MUST be scheduled via `requestAnimationFrame` to prevent layout thrashing
- AND touch/scroll interaction event listeners MUST be declared as passive event listeners (`{ passive: true }`)
