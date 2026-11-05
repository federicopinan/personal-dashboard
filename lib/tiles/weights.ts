/**
 * Goals + tile weights — the math of the equation, with NO AI key at runtime.
 *
 *   y = the Mentor (the overseer, where the math lives)
 *   x = each input tile · w = that tile's share of the ACTIVE goal
 *
 * Each goal carries its own weights (sum ≈ 100): "SOC analyst" leans on
 * finance/sleep; "jacked" leans on Train/Fuel. The row badges show the active
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
  /** The visible weights were edited after retiring the stored Vitals share. */
  retiredVitalsNormalized?: boolean
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
 * SCREEN arrived as a seventh input and was REBALANCED rather than extended:
 * seven inputs cannot share 100% with one appended to the old six, so the
 * numbers below were taken out of the inputs the new tile competes with. The
 * reasoning, so a later retune does not have to reverse-engineer it:
 *
 * - SCREEN is a COST, and it is the mentor's own stated reason for wanting the
 *   tile ("SOC + trading = you LIVE on screens"). So it earns its share from the
 *   goals whose work IS the screen: highest on trader, next on soc-analyst,
 *   lowest on jacked, where the screen is incidental to the goal.
 *
 * WATER is no longer a weight of its own. It was never a separate tile for long
 * — it was a separate id, tracking the same glasses the Fuel stub had always
 * tracked, and now it lives INSIDE fuel.html. So its share did not vanish: it
 * was folded into that goal's `fuel` weight, which is the tile that still
 * carries the number. That is why every goal below has one fewer input and the
 * same 100: the 2–6 points water used to hold are now inside fuel, and no other
 * tile moved by a single point.
 *
 * Saved goals keep their own weights; the retired Vitals share is removed and
 * the remaining shares are proportionally normalized for display.
 */
export const DEFAULT_GOALS: Goal[] = [
  {
    id: 'soc-analyst',
    title: 'SOC Blue Team analyst',
    accent: '#00D4FF',
    // screen 6 comes out of finance (which is where a screen-bound analyst
    // spends the time finance used to stand in for); the 2 water used to hold
    // sit in the same place, and are now inside fuel 6.
    weights: { train: 5, fuel: 7, sleep: 15, screen: 7, peak: 6, finance: 60 },
    progress: 5,
  },
  {
    id: 'jacked',
    title: 'Get jacked',
    accent: '#FF6B6B',
    // screen 2 (incidental here) is paid for by fuel, and so are the 6 water
    // used to hold — the one the mentor already listed as this goal's idea, and
    // the one hydration most overlaps. Both now sit in fuel 26.
    weights: { train: 49, fuel: 30, sleep: 14, screen: 2, peak: 5 },
    progress: 10,
  },
  {
    id: 'trader',
    title: 'Professional trader',
    accent: '#FFD700',
    // screen 8 is the highest anywhere, and out of finance: the screen IS the
    // trading desk, so screen time is the honest proxy finance was carrying.
    weights: { train: 4, fuel: 7, sleep: 8, screen: 9, peak: 5, finance: 67 },
    progress: 5,
  },
]

/** The overseer's synthesis of EVERY goal, polished into one sentence by the
 *  mentor (Claude Code). Switching it on = top priority — the board goes gold. */
const LEGACY_OVERALL_GOAL: Goal = {
  id: 'overall',
  title: "A SOC analyst who's jacked and trades",
  accent: '#00D4FF',
  // The synthesis, so screen lands between soc-analyst and trader; the 4 water
  // used to hold are now inside fuel 12, between overall and jacked.
  weights: { train: 19, fuel: 14, sleep: 12, screen: 7, peak: 6, finance: 42 },
  progress: 5,
}

export const OVERALL_GOAL: Goal = { id: 'overall', title: 'Your overall goal', weights: {} }

