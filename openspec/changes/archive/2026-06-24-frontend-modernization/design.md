# Design Specification: Frontend Modernization

Modernize the personal dashboard architecture to deliver a hardware-accelerated, native-app-like experience across all viewports. This change eliminates rendering bottlenecks caused by synchronous `localStorage` reads and repeated DOM queries, establishes seamless cross-document view transitions, implements staggered CSS entry cascades, and repositions the mobile navigation dock while adhering to safe-area bounds and 44px touch target guidelines.

---

## Quick Path

1. **Storage Memoization & Event Performance**: Add a read-through memory cache wrapper around `localStorage` in `dashboard-shell.js` and bind window/custom invalidation listeners.
2. **DOM Selector Caching**: Add page-level caching objects to all HTML documents to query hot-path nodes exactly once on `DOMContentLoaded`.
3. **Advanced Transitions**: Extend the click listener in `dashboard-shell.js` to intercept all internal anchor tags, bypassing artificial JS delay when native `startViewTransition` is supported.
4. **Mobile Layout & Stagger**: Update styles in `dashboard-shell.js` for bottom dock relocation and safe-areas, apply absolute pseudo-element overlays for tap target expansions, and dynamically set `--stagger-index` on entry cards.

---

## Details

| Topic | Architectural Decision & Implementation Tradeoffs |
| :--- | :--- |
| **Component Caching** | • **Memory Caching Wrapper**: Implement a `Map`-based read-through cache wrapper around `localStorage` in `dashboard-shell.js`. Redundant synchronous reads hit memory (0ms) rather than causing file-system access.<br>• **Cache Synchronization**: Automatically clear/update keys on window `storage` events (cross-tab sync) and custom `dashboard-data-changed` events.<br>• **Passive Listeners & requestAnimationFrame**: Apply passive touch event listeners and defer UI layout changes (e.g., progress ring offset recalculations) to standard animation frames. |
| **DOM Selector Caching** | • **One-Time Querying**: Define local `domCache` configurations on every page script. Query elements exactly once during `DOMContentLoaded` rather than performing costly selectors (`document.getElementById`, `document.querySelector`) inside redraw hot-paths. |
| **View Transitions** | • **Global Anchor Interception**: Intercept all internal anchor tags (`a[href]`) on the pages, bypassing external domains, `_blank` targets, hash anchors, and modifier keys.<br>• **Native viewTransition Detection**: If `document.startViewTransition` is supported, navigate instantly to leverage CSS `@view-transition`. If unsupported, fallback to the 130ms sliding fade-out transition.<br>• **Dock Continuity**: Declare `view-transition-name: main-navigation` on `.tabbar-inner` to keep the navigation bar static and layout-stable during page transitions. |
| **Mobile Navigation & Safe Areas** | • **Bottom relocation**: Snap the navigation dock `.tabbar` to the bottom on devices `< 768px` using fixed positioning.<br>• **Safe Area Integration**: Apply bottom padding containing `calc(10px + env(safe-area-inset-bottom))` to prevent overlap with the OS home indicator bar.<br>• **Body Offset adjustment**: Toggle top/bottom page padding depending on the dock's position. |
| **Touch Target Enhancements** | • **Tap Targets Size**: Expand tap zones of interactive checkboxes (`.goal-checkbox`) and delete buttons to a minimum of 44x44px.<br>• **Visual Preservation**: Use absolute transparent pseudo-elements (`::before`) to expand clickable bounds without modifying original layouts or visuals. |
| **Staggered Entrance Cascades** | • **Incremental Indexes**: Dynamically set CSS variables (`--stagger-index`) on entry elements (e.g. `.cascade-item`) sequentially.<br>• **Cascaded Animations**: Apply `animation-delay: calc(var(--stagger-index, 0) * 45ms)`. Respect user preferences by immediately disabling animations when `prefers-reduced-motion: reduce` is active. |

---

## Data Flow: Data Storage Cache Operations

The following diagram illustrates read, write, and invalidation operations using the storage memory-cached wrapper around `localStorage`:

```text
               [ UI / Component Redraw Call ]
                 │                       ▲
       Read JSON │                       │ Return Memory Cached
                 ▼                       │ JavaScript Object (0ms)
        ┌────────────────────────────────┴┐
        │       storageCache (Map)        │◄─── Invalidate Cache on:
        └────────────────┬────────────────┘     • Window "storage" event
                         │                      • Custom "dashboard-data-changed"
                Miss     │                      • Write operations (Set)
             (Fetch Raw) │
                         ▼
        ┌─────────────────────────────────┐
        │          localStorage           │
        └─────────────────────────────────┘
```

---

## File Changes

