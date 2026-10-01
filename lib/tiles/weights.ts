/**
 * Goals + tile weights — the math of the equation, with NO AI key at runtime.
 *
 *   y = the Mentor (the overseer, where the math lives)
 *   x = each input tile · w = that tile's share of the ACTIVE goal
 *
 * Each goal carries its own weights (sum ≈ 100): "SOC analyst" leans on
 * finance/vitals; "jacked" leans on Train/Fuel. The row badges show the active
 * goal's weights; the Mentor lists every goal with its full breakdown.
 *
 * WHO DOES THE MATH: Claude Code, at build time — not an Anthropic key, not
 * you by hand. In VS Code, say:
 *
 *   "My goals are X and Y. Open lib/tiles/weights.ts and re-run the math:
 *    for each goal, weigh how much each tile's input actually moves it
 *    (ask me questions if you need to). Each goal's weights sum to 100."
 *
 * Claude reasons, edits DEFAULT_GOALS, you reload. Later it can also
 * cross-reference your real tile data (video published vs workouts, water,
 * caffeine) and retune from evidence. A localStorage override
 * ('vitality:goals') wins over these defaults, so the connector or a goals
 * UI can retune without a code change.
 */

export interface Goal {
  id: string
  title: string
  /** tile slot -> % of this goal (sums to ~100) */
  weights: Record<string, number>
  /** true while the mentor (Claude Code) hasn't shaped + weighed it yet */
  pending?: boolean
  /** each goal tints the board a little; the overall goal goes gold */
  accent?: string
  /** how far you've come, 0–100 — computed by the mentor from data sweeps
   *  (analytics, manual logs, wearables), never guessed by the app */
  progress?: number
}

/** One observation the mentor pushed after scanning your data, with any
 *  weight changes it made because of what it found. */
export interface Notice {
  id: string
  when: string
  text: string
  /** bullet points; **bold** marks the highlighted words */
  points?: string[]
  deltas?: { tile: string; from: number; to: number }[]
}

/**
 * The shipped weights, per goal.
 *
 * SCREEN and WATER arrived together, and every goal was REBALANCED rather than
 * extended: eight inputs cannot share 100% with two appended to the old six, so
 * the numbers below were taken out of the inputs each new tile competes with.
 * The reasoning, so a later retune does not have to reverse-engineer it:
 *
 * - SCREEN is a COST, and it is the mentor's own stated reason for wanting the
 *   tile ("SOC + trading = you LIVE on screens"). So it earns its share from the
 *   goals whose work IS the screen: highest on trader, next on soc-analyst,
 *   lowest on jacked, where the screen is incidental to the goal.
 * - WATER is small everywhere. It is a background input: real, cheap to log, and
 *   not what any of these three goals is actually about. It is worth the most
 *   where recovery is already being watched (jacked, overall) and least where
 *   the goal is measured in hours at a screen.
 *
 * A saved goal gets both keys filled in automatically (withShippedWeights only
 * fills ABSENT keys), but its OTHER weights stay exactly as the user last set
 * them — a stored goal is not retroactively rescaled by this table, and one
 * should not be: the mentor retunes the user's own numbers, not this file.
 */
export const DEFAULT_GOALS: Goal[] = [
  {
    id: 'soc-analyst',
    title: 'SOC Blue Team analyst',
    accent: '#00D4FF',
    // screen 6, water 2 come out of finance (which is where a screen-bound
    // analyst spends the time finance used to stand in for).
    weights: { train: 4, fuel: 4, vitals: 19, sleep: 12, screen: 6, water: 2, peak: 5, finance: 48 },
    progress: 5,
  },
  {
    id: 'jacked',
    title: 'Get jacked',
    accent: '#FF6B6B',
    // screen 2 (incidental here), water 6 (recovery-adjacent, and the one the
    // mentor already listed as this goal's idea) — paid for by fuel, the input
    // hydration most overlaps.
    weights: { train: 43, fuel: 20, vitals: 12, sleep: 12, screen: 2, water: 6, peak: 5 },
    progress: 10,
  },
  {
    id: 'trader',
    title: 'Professional trader',
    accent: '#FFD700',
    // screen 8 is the highest anywhere, and out of finance: the screen IS the
    // trading desk, so screen time is the honest proxy finance was carrying.
    weights: { train: 4, fuel: 4, vitals: 8, sleep: 7, screen: 8, water: 2, peak: 5, finance: 62 },
    progress: 5,
  },
]

