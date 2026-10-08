# Mobile Dashboard Controls

## Objective
Make the existing dashboard usable on narrow iPhone and Android screens, with a readable opening equation and restrained interaction motion, without changing its product, data, or tile identities.

## Problem and scope
The 3-to-2-to-1 column grid already exists. The first two mobile fixes stopped clipped controls and restored touch reorder, but the opening equation still stacks duplicate long goal titles, a crowded picker, and a transient x summary above a tall Mentor hero. The user also requested GSAP motion and smoother transitions when opening content, pressing buttons, and changing pages. Existing native smooth scroll must be reused rather than replaced.

## Constraints and checks
- Preserve the localStorage key contract, iframe mount identity, existing desktop behavior, and pinch zoom.
- Authorized scope: main dashboard, existing shared route chrome, and their styles; GSAP is explicitly requested, but no other new dependency, Pelotazo UI, backend, remote operation, push, or PR.
- TDD: off (previous explicit project choice); runner: `pnpm build`. Check responsive behavior at 320, 375, and 430px where a browser is available; disclose unavailable device checks.
- Delivery: ask-on-risk; expected authored change under ~400 lines, advisory only. No PR is authorized.
- Route: delegated direct. Evidence: changes require reading layout and edit interactions across TSX and CSS; one writer handles both.

## Tasks
- [x] MOB-1: Make the goal picker and equation breakdown wrap/shrink without hiding actions. Status: implemented; `PATH="$HOME/.nvm/versions/node/v24.21.0/bin:$PATH" pnpm build`: passed. Browser checks at 320/375/430px pending (no local browser). Commit: `9ca47ef` (`fix(dashboard): keep goal controls within narrow screens`).
- [x] MOB-2: Give edit mode a usable touch reorder path while preserving page scroll and desktop drag behavior. Status: implemented using stepwise tap controls backed by the existing `moveTo` and `vitality:eq:order` path; `PATH="$HOME/.nvm/versions/node/v24.21.0/bin:$PATH" pnpm build`: passed. Tap/scroll/reorder browser checks pending (no local browser). Commit: `15831db` (`fix(dashboard): add scroll-safe tap reorder controls`).
- [x] MOB-3: Recompose the opening equation at phone widths: one legible goal, compact accessible selection, and persistent x summary with Edit reachable; keep desktop equation and Mentor identity. Status: implemented with a native details switcher for all goals, one visible active title, a 188px Mentor hero, and labeled persistent input weights; desktop presentation unchanged. `PATH="$HOME/.nvm/versions/node/v24.21.0/bin:$PATH" pnpm build`: passed; Node structural smoke check: passed. Runtime harness: N/A (no local browser); 320/375/430px visual, keyboard, and interaction checks pending. Rollback: revert this MOB-3 work unit (DashboardGrid.tsx, veeTiles.css, and this task evidence) without removing MOB-1/2. Commit: `fix(dashboard): clarify mobile equation hierarchy`.
- [ ] MOB-4: Add restrained GSAP motion for meaningful opening/navigation moments plus accessible button feedback; reuse native smooth scroll and honor reduced motion, preserving iframe bridge and route behavior. Check: build, route/open-close interactions and reduced-motion checks when available. Status: pending. Route: delegated direct (component and shared style changes).

## Acceptance
At 320–430px the main dashboard has a clear y → Mentor → x hierarchy with an accessible compact goal picker and persistent legible x summary; Edit stays reachable. Users can scroll and reorder tiles on touch screens without remounting their iframes. New animations do not hide content without JS and respect reduced-motion preference; navigation and opening content remain keyboard accessible. Each observed task closes with a Conventional Commit and check evidence.

## Progress
MOB-1, MOB-2, and MOB-3 implemented and build-verified; parent spot-check `pnpm build` passed for MOB-1/2. Native committed-range risk: medium (`under_budget`); RDD is off, so no review launched. MOB-4 pending. Manual 320/375/430px checks, including goal switching, Edit reachability, and edit-mode tap/scroll/reorder, pending. No browser available locally; no interactive runtime check. Engram mirror: `odd/mobile-dashboard-controls/tasks`.
