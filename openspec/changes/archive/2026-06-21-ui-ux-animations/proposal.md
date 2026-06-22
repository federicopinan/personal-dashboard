# Proposal: Premium UI/UX Animations

## Intent

Elevate the personal dashboard to a high-end visual build by introducing fluid transitions, physics-based micro-interactions, and visual feedback, while respecting accessibility constraints and preserving the dark/terminal aesthetic.

## Scope

### In Scope
- Smooth checkbox pop animations and transition animations to lower opacity + line-through for completed goals.
- Multi-page transition support using the Cross-Document View Transitions API (CSS fade-in fallback).
- Smooth count-up/count-down number animations (400ms duration, tabular-nums) for logged values.
- GPU-safe card hover lift, spotlights, and modal transitions (fade/translate).
- Comprehensive `prefers-reduced-motion` CSS overrides.

### Out of Scope
- Physical accessibility toggle buttons (rely strictly on system media queries).
- Refactoring the core storage (`localStorage`) or logical handlers.
- Adding third-party UI framework components (e.g. React/Tailwind).

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- None

## Approach

- Add a shared utility stylesheet (`animations.css` or direct CSS variables/keyframes in index.css) containing custom spring ease Bezier transitions and the page entrance animations.
- Integrate Cross-Document View Transitions by adding meta/link headers or script hooks to handle unsupported browsers gracefully.
- Write a shared numeric interpolation function in `app.js` or separate script linked by files.
- Apply subtle transform and opacity animations to form checkboxes, modals, list edits, and card hovers.

## Affected Areas

| Area | Impact | Description |
| :--- | :--- | :--- |
| `index.html` | Modified | Add view transition tags, layout shift adjustments, bouncy checkboxes, styling. |
| `finance.html` | Modified | Integrate number counter, view transitions, card lifts. |
| `gym.html` | Modified | Animate list entries, water/weight log counters. |
| `water.html` | Modified | Add smooth drink counters. |
| `weight.html` | Modified | Integrate counters. |
| `topbar.js` | Modified | Add smooth navigational highlighting. |

## Risks

| Risk | Likelihood | Mitigation |
| :--- | :--- | :--- |
| Performance degradation from animations. | Low | Limit animations strictly to GPU-accelerated properties (`transform`, `opacity`). |
| Jumpy page loads in unsupported browsers. | Low | Use standard CSS opacity fade fallbacks for unsupported View Transitions. |
| Text shaking during counts. | Low | Lock font styling to `tabular-nums`. |

## Rollback Plan

- Revert the files to their pre-animations commit state using Git (`git restore` or `git checkout`). No database or backend migrations are affected.

## Dependencies

- None (pure HTML/CSS/JS without build steps).

## Success Criteria

- [ ] View Transitions work smoothly on Chrome/Safari 17.4+; degrades to fade fallback on others.
- [ ] All animated items adapt instantly to static presentation under `prefers-reduced-motion: reduce`.
- [ ] Numeric increments transition smoothly over exactly 400ms without layout text jitter.
- [ ] Completed list items animate via checkbox scale-pop and fade to 50% opacity / line-through instead of shifting layout.