/** The overseer's synthesis of EVERY goal, polished into one sentence by the
 *  mentor (Claude Code). Switching it on = top priority — the board goes gold. */
export const OVERALL_GOAL: Goal = {
  id: 'overall',
  title: "A SOC analyst who's jacked and trades",
  accent: '#00D4FF',
  // The synthesis, so screen lands between soc-analyst and trader, and water
  // between overall and jacked.
  weights: { train: 16, fuel: 8, vitals: 15, sleep: 10, screen: 6, water: 4, peak: 5, finance: 36 },
  progress: 5,
}

/** Every tile that ships with a weight in the defaults. A saved goal that
 *  predates one of these gets the shipped value back — see withShippedWeights. */
const SHIPPED_TILE_KEYS: string[] = Object.keys(OVERALL_GOAL.weights)

/** Overall first, then the individual goals. */
export function allGoals(): Goal[] {
  return [OVERALL_GOAL, ...goals()]
}

/** The full active Goal (incl. overall), for accent + title. */
export function activeGoal(): Goal | undefined {
  const id = activeGoalId()
  return allGoals().find((g) => g.id === id) ?? goals()[0]
}

export const DEFAULT_NOTICED: Notice[] = [
  {
    id: 'n-fresh-start',
    when: 'today',
    text: 'Fresh start — new goals, clean board. SOC analyst, jacked, trader. We\'ll tune the weights as data rolls in.',
    points: [
      'New goals: **SOC analyst**, **jacked**, **trader**',
      '**Brand is gone** — all the weight shifted to what moves the needle',
      'Let\'s get to work',
    ],
    deltas: [],
  },
]

/** A blueprint for a tile they SHOULD have — a gap the mentor found between
 *  their goal and what their tiles actually track. Pre-written by the mentor
 *  (Claude Code) from their data; localStorage 'vitality:ideas' overrides. */
export interface TileIdea {
  /** ONE word — how the idea shows up in the popup (the mentor picks it) */
  word?: string
  title: string
  /** what the tile tracks, in one line */
  tracks: string
  /** why it moves THIS goal — tied to their data when possible */
  why: string
  /** the weight it would likely earn (≈ %) */
  estWeight: number
}

export const DEFAULT_IDEAS: Record<string, TileIdea[]> = {
  // No Sleep idea here any more: the Sleep tile ships with the board, so
  // suggesting it would be the mentor asking for something you already have.
  // Same for the two that arrived with it. The Screen idea used to sit here and
  // the Water idea sat under `jacked`; both tiles now ship, so both are gone for
  // the same reason. What is left in this file is a list of what the board is
  // STILL missing — that is the whole job of it, and a gap the user has since
  // closed is not a gap any more. `overall` is kept as an empty array rather than
  // deleted so tileIdeas' `?? DEFAULT_IDEAS.overall` fallback still resolves to
  // an array for an unknown goal id instead of changing what it returns.
  overall: [],
  'soc-analyst': [
    {
      word: 'Labs',
      title: 'Home lab hours',
      tracks: 'hours spent on labs, certs, hack-the-box',
      why: 'Blue Team is a craft. Lab time is the single biggest lever outside the SOC.',
      estWeight: 25,
    },
    {
      word: 'Study',
      title: 'Study streak',
      tracks: 'daily cybersecurity study streak',
      why: 'Certs, tools, log analysis — every day compounds.',
      estWeight: 20,
    },
  ],
  jacked: [
    {
      word: 'Steps',
      title: 'Steps / NEAT',
      tracks: 'daily movement outside the gym',
      why: 'Gains happen at the table and between sessions. Train sees workouts; nothing sees the other 23 hours.',
      estWeight: 7,
    },
  ],
  trader: [
    {
      word: 'Journal',
      title: 'Trade journal',
      tracks: 'trades + emotions + lessons',
      why: 'Your edge is in the data. A journal turns every trade into a lesson.',
      estWeight: 15,
    },
    {
      word: 'Study',
      title: 'Market study',
      tracks: 'hours studying charts, news, strategies',
      why: 'Professional trading is a skill. Daily study sharpens the edge.',
      estWeight: 10,
    },
  ],
}

/** The mentor's tile recommendations for a goal (localStorage override wins). */
export function tileIdeas(goalId: string): TileIdea[] {
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem('vitality:ideas')
      if (raw) {
        const o = JSON.parse(raw)
        if (o && typeof o === 'object' && Array.isArray(o[goalId])) return o[goalId] as TileIdea[]
      }
    } catch {
      /* fall through */
    }
  }
  return DEFAULT_IDEAS[goalId] ?? DEFAULT_IDEAS.overall ?? []
}

