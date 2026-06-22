# UI/UX Animations Design Spec

## 1. Technical Approach & Architecture

### Global Injection via `topbar.js`
Rather than duplicate CSS transitions, keyframes, cursor spotlight listeners, and JavaScript helper functions across every static page (`index.html`, `finance.html`, `gym.html`, etc.), we will utilize [topbar.js](file:///home/federico/Desktop/dashboard/topbar.js). Since `topbar.js` is loaded on all pages:
- **Shared CSS Rules**: Custom cubic-bezier spring curves, keyframes, spotlight card hover styles, and `@media (prefers-reduced-motion: reduce)` overrides will be appended to the CSS template string inside `topbar.js` and injected dynamically.
- **Shared JS Helpers**: A reusable, hardware-accelerated, and tabular-spaced number interpolation utility will be registered globally as `window.animateNumber`.

### View Transitions
- **Native Support**: We will leverage the native Cross-Document View Transitions API by adding `<meta name="view-transition" content="same-origin">` to the `<head>` of all HTML documents.
- **Progressive Enhancement / Fallback**: Browsers lacking support will fall back to a CSS-only full-page opacity entrance animation (`fadeIn`) applied to `body::before`.

---

## 2. Animation Interfaces & Contracts

### Timing Tokens (CSS Variables)
To capture a high-end, responsive feel, all transitions will use the following spring and deceleration curves instead of linear or ease-in-out:

| Token Name | Cubic-Bezier Value | Purpose |
| :--- | :--- | :--- |
| `--ease-spring-pop` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Checkbox bouncy scale feedback |
| `--ease-apple-decel` | `cubic-bezier(0.32, 0.72, 0, 1)` | Card hovers, page transitions |
| `--ease-modal` | `cubic-bezier(0.16, 1, 0.3, 1)` | Modals entry slide |

### JavaScript Number Animation (`window.animateNumber`)
We expose a programmatic counter handler on the `window` object:
```javascript
/**
 * Smoothly interpolates an element's numeric textContent over 400ms.
 * @param {HTMLElement} element - The target element.
 * @param {number} targetValue - The target value to animate to.
 * @param {number} [duration=400] - Duration in ms.
 * @param {string} [format="int"] - Format style: "int", "float" (2 decimal places), or "currency".
 */
window.animateNumber = function(element, targetValue, duration = 400, format = "int") { ... }
```
*Note: Any element animated by this method MUST have `font-variant-numeric: tabular-nums` applied in CSS to prevent layout shaking during calculation frames.*

### CSS Keyframes & Style Specifications
```css
/* Checkbox Pop */
@keyframes checkboxPop {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}

/* Page Entrance (Fallback) */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Cursor Spotlight Hover (Finance/Gym Card Highlights) */
.spotlight-card {
  position: relative;
  overflow: hidden;
  transition: transform 0.4s var(--ease-apple-decel);
}
.spotlight-card:hover {
  transform: translateY(-4px);
}
.spotlight-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle 120px at var(--mouse-x, 0) var(--mouse-y, 0), rgba(255, 255, 255, 0.06), transparent 80%);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}
.spotlight-card:hover::before {
  opacity: 1;
}
```

---

## 3. File Changes

| File | Target Implementation / Modification |
| :--- | :--- |
| [topbar.js](file:///home/federico/Desktop/dashboard/topbar.js) | Inject CSS variables, keyframes, spotlight card structures, and `@media (prefers-reduced-motion: reduce)` overrides. Define `window.animateNumber`. |
| All HTML Files | Add `<meta name="view-transition" content="same-origin">` to `<head>`. |
| [index.html](file:///home/federico/Desktop/dashboard/index.html) | Apply `checkboxPop` keyframe to goals check events. Transition goal item to `opacity: 0.5` and `line-through`. Animate goals completion header text with `window.animateNumber`. |
| [finance.html](file:///home/federico/Desktop/dashboard/finance.html) | Add spotlight mousemove tracking. Integrate `window.animateNumber` for numeric log metrics. |
| [gym.html](file:///home/federico/Desktop/dashboard/gym.html) | Integrate counter updates for drink logging, weight logging, and log item counts. |
| [water.html](file:///home/federico/Desktop/dashboard/water.html) | Animate daily totals counter. |
| [weight.html](file:///home/federico/Desktop/dashboard/weight.html) | Animate weights log counters. |

---

## 4. Testing Strategy

1. **Accessibility (Reduced Motion)**: Turn on system-level "Reduce Motion" settings. Verify all animations resolve instantly with `0s` transition duration.
2. **Cross-Document View Transitions**: Navigate between pages in Chrome. Verify smooth fades and sliding elements. Navigate in Firefox; verify a clean opacity entrance fallback animation.
3. **Checklist Interactivity**: Toggle goals in the daily checklist. Verify bounce effect on checkboxes, smooth fade, and strike-through on goal items without page layout shifting.
4. **Spotlight Tracking & Card Lifts**: Move mouse over finance cards. Verify the cursor border tracking glow follows mouse position and card lifts 4px along the Y-axis.
5. **Dynamic Counter Testing**: Increment logging totals (gym, water, weight). Confirm counts roll smoothly from start to final value over exactly 400ms, using tabular-spaced numerals.
6. **Modal Entry & Exit**: Verify settings/logging modals slide up on trigger and complete exit animations before being hidden in DOM.
