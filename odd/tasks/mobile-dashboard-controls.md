# Mobile Dashboard Controls

## Objective
Make the existing dashboard usable on narrow iPhone and Android screens without changing its product, data, or tile identities.

## Problem and scope
The 3-to-2-to-1 column grid already exists. The main goal picker and equation breakdown can clip at phone widths; edit-mode tile dragging has no touch path and disables touch scrolling. Correct these existing controls, not the separate Tasks route or a redesign.

## Constraints and checks
- Preserve the localStorage key contract, iframe mount identity, existing desktop behavior, and pinch zoom.
- Authorized scope: main dashboard and its existing styles; no Pelotazo UI, backend, new dependency, remote operation, push, or PR.
- TDD: off (previous explicit project choice); runner: `pnpm build`. Check responsive behavior at 320, 375, and 430px where a browser is available; disclose unavailable device checks.
- Delivery: ask-on-risk; expected authored change under ~400 lines, advisory only. No PR is authorized.
- Route: delegated direct. Evidence: changes require reading layout and edit interactions across TSX and CSS; one writer handles both.

## Tasks
- [x] MOB-1: Make the goal picker and equation breakdown wrap/shrink without hiding actions. Status: implemented; `PATH="$HOME/.nvm/versions/node/v24.21.0/bin:$PATH" pnpm build`: passed. Browser checks at 320/375/430px pending (no local browser). Commit: `9ca47ef` (`fix(dashboard): keep goal controls within narrow screens`).
- [x] MOB-2: Give edit mode a usable touch reorder path while preserving page scroll and desktop drag behavior. Status: implemented using stepwise tap controls backed by the existing `moveTo` and `vitality:eq:order` path; `PATH="$HOME/.nvm/versions/node/v24.21.0/bin:$PATH" pnpm build`: passed. Tap/scroll/reorder browser checks pending (no local browser). Work unit: `fix(dashboard): add scroll-safe tap reorder controls`.

## Acceptance
At 320–430px the main dashboard has no clipped goal labels or inaccessible Edit button; users can scroll and reorder tiles on touch screens without remounting their iframes. Each observed task closes with a Conventional Commit and check evidence.

## Progress
MOB-1 and MOB-2 implemented and build-verified. Manual 320/375/430px checks, including edit-mode tap/scroll/reorder, pending. No browser available locally; no interactive runtime check. Engram mirror: `odd/mobile-dashboard-controls/tasks`.