/** The mentor's noticed feed: localStorage override, else the seeded example.
 *  Claude Code (or the connector) writes 'vitality:noticed' after a scan. */
export function noticedFeed(): Notice[] {
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem('vitality:noticed')
      if (raw) {
        const o = JSON.parse(raw)
        if (Array.isArray(o)) return o as Notice[]
      }
    } catch {
      /* fall through */
    }
  }
  return DEFAULT_NOTICED
}

/** Save the goals list (used by the mentor page's goal input). */
export function saveGoals(list: Goal[]): void {
  try {
    window.localStorage.setItem('vitality:goals', JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

/** What a delete actually did, so the UI can say something true about it. */
export interface DeleteResult {
  /** false when nothing was removed — the id is the overall goal, or no such goal */
  removed: boolean
  /** true when 'vitality:goal:active' had to be rewritten to stay real */
  activeRepaired: boolean
  /** the id the board is on now */
  activeId: string
}

/**
 * Delete a stored goal, and repair the active-goal pointer if it named it.
 *
 * THIS IS THE ONE IRREVERSIBLE WRITE IN THE FILE. A weight like `finance: 60`
 * exists ONLY inside its own goal's object — there is no cross-goal index and no
 * tombstone — so deleting the goal destroys those numbers for good. Callers are
 * expected to confirm first; this function does not decide that for them.
 *
 * OVERALL_GOAL is a code constant rather than a stored goal, so there is in
 * fact nothing of it to delete. It is refused by id anyway instead of leaning on
 * that accident, so a stored goal that happens to be called 'overall' cannot be
 * quietly mistaken for the main one either.
 *
 * The pointer is repaired here rather than left for `activeGoal()`'s
 * `?? goals()[0]`, because that fallback only fixes the RENDER: the stale id
 * stays on disk, so the next write that trusts it (Dashboard's save, or the
 * mentor switching goals) re-activates a goal that is gone.
 *
 * The replacement is the first goal left in the list — the same answer
 * `activeGoalId()` already gives when nothing is stored, so "nothing is
 * selected" and "the selected goal was just deleted" resolve to ONE rule rather
 * than two, and nothing on screen moves at the moment of the delete. When the
 * last stored goal goes, it falls to OVERALL_GOAL rather than to '': that is the
 * one goal that can never be removed, so the pointer always names a real goal
 * and the board still has an equation to show.
 *
 * The repair runs even when `id` matched nothing. A pointer left dangling by an
 * earlier session is exactly the state this function exists to clean up, and
 * refusing a no-op delete is no reason to leave the lie in place.
 *
 * An unreadable 'vitality:goals' is treated as the defaults, because that is what
 * `storedGoals()` — and therefore what the mentor was showing when the ✕ was
 * clicked — already did. Deleting from that list writes the filtered defaults
 * back, which also repairs the corrupt payload. Every other write in the app
 * (Dashboard's save, the mentor's add) normalises the same way, so this is not a
 * new behaviour; a delete cannot be the one save that fails.
 */
export function deleteGoal(id: string): DeleteResult {
  const current = activeGoalId()
  if (id === OVERALL_GOAL.id) return { removed: false, activeRepaired: false, activeId: current }

  // storedGoals(), not goals(): this is a WRITE, and goals() fills in weights
  // the saved file is missing for display only. Re-saving the list through it
  // would persist a weight the user never chose.
  const stored = storedGoals()
  const next = stored.filter((g) => g.id !== id)
  const removed = next.length !== stored.length
  if (removed) saveGoals(next)

  const stillThere = current === OVERALL_GOAL.id || next.some((g) => g.id === current)
  if (stillThere) return { removed, activeRepaired: false, activeId: current }

  const replacement = next[0]?.id ?? OVERALL_GOAL.id
  setActiveGoalId(replacement)
  return { removed, activeRepaired: true, activeId: replacement }
}

/**
 * The shipped weight for one tile, as a last resort for a goal that is missing
 * the key. Read from DEFAULT_GOALS/OVERALL_GOAL by goal id, so the number comes
 * from the same table the defaults do — never invented here.
 */
function shippedWeight(goalId: string, tileKey: string): number | undefined {
  const from = (g?: Goal) => (g && g.weights && tileKey in g.weights ? g.weights[tileKey] : undefined)
  const inDefaults = DEFAULT_GOALS.find((g) => g.id === goalId)
  return from(inDefaults) ?? (OVERALL_GOAL.id === goalId ? from(OVERALL_GOAL) : undefined)
}

/**
 * Fill in the weights a saved goal predates, WITHOUT touching the stored object.
 *
 * A goal saved before a tile existed has no key for it, and `weights.sleep ?? 0`
 * then renders a 0% badge on that tile and starts the settings slider at 0 — the
 * tile reads as broken to exactly the people with the most data behind it.
 *
 * Read path, not a migration, on purpose. Writing back would mutate the user's
 * own saved file, which the mentor, /sweep or a second tab may also be editing;
 * a one-time marker would need its own key, would silently drop a weight if it
 * ever ran twice, and could not repair a goal cleared after it ran. This runs
 * on every read instead, costs one object build, and the file on disk is never
 * written — the fallback only ever applies to keys that are ABSENT.
 *
 * A weight the user DID set is never touched, including an explicit 0:
 * `typeof x === 'number'` is the test, so 0 stays 0 and only a missing key is
 * filled. A stored weight that is not a number is not a setting either, and is
 * treated as absent.
 */
function withShippedWeights(goal: Goal): Goal {
  const w = goal.weights as Record<string, unknown>
  if (!w || typeof w !== 'object') return goal
  // A stored value is kept only if it is a real number. `train: 'lots'` is not
  // a setting, and rendering it as a badge is worse than falling back.
  const fill: Record<string, number> = {}
  for (const [tileKey, value] of Object.entries(w)) {
    if (typeof value === 'number' && Number.isFinite(value)) fill[tileKey] = value
  }
  // A goal's own key set is the source of truth for what it tracks, so a brand
  // new goal (`weights: {}`, still pending) is left empty. Only a goal that
  // already carries weights gets the shipped values back — that is the
  // pre-move signature, and it is what separates "saved before Sleep existed"
  // from "freshly created, nothing chosen yet".
  if (Object.keys(fill).length === 0) return goal
  let added = 0
  for (const key of SHIPPED_TILE_KEYS) {
    if (key in fill) continue // the user set it, even if they set it to 0
    const fallback = shippedWeight(goal.id, key)
    if (typeof fallback === 'number') {
      fill[key] = fallback
      added++
    }
  }
  // Nothing absent and nothing corrupt: hand back the very same object, so a
  // fully-specified goal does not churn its identity on every render.
  if (added === 0 && Object.keys(fill).length === Object.keys(w).length) return goal
  return { ...goal, weights: fill }
}

/**
 * Every goal with its absent weights filled in from the shipped defaults.
 * `goals()` is the single read path for the whole app (badges, the Mentor
 * breakdown, the settings sliders), so doing it there fixes all of them.
 */
function normaliseGoals(list: Goal[]): Goal[] {
  return list.map(withShippedWeights)
}

/**
 * The goals EXACTLY as stored, with no read-path fill. Any WRITE path must use
 * this, so re-saving the list cannot quietly bake a filled-in weight into the
 * user's file — a weight they never chose would become indistinguishable from
 * one they did.
 */
export function storedGoals(): Goal[] {
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem('vitality:goals')
      if (raw) {
        const o = JSON.parse(raw)
        if (Array.isArray(o) && o.every((g) => g && typeof g.id === 'string' && g.weights)) return o as Goal[]
      }
    } catch {
      /* fall through */
    }
  }
  return DEFAULT_GOALS
}

/** All goals: localStorage override ('vitality:goals') if valid, else defaults,
 *  with any weight a saved goal predates filled in from the shipped defaults. */
export function goals(): Goal[] {
  return normaliseGoals(storedGoals())
}

/** The active goal id (persisted). Defaults to the first goal. */
export function activeGoalId(): string {
  if (typeof window !== 'undefined') {
    try {
      const v = window.localStorage.getItem('vitality:goal:active')
      if (v) return v
    } catch {
      /* fall through */
    }
  }
  return goals()[0]?.id ?? ''
}

export function setActiveGoalId(id: string): void {
  try {
    window.localStorage.setItem('vitality:goal:active', id)
  } catch {
    /* ignore */
  }
}

/** The active goal's weights (the badges on the row read these). */
export function tileWeights(): Record<string, number> {
  return activeGoal()?.weights ?? {}
}
