# UI/UX Animations Specification

> **ARCHIVE NOTICE (2026-07-15)** — This spec describes page-transition,
> 400ms numeric counters, goal-checklist pop, modal entry/exit, mobile dock,
> and storage-cache behavior authored for a vanilla HTML/CSS/JS PWA
> dashboard. The actual project today is Next.js 14 + React 18 + TypeScript;
> the Dashboard grid renders with React state, CSS custom-property animation,
> `requestAnimationFrame`-driven number rollups, and prefers-reduced-motion
> guards, but it does not use the View Transitions API, does not paint the
> page-to-page navigation dock described here, and does not implement the
> centralized DOM selector cache or storage-cache wrapper. Some shape
> overlaps (reduced-motion, passive listeners) survive in spirit; the contract
> is not enforceable as written. Preserved verbatim for historical
> traceability. Do not promote new requirements here.

## Purpose

This specification establishes the requirements for premium UI/UX transitions, number counters, and interactive micro-animations. It standardizes behavior to ensure smooth, hardware-accelerated execution, zero layout shifts, and accessibility compliance.

## Requirements

### Requirement: Motion Accessibility

The system MUST respect the user's system motion preferences. If the user prefers reduced motion, all animations and transitions MUST resolve instantly without motion.

#### Scenario: Reduced motion enabled
- GIVEN the user has enabled prefers-reduced-motion
- WHEN any page loads or UI interaction occurs
- THEN transitions MUST be instant (0s duration)
- AND no scaling, sliding, or kinetic effects are applied

---

### Requirement: Cross-Document View Transitions

The system MUST support page-to-page View Transitions to animate navigation. Navigation transitions MUST apply to all internal site links (ignoring external links, target="_blank", anchors, or modifier keys). To prevent navigation delays, the system MUST detect `document.startViewTransition` support; if supported, transitions MUST execute instantly without artificial JavaScript delays. Unsupported browsers MUST fall back to a CSS-only opacity fade-in. The navigation tab bar MUST be kept in position and remain visually static across transitions using `view-transition-name: main-navigation` on the inner container of the tab bar.

#### Scenario: Navigating between pages using internal links
- GIVEN a user triggers a page navigation by clicking an internal link (`a[href]`) without modifier keys
- WHEN the browser supports `document.startViewTransition`
- THEN the transition MUST execute a smooth cross-fade animation immediately without artificial delays
- AND the navigation dock inner container (`.tabbar-inner`) MUST remain visually static and stable in position across the transition using `view-transition-name: main-navigation`
- ELSE the transition MUST fall back to executing a CSS-only fade-in entrance after a 130ms JavaScript sliding delay

---

### Requirement: 400ms Numeric Counters

The system MUST count up or down numeric logs over exactly 400ms. The font styling MUST use tabular-nums to prevent layout shaking.

#### Scenario: Incrementing a statistical log
- GIVEN a statistic displays a numeric value
- WHEN the log value is incremented by the user
- THEN the number MUST count up smoothly using requestAnimationFrame
- AND the transition duration MUST be exactly 400ms
- AND the numbers MUST render as tabular-nums to avoid jitter

---

### Requirement: Goal Checklist Completion

Goal checklist items MUST animate using a checkbox pop and fade/line-through transitions. Actions MUST NOT cause layout shifts.

#### Scenario: Completing a checklist goal
- GIVEN a goal is unchecked
- WHEN the user clicks the checkbox
- THEN the checkbox MUST pop using a bouncy spring scale transition
- AND the goal text MUST fade to 50% opacity and apply a line-through decoration
- AND the layout flow MUST remain stable without shifting neighboring items

---

### Requirement: GPU-Safe Hover Effects

Card items SHOULD lift slightly on hover. Spotlight borders SHOULD track the cursor. All hover motion MUST animate transform or opacity only.

#### Scenario: Hovering over a metric card
- GIVEN a metric card sits in the dashboard
- WHEN the cursor hovers over the card
- THEN the card MUST execute a GPU-safe lift via transform translateY
- AND border glow gradients MUST track the cursor position dynamically
- AND transition curves MUST use custom beziers with Apple-esque deceleration

---

### Requirement: Modal Entry and Exit Transitions

Modals MUST animate both entry and exit states. Exits MUST complete their transitions before elements are hidden.

#### Scenario: Opening and closing a modal
- GIVEN a modal is triggered
- WHEN the user opens the modal
- THEN the overlay MUST fade in and the content container MUST slide up
- AND WHEN the user clicks close
- THEN the exit transition MUST complete fully
- AND the modal element MUST only then be hidden from the DOM layout

---

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
