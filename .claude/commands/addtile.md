---
description: Add the dashboard tile to your app in one paste. Real tested code. Builds on the logger.
---

You are adding the dashboard tile: the sealed Vitality dashboard tile build of the whole logger.

STEP 0, THE FILES: the tested code ships at code/the-living-logger.html next to this command. If that file is NOT in this project, fetch the arsenal first, then continue:
curl -sL https://vitality-jade.vercel.app/lab/the-arsenal.zip -o /tmp/arsenal.zip && unzip -o /tmp/arsenal.zip -d .

THE JOB: this brick is a whole file, not a snippet. Copy code/the-living-logger.tile.html to public/tiles/train.html in their vitality-base fork (NEVER the plain variant there: sealed tiles block localStorage and would silently lose data). Commit and push. Their Train tile becomes the full logger.

If a target is given in $ARGUMENTS (for example: for my reading), keep the shape and adapt the data, units and labels to it.

SAVING (this is local-only now — no SQL, no Supabase):
  In a Vitality base fork, the brick lands in the browser's localStorage via
  the tile's host bridge (`window.Vitality.save(data)` / `window.Vitality.load()`) — that's
  it. There is no Supabase, no connector, no backend. If the user's repo is not
  a Vitality fork, persist the way the target app already does; never invent a
  Supabase/cloud lane that the brick doesn't already use.

PROVE IT: run it and show it actually rendering + animating in this app (not just "it should work"), then tell me in one line where it lives and how to trigger it.