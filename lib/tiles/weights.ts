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

export const DEFAULT_GOALS: Goal[] = [
  {
    id: 'soc-analyst',
    title: 'SOC Blue Team analyst',
    accent: '#00D4FF',
    weights: { train: 5, fuel: 5, vitals: 25, peak: 5, finance: 60 },
    progress: 5,
  },
  {
    id: 'jacked',
    title: 'Get jacked',
    accent: '#FF6B6B',
    weights: { train: 50, fuel: 30, vitals: 15, peak: 5 },
    progress: 10,
  },
  {
    id: 'trader',
    title: 'Professional trader',
    accent: '#FFD700',
    weights: { train: 5, fuel: 5, vitals: 10, peak: 5, finance: 75 },
    progress: 5,
  },
]

/** The overseer's synthesis of EVERY goal, polished into one sentence by the
 *  mentor (Claude Code). Switching it on = top priority — the board goes gold. */
export const OVERALL_GOAL: Goal = {
  id: 'overall',
  title: "A SOC analyst who's jacked and trades",
  accent: '#00D4FF',
  weights: { train: 20, fuel: 10, vitals: 20, peak: 5, finance: 45 },
  progress: 5,
}

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
  overall: [
    {
      word: 'Sleep',
      title: 'Sleep consistency',
      tracks: 'bedtime variance, night by night',
      why: 'Recovery is everything when you\'re grinding SOC by day, trading by night, and chasing gains.',
      estWeight: 8,
    },
    {
      word: 'Screen',
      title: 'Screen time',
      tracks: 'hours staring at screens vs sleep',
      why: 'SOC + trading = you LIVE on screens. Tracking it keeps the burnout away.',
      estWeight: 6,
    },
  ],
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
      word: 'Water',
      title: 'Water',
      tracks: 'daily intake vs target',
      why: 'The gym alone won\'t get you jacked. Water is the cheapest compound lift you\'re not tracking.',
      estWeight: 8,
    },
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

/** All goals: localStorage override ('vitality:goals') if valid, else defaults. */
export function goals(): Goal[] {
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