| File Path | Description of Target Modifications |
| :--- | :--- |
| `dashboard-shell.js` | • Implement `storageCache` read-through memoization.<br>• Listen for window `storage` and custom data changes to invalidate the cache.<br>• Implement a document-wide click interceptor for all internal anchor tags.<br>• Check for native View Transitions and bypass transition delay where supported.<br>• Update CSS styles: set `.tabbar` position, safe area paddings, and `@view-transition` settings. |
| `index.html` | • Define a page-specific `domCache` registry initialized on `DOMContentLoaded`.<br>• Query elements exactly once on load instead of inside redraw and notes handlers.<br>• Apply `::before` pseudo-elements to goal checkboxes and delete icons.<br>• Assign sequential `--stagger-index` properties to cards/widgets. |
| `gym.html` | • Cache DOM selector queries to optimize logging updates and tables redrawing.<br>• Apply `::before` targets to checkboxes and action buttons.<br>• Assign sequential `--stagger-index` properties to gym cards. |
| `water.html` | • Cache DOM selector queries to optimize history lists and intake log updates.<br>• Assign sequential `--stagger-index` properties to cards. |
| `sleep.html` | • Cache DOM selector queries for sleep logging inputs, charts, and details.<br>• Ensure touch targets comply with 44px guidelines. |
| `weight.html` | • Cache DOM selector queries for weights charts, progress elements, and tables.<br>• Ensure touch targets comply with 44px guidelines. |
| `finance.html` | • Cache DOM selector queries for donut charts, net worth totals, and asset tables.<br>• Ensure touch targets comply with 44px guidelines. |
| `supplements.html` | • Cache DOM selector queries for stack lists, search results, and add inputs.<br>• Ensure touch targets comply with 44px guidelines. |

---

## Technical Approach Details

### 1. Storage Operations Memoization

```javascript
const storageCache = new Map();

function readJSON(key, fallback) {
  if (storageCache.has(key)) {
    return storageCache.get(key);
  }
  try {
    const raw = localStorage.getItem(key);
    const val = raw ? JSON.parse(raw) : fallback;
    storageCache.set(key, val);
    return val;
  } catch (_) {
    return fallback;
  }
}

// Wrap writing and trigger sync
function writeJSON(key, value) {
  try {
    storageCache.set(key, value);
    localStorage.setItem(key, JSON.stringify(value));
    notifyChange(key);
  } catch (_) {
    // Graceful error handling for quota exceptions
  }
}

// Invalidation Event Listeners
window.addEventListener('storage', (event) => {
  if (event.key && storageCache.has(event.key)) {
    storageCache.delete(event.key);
    notifyChange(event.key);
  }
});

window.addEventListener('dashboard-data-changed', (event) => {
  if (event.detail && event.detail.key && storageCache.has(event.detail.key)) {
    storageCache.delete(event.detail.key);
  }
});
```

### 2. View Transitions & Click Interception

```javascript
function installNavigationMotion() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest && event.target.closest('a[href]');
    if (!link) return;

    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return; // External Origin
    if (url.pathname === location.pathname && url.hash !== '') return; // Hash anchor on same page
    if (link.getAttribute('target') === '_blank') return; // New tab
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return; // Command modifiers

    // If native view transitions are supported, the browser manages the page switch smoothly.
    // We let the navigation happen immediately.
    if ('startViewTransition' in document) {
      return;
    }

    // Fallback: Apply a CSS fade-out transition with a 130ms sliding timeout
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    event.preventDefault();
    document.body.classList.add('pd-page-leave');
    setTimeout(() => {
      window.location.href = link.href;
    }, 130);
  });
}
```

CSS rules to bind the navigation bar and define transitions:

```css
@view-transition {
  navigation: auto;
}

.tabbar-inner {
  view-transition-name: main-navigation;
}
```

### 3. CSS Cascade Stagger Delays

Dynamic custom properties added to cascade targets:

```javascript
function applyCascadeStagger() {
  const targets = document.querySelectorAll('.cascade-item, .summary-card, .section, .gm-card');
  targets.forEach((el, index) => {
    el.style.setProperty('--stagger-index', index);
    el.classList.add('cascade-item');
  });
}
```

```css
.cascade-item {
  opacity: 0;
  transform: translateY(12px);
  animation: pdCascadeEnter 0.38s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: calc(var(--stagger-index, 0) * 45ms);
}

@keyframes pdCascadeEnter {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cascade-item {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}
```

### 4. Touch Target Minimum Bounds (44x44px)

```css
/* Expand target region of goal checkboxes without bloating layout */
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
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
}
```

---

## Testing Strategy

1. **Unit Tests (Node.js)**:
   - Verify `readJSON` hits the memory cache after the first read.
   - Verify changing values via `writeJSON` updates both the cache map and `localStorage`.
   - Verify window `storage` events and custom `dashboard-data-changed` events correctly invalidate cache keys.
2. **Layout & Accessibility Tests**:
   - Verify the navigation `.tabbar` positions dynamically on viewport simulated sizes (< 768px).
   - Verify `--stagger-index` CSS properties populate with incremental numeric indexes starting from `0`.
   - Verify that enabling `prefers-reduced-motion: reduce` stops/neutralizes all animation delays and transitions instantly.
3. **Manual Touch Verification**:
   - Confirm active checkbox bounds span at least 44x44px in Chrome/Safari devtools inspectors.

---

## Migration & Rollout

No database or local storage data schema migrations are required for this modernization. Rollbacks can be performed cleanly by reverting JS and CSS styles to previous git tags.

---

## Open Questions

None.
