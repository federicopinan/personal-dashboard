#!/usr/bin/env bash
# WSL 2 + Node 24 + pnpm: the .bin/next file pnpm creates is a symlink, but
# Node 24 reads `__dirname` from the symlink's location rather than the
# target's, so the script's own `require("../server/require-hook")` walks
# up to `node_modules/` and fails to find the loader. Replacing the .bin/next
# symlink with a tiny shell wrapper that exec's the real script by absolute
# path sidesteps that.
#
# Crucially, this script must run in BASH, not in Node. Node 24 on this WSL
# distribution reports symlinks as EISDIR via lstatSync, so a Node-based
# detector can't see them — but bash's `ls -la` and `readlink` work fine.
#
# On non-WSL macOS/Linux, pnpm's symlink IS fine and this script is a no-op:
# it only patches .bin/next when (a) the file is a symlink and (b) it points
# at next/dist/bin/next exactly. Safe to run on every install.

set -e

target="node_modules/.bin/next"

# Bash sees a missing file correctly. pnpm hasn't created .bin/next yet on a
# first install — that's fine, the next install will create it and re-run
# this script.
[ -e "$target" ] || exit 0

# Bash's -L test follows the symlink; -h checks if it's a link. We want the
# link-itself check so the path below can read its target.
if [ ! -h "$target" ]; then
  exit 0
fi

link_target="$(readlink "$target")"

# Resolve to an absolute path so the wrapper can exec it directly, bypassing
# any symlink-resolution shenanigans downstream.
case "$link_target" in
  /*) real_script="$link_target" ;;
  *)  real_script="$(dirname "$target")/$link_target" ;;
esac

# Sanity check: only patch if the link actually points at the next CLI. If
# pnpm changes layout someday the script silently skips.
case "$real_script" in
  */next/dist/bin/next) ;;
  *) exit 0 ;;
esac

# Replace the symlink with a tiny shell wrapper. We can't use `mv` because
# `node_modules/.bin/` may be read-only on some installs; a copy followed
# by rm is the safe pattern.
wrapper="$(mktemp)"
cat > "$wrapper" <<EOF
#!/bin/sh
exec node "$real_script" "\$@"
EOF
chmod +x "$wrapper"

rm "$target"
mv "$wrapper" "$target"
