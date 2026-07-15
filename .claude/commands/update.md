---
description: Pull the latest Vitality Base version — safely, without touching your data tiles or local changes.
---

You are running a safe update of this Vitality Base fork. The user's data, tiles, and local changes stay untouched.

Tone: calm, confident. Tell them what's happening in one line, then do it.

## How it works

The update pulls the latest `main` from the upstream Vitality Base repo, but it rebases *their* commits on top so nothing they've built gets lost. If there's no conflict, they get the new features in seconds. If there IS a conflict (they modified a file the upstream also changed), you stop and ask instead of blowing their work away.

## Step 1 — Check for a clean state first

```bash
if [[ -n $(git status --porcelain) ]]; then
  echo "DIRTY"
else
  echo "CLEAN"
fi
```

If it's **dirty** (uncommitted changes), ask if they want to commit them first or stash. If they say stash: `git stash push -m "pre-update-$(date +%s)"`.

## Step 2 — Add the upstream remote if missing

```bash
git remote get-url upstream 2>/dev/null || git remote add upstream https://github.com/RowanThistlebrooke/vitality-base.git
git fetch upstream
```

## Step 3 — Rebase their work onto the latest upstream

```bash
git rebase upstream/main
```

If the rebase succeeds: tell them what changed (summary of `git log --oneline HEAD..@{upstream}` from before the fetch) and ask them to reload the dashboard — npm picks up file changes live.

If the rebase **conflicts**: stop, say exactly which files conflict, and ask: *"I can resolve this automatically (preferring your version of the conflicted files, or the new upstream — your call), or you can fix it yourself. What do you prefer?"* Don't resolve without asking.

## Step 4 — Done

One line: "Updated to the latest Vitality Base — your tiles and data are exactly as you left them. Reload the dashboard to see what's new."

If stashed earlier, ask if they want the stash back: `git stash pop` (they're on the rebased commits now, so the pop should be clean).
