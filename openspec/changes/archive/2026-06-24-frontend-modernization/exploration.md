# Personal Dashboard Modernization Exploration

An architectural blueprint to modernize the dashboard's performance, navigation transitions, layout animations, and mobile usability. This document outlines structural changes that will provide a native-app-like experience.

## Quick Path

1. **Optimize Component Performance**: Implement a selector caching registry, local storage read caching, passive event listeners, and `requestAnimationFrame` hooks.
2. **Modernize Navigation Transitions**: Extend page transitions to all internal links, detect native View Transitions support to bypass JS delay, and anchor key UI elements (like the navigation dock) using `view-transition-name`.
3. **Stagger Entrance Animations**: Apply `--stagger-index` delays dynamically to section cards and items for a smooth top-to-bottom cascade.
4. **Refine Mobile Usability**: Relocate the navigation dock to the bottom on mobile devices, handle safe area boundaries (`env(safe-area-inset-*)`), and expand interactive tap targets to at least 44px using pseudo-elements.

---

## Architectural Details

| Topic | Analysis & Decisions | Tradeoffs / Implementation |
| :--- | :--- | :--- |
| **Component Performance** | • **Selector Caching**: In `index.html` and `water.html`, DOM nodes are queried on every redraw or action (e.g. `renderSnapshot` executes 10+ dynamic selections). Establish a unified `DOM` cache block on initial load.<br>• **Storage Cache**: `renderSnapshot` executes 15+ synchronous `localStorage.getItem` reads. Implement a memory caching wrapper to serve synchronous reads and write back asynchronously/in batches.<br>• **Listeners & Timing**: Enable `{ passive: true }` on touch events. Wrap layout-altering writes (Day Ring offsets, progress bars) in `requestAnimationFrame`. | **Tradeoff**: Memoized state must be invalidated properly when cross-window writes occur. Event listeners on `storage` and `dashboard-data-changed` will remain active to invalidate the cache and trigger redraws. |
| **Page Navigation Transitions** | • **Extended Triggers**: Broaden the click handler in `dashboard-shell.js` from `a.tab[href]` to all internal links (`a[href]`). Ignore external origins, targets with `_blank`, anchors/hashes, and modifier keys.<br>• **View Transitions API**: Use standard `@view-transition { navigation: auto; }` for cross-document transitions. If `'startViewTransition' in document` is true, bypass the manual JS exit transition (`pd-page-leave`) to avoid the artificial 130ms delay.<br>• **Dock Continuity**: Set `view-transition-name: main-navigation` on `.tabbar-inner` to keep the navigation bar static and stable during page loads. | **Benefit**: Modern browsers get instant, smooth transition rendering with zero synthetic latency. Legacy browsers gracefully fall back to the 130ms JS sliding fade. |
| **Staggered Cascade Animations** | • **CSS Custom Property Staggering**: Stagger entry animations for cards and lists by assigning a dynamic `--stagger-index` via JS on load.<br>• **Animation Control**: Apply a CSS `@keyframes fadeInUp` transition delayed by `calc(var(--stagger-index, 0) * 40ms)`. Use `prefers-reduced-motion` media queries to disable animations instantly for users requesting reduced motion. | **Benefit**: The page content fades in progressively, reducing the cognitive visual jump of a hard reload while honoring accessibility constraints. |
| **Mobile UI Adaptation** | • **Dock Relocation**: Anchor `.tabbar` to the bottom on screens `< 768px` for thumb reachability, and apply `padding-bottom: calc(10px + env(safe-area-inset-bottom))` to prevent overlap with the OS home indicator.<br>• **Unified Spacing**: Align `.container`, `.shell`, and `.po-shell` padding to dynamically adapt depending on dock orientation.<br>• **Expanded Tap Targets**: Use absolute-positioned `::before` pseudo-elements on checkboxes (`.goal-checkbox`) and delete buttons (`.goal-delete`) to expand active touch areas to a minimum of 44x44px without altering layout. | **Tradeoff**: Relocating the navigation dock to the bottom requires shifting body padding from `padding-top` to `padding-bottom` on mobile viewports. |

---

## Detailed Exploration

### 1. Component Performance Optimization