/** Overall first, then the individual goals. */
export function allGoals(): Goal[] {
  const list = goals()
  if (list.length === 0 && activeGoalId() !== OVERALL_GOAL.id) return list
  const legacy = list.some((goal) => DEFAULT_GOALS.some((item) => item.id === goal.id))
  return [legacy ? LEGACY_OVERALL_GOAL : OVERALL_GOAL, ...list]
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
  // the same reason — and the Water idea is gone for a second one besides:
  // hydration lives inside Fuel, so there is no separate water thing left to
  // ask for. What is left in this file is a list of what the board is
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
  return []
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

  // Use stored goals for writes so deleting one does not rewrite other goals.
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

// Original shipped values are read-only fallbacks for goals saved before these
// tiles existed. Never write them into the user's stored goal implicitly.
const LEGACY_WEIGHT_FALLBACKS: Record<string, Record<string, number>> = {
  'soc-analyst': { train: 4, fuel: 6, sleep: 12, screen: 6, peak: 5, finance: 48 },
  jacked: { train: 43, fuel: 26, sleep: 12, screen: 2, peak: 5 },
  trader: { train: 4, fuel: 6, sleep: 7, screen: 8, peak: 5, finance: 62 },
  overall: { train: 16, fuel: 12, sleep: 10, screen: 6, peak: 5, finance: 36 },
}

/** Remove the retired share at read time without rewriting saved goals. */
function normaliseGoals(list: Goal[]): Goal[] {
  return list.map((goal) => {
    if (!goal.weights || typeof goal.weights !== 'object') return goal
    const hasVitals = Object.prototype.hasOwnProperty.call(goal.weights, 'vitals')
    const { vitals: _retired, ...weights } = goal.weights
    if (Object.keys(goal.weights).length) {
      for (const [key, value] of Object.entries(LEGACY_WEIGHT_FALLBACKS[goal.id] ?? {})) {
        if (typeof weights[key] !== 'number' || !Number.isFinite(weights[key])) weights[key] = value
      }
    }
    if (!hasVitals || goal.retiredVitalsNormalized) return { ...goal, weights }
    const entries = Object.entries(weights).filter(([, value]) => typeof value === 'number' && Number.isFinite(value) && value >= 0)
    const total = entries.reduce((sum, [, value]) => sum + value, 0)
    if (total === 0) return { ...goal, weights: Object.fromEntries(entries) }
    const scaled = entries.map(([key, value]) => ({ key, value: value * 100 / total }))
    const rounded = scaled.map(({ value }) => Math.floor(value))
    let remainder = 100 - rounded.reduce((sum, value) => sum + value, 0)
    const order = scaled.map((item, index) => ({ index, fraction: item.value - rounded[index] })).sort((a, b) => b.fraction - a.fraction)
    for (const item of order) { if (remainder-- <= 0) break; rounded[item.index]++ }
    return { ...goal, weights: Object.fromEntries(scaled.map((item, index) => [item.key, rounded[index]])) }
  })
}

/** Save only edited settings, keeping raw weights for every untouched goal. */
export function saveGoalSettings(edited: Goal[], original: Goal[]): void {
  const raw = storedGoals()
  const next = raw.map((goal) => {
    const before = original.find((item) => item.id === goal.id)
    const after = edited.find((item) => item.id === goal.id)
    if (!before || !after) return goal
    const weightsChanged = JSON.stringify(before.weights) !== JSON.stringify(after.weights)
    const titleChanged = before.title !== after.title
    if (!weightsChanged && !titleChanged) return goal
    const result = { ...goal, ...(titleChanged ? { title: after.title } : {}) }
    if (weightsChanged) {
      const hasVitals = Object.prototype.hasOwnProperty.call(goal.weights, 'vitals')
      result.weights = { ...after.weights, ...(hasVitals ? { vitals: goal.weights.vitals } : {}) }
      if (hasVitals) result.retiredVitalsNormalized = true
    }
    return result
  })
  if (JSON.stringify(raw) !== JSON.stringify(next)) saveGoals(next)
}

/**
 * The goals exactly as stored. Use this for writes that do not edit weights,
 * so the read-time normalization does not rewrite unrelated goals.
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
  return []
}

/** All stored goals, with retired weights excluded from the displayed values. */
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
