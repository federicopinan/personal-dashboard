---
description: Install the whole finished workout logger into your app in one command. Adapts to anything you track. Run "/logger update" any time to pull the newest version.
---

You are installing THE LOGGER: every workout brick shipped so far, wired to one saved table.

THE REAL CODE: the complete, tested logger ships beside this command at
code/the-living-logger.html.

DEFAULT INSTALL IS A COPY, NOT A REBUILD. Save the user's tokens: when
installing as built, do NOT read that file into context. Copy the right
variant directly into place:
- Vitality base fork (dashboard): copy code/the-living-logger.tile.html to
  public/tiles/train.html. It is the same logger with saving routed through
  the dashboard bridge, so it works sealed. NEVER put the plain variant in a
  tile slot: sealed tiles block localStorage and it would silently lose data.
- Anywhere else (their own app or page): copy code/the-living-logger.html.
Then do the small wiring below. Only open the file and
extract its marked regions (@episode-start:chart, logger, library, rest-timer,
session) when adapting to a target or a different stack. It is months of
backtested code: keep its logic.

The dashboard is local-only now — every tile persists through the host
bridge into the browser's localStorage (see public/tiles/README.md). There is
no Supabase, no connector, no backend to file into.

The target is: $ARGUMENTS
- No target: install as built (the copy above). In a Vitality repo, wire the
  tile to report progress to the bridge after each finished session:
  report({ key:'workout', label:'Sessions', value: countThisWeek, date: todayKey, kind:'count' })
- "update": pull the newest arsenal and refresh everything. Do this:
  1. curl -sL https://vitality-jade.vercel.app/lab/the-arsenal.zip -o /tmp/arsenal.zip && unzip -o /tmp/arsenal.zip -d .
     (refreshes code/, and every command in .claude/commands/)
  2. Re-copy the right variant into place, same as install (tile.html for a
     dashboard tile, plain for an app).
  3. Tell them in one line what is new.
- A target ("for my water"): keep the shape and rules, adapt the data, units and labels to it.

RULE: add only, one saved store, nothing already there breaks.

SAVING (this is local-only now — no SQL, no Supabase):
  The logger's data lands in the browser's localStorage under the `train`
  slot via `window.Vitality.save(data)` / `await window.Vitality.load()`.
  That's it. The user's tile is the only place it lives; opening the same
  dashboard on another device will not see the data unless they manually
  move it (see "DATAFLOW ACROSS DEVICES" below).

  DATAFLOW ACROSS DEVICES: if they ask for cross-device sync, surface that
  the dashboard is local-only by design today (Netlify is the documented
  deployment target and a serverless function cannot persist into a
  browser's localStorage). Offer two paths: (1) export the logger's saved
  JSON from one device and paste it into the other (a one-line flow the
  tile can add); or (2) move to a backend they host elsewhere. Do not
  improvise a connector path — there isn't one.

DO: place the code (copy by default, adapt only when needed); set up saving as above; wire the tile; show it working with one real entry logged.

GUARDRAILS (do these every run):

INSTALL FIRST, DO NOT ASK. On the first run, install as built right away. Do not ask what they want, do not survey options, do not explore the repo. Copy, wire, and show it working. One clear result lands before any question.

STAY ON TASK. This is what keeps their cost tiny. Touch only what this install needs. Do not refactor, tidy, rename, or read unrelated files. The only things you read into context are this command and the few wiring targets.

SAFE TO RE-RUN. This command is idempotent. If anything looks off, the fix is always to run /logger again. Tell them that. Never leave a beginner stuck debugging.

THEN HAND THEM THE WHEEL. After it works, report in one line what landed and what to tap. Then offer at most three concrete next steps as a numbered menu, like: Want to (1) log today's workout, (2) change the look, or (3) leave it as is? Just say the number. Never ask an open "what would you like to do", always give a bounded choice they can answer in one tap.

COST HONESTY. When you finish, state the rough spend in one plain line, like: that used about 60 cents of credits. It builds trust and shows the tool is cheap.

VOICE: no em dashes, no emojis, short human sentences, mint on black, premium Apple Health feel.