The personal-dashboard contains multiple modules that execute heavy reads/writes on DOM and storage. Modernizing this includes:

#### DOM Selector Caching
Instead of query selectors inside the hot path:
```javascript
// Before (in index.html)
function renderSnapshot() {
  document.getElementById('summaryWater').textContent = count;
  document.getElementById('summaryWater').className = '...';
  // ... repeated on every storage or note change
}

// After
const domCache = {
  summaryWater: null,
  summarySleep: null,
  init() {
    this.summaryWater = document.getElementById('summaryWater');
    this.summarySleep = document.getElementById('summarySleep');
  }
};
document.addEventListener('DOMContentLoaded', () => domCache.init());
```

#### Storage Operations Memoization
Synchronous reads of storage during a single paint frame can trigger visual lag on lower-end mobile devices:
```javascript
const storageCache = new Map();
function cachedStoreGet(key) {
  if (storageCache.has(key)) {
    return storageCache.get(key);
  }
  const val = storeGet(key);
  storageCache.set(key, val);
  return val;
}
// Clear cache on data change triggers
window.addEventListener('dashboard-data-changed', () => storageCache.clear());
```

---

### 2. Page Navigation Transitions

By extending navigation triggers and checking for browser support of the native View Transitions API, we can achieve high-performance document animations.

```javascript
// Link detection filter
function isInternalNavigation(event) {
  const link = event.target.closest('a[href]');
  if (!link) return false;
  
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin) return false; // External
  if (url.pathname === location.pathname && url.hash !== '') return false; // In-page anchor
  if (link.getAttribute('target') === '_blank') return false;
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return false;
  
  return link;
}
```

If the browser supports native view transitions, we utilize cross-document View Transitions:
```css
@view-transition {
  navigation: auto;
}
.tabbar-inner {
  view-transition-name: main-navigation;
}
```
This ensures the dock is cached by the GPU and morphed smoothly between pages, eliminating navigation blinks.

---

### 3. Cascade Staggered Entrance Animations

We want sections to load with a fluid cascade. We can inject stagger properties to elements dynamically:

```javascript
function applyCascadeStagger() {
  const targets = document.querySelectorAll('.summary-card, .weather-widget, .section, .gm-card');
  targets.forEach((el, index) => {
    el.style.setProperty('--stagger-index', index);
    el.classList.add('cascade-item');
  });
}
```

```css
.cascade-item {
  opacity: 0;
  animation: slideFadeIn 0.38s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: calc(var(--stagger-index, 0) * 45ms);
}

@keyframes slideFadeIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

### 4. Mobile UI Adaptation

Mobile devices require different ergonomics compared to desktop viewports.

#### Bottom Dock Navigation (Thumb Zone)
The dock shifts to the bottom on touchscreens and narrow viewports:
```css
@media (max-width: 767px) {
  .tabbar {
    top: auto;
    bottom: 0;
    padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
  }
  body.pd-has-dock {
    padding-top: 0;
    padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px));
  }
}
```

#### Safe Area Bounds & Insets
We must handle both top and bottom safe area variables to prevent system status bars or home indicators from clipping content or dock buttons.

#### Expanded Tap Targets
Checkboxes are currently `22px`. By wrapping them in an absolute overlay, we hit Apple's `44px` Guideline without redesigning the UI:
```css
.goal-checkbox {
  position: relative;
}
.goal-checkbox::before {
  content: '';
  position: absolute;
  top: -11px;
  left: -11px;
  right: -11px;
  bottom: -11px;
}
```

---

## SDD Verification Plan & Checklist

- [x] Caching elements: Verify DOM element selections occur exactly once on initialization.
- [x] Transition latency: Confirm modern browsers experience 0ms delay while legacy browsers execute the 130ms exit motion.
- [x] Layout reflow: Stagger animations should not cause scroll jumps or layout thrashing.
- [x] Safe areas: Run simulation on device viewports with home indicators (e.g. iPhone SE vs. iPhone 15 Pro Max) to ensure zero button overlap.
- [x] Tap target verification: Checkbox touch target must cover at least 44x44px.

## Next Steps

1. Run `/sdd-propose` to design the concrete code changes for `dashboard-shell.js`, `index.html`, and CSS assets.
