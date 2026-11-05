# The Math — how value is calculated and patterns are found

This is the mentor's arithmetic. Anyone with this dashboard gets the same
math; only the data is theirs. No AI key at runtime — Claude Code computes
at write time (when asked) and writes plain numbers; the board renders them.

## 1 · Value right now: the equation

Every tile reports one normalized input score for the day, x ∈ 0–100:

| tile    | x =                                               |
|---------|---------------------------------------------------|
| fuel    | min(100, water_today / goal × 100)                |
| train   | sessions_this_week / weekly_target × 100 (cap 100)|
| peak    | today's average predicted score                   |

| finance | on-plan ratio vs monthly target (cap 100)         |

Each tile carries a weight w toward the ACTIVE goal (weights sum to 100,
lib/tiles/weights.ts). The day's value:

    y = Σ (wᵢ · xᵢ) / 100        → one 0–100 number

That's the board: y on top, the weighted x's in the row.

## 2 · Value over time: progress

- Measurable goal (e.g. 185 lb lean):
      progress = (start − current) / (start − target) × 100
- Growth goal (e.g. famous YouTuber — pick ONE proxy metric, e.g. subs):
      progress = ln(current/start) / ln(target/start) × 100
  Log-scaled because growth is exponential: 1K→10K is the same-size step
  as 10K→100K.

The mentor writes `progress` into the goal; the bar renders it.

## 3 · Patterns: the noticing

Histories are append-only and time-stamped, so a pattern is just columns
lined up by date.

1. Build daily series per stream (water count, trained yes/no, sleep hours,
   views, …).
2. Correlate day-over-day CHANGES, not raw levels (a general uptrend must
   not fake a pattern).
3. Scan lags 0, 1, 2 days (yesterday's sleep → today's output). The
   strongest |r| names the direction.
4. Thresholds: |r| > 0.5 AND n ≥ 10 days → a real pattern. Write it to the
   noticed feed with the key words **bold**.
5. Under 10 days of data: say "still learning you." Never invent insight.

## 4 · Evidence retunes the weights

Weights start as interview priors. Every ~2 weeks, for each tile compute r
between its stream and the goal's proxy, then glide:

    wᵢ ← wᵢ + 0.2 × (rᵢ·100 − wᵢ)     then renormalize to Σw = 100

Never jump a weight; glide it. When a tile that had no weight shows real
signal, it ENTERS the goal (that's the seeded example: Train entered the
YouTuber goal at 8% because workouts predicted output).

## 5 · Sleep history

Sleep stores hours under the date the night began. Legacy Vitals records use
logging mornings, so Sleep imports each eligible record under the preceding
night without replacing an existing entry. The legacy store remains intact.
Peak does not derive recovery from these records.

## House rules

- One proxy metric per goal — more makes progress unfalsifiable.
- Append-only histories; the math never rewrites the past.
- Every Notice must trace back to numbers that exist in a tile's store.
- Show the work when asked: the mentor can print the r table any time.