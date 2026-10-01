'use client'

import { useEffect, useRef, useState } from 'react'
import WelcomeBackdrop from '@/components/WelcomeBackdrop'
import DashboardHeaderGem from '@/app/app/DashboardHeaderGem'
import { CORE_TILES } from '@/lib/tiles/coreTiles'
import {
  allGoals,
  activeGoalId,
  setActiveGoalId,
  storedGoals,
  saveGoals,
  deleteGoal,
  noticedFeed,
  tileIdeas,
  type Goal,
} from '@/lib/tiles/weights'

/**
 * The Mentor — the equation, minimal. When the mentor is clicked everything
 * else fades away and this remains:
 *
 *        ───────── ai mentor ─────────      (top centre, big, animated in)
 *            [ pick your goal ]             (easy in and out)
 *        x% + x% + x% + x%                  (the tiles, no borders, rolling)
 *        results · progress · advice = y    (the bottom line)
 *
 * Every number is DATA, pre-written by the mentor (Claude Code) from data
 * sweeps — analytics, manual logs, wearables. The app never guesses.
 */

const label = (tile: string) => CORE_TILES[tile as keyof typeof CORE_TILES]?.label ?? tile

/* ── a number that rolls like a ticker ── */
function Roll({ value, color, size }: { value: number; color: string; size: number }) {
  const [shown, setShown] = useState(value)
  const prev = useRef(value)
  useEffect(() => {
    const from = prev.current
    prev.current = value
    if (from === value) return
    const t0 = performance.now()
    const dur = 900
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur)
      const e = 1 - Math.pow(1 - p, 3)
      setShown(Math.round(from + (value - from) * e))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return (
    <span
      style={{
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: size,
        fontWeight: 300,
        fontVariantNumeric: 'tabular-nums',
        color,
        textShadow: `0 0 30px ${color}55`,
        transition: 'color .8s ease, text-shadow .8s ease',
      }}
    >
      {shown}%
    </span>
  )
}

export default function MentorPage({
  overlay = false,
  onClose,
}: {
  /** true when the mentor "comes alive" over the board (no page load) */
  overlay?: boolean
  onClose?: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [list, setList] = useState<Goal[]>([])
  const [active, setActive] = useState('')
  const [draft, setDraft] = useState('')
  const [ideasOpen, setIdeasOpen] = useState(false) // the +: blueprints for tiles you're missing
  const [removing, setRemoving] = useState(false) // "manage" mode: pills grow a delete ✕
  const [pendingDelete, setPendingDelete] = useState<Goal | null>(null) // the confirm, if one is open
  const [draftError, setDraftError] = useState('') // why a goal was NOT added, in the composer's own words
  const gemRef = useRef<HTMLDivElement | null>(null)
  // Focus goes HERE on open and comes back here on close, so a confirm can never
  // strand the keyboard on a pill that no longer exists. The cancel button is
  // the landing spot: the destructive one must never be where focus starts.
  const confirmRef = useRef<HTMLButtonElement | null>(null)
  const deleteReturnRef = useRef<HTMLButtonElement | null>(null)
  const pillRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  // Read both keys, always together, from one place — the mentor can be alive
  // OVER the board, where the settings sheet and the board are live readers of
  // the same two keys, and a delete has to land on every one of them.
  const refresh = () => {
    setList(allGoals())
    setActive(activeGoalId())
  }

  useEffect(() => {
    setMounted(true)
    refresh()
  }, [])

  // The board and the settings sheet write the goals and announce it on this bus.
  // MentorPage is the one surface that could go stale, because it seeds its list
  // once and then only refreshes after its own writes.
  useEffect(() => {
    const onGoal = () => refresh()
    window.addEventListener('vitality:goal', onGoal)
    return () => window.removeEventListener('vitality:goal', onGoal)
  }, [])

  // Focus enters the confirm on Cancel, and leaves on EVERY close path (Escape,
  // scrim, Keep it, Delete it), so a keyboard user starts on the safe button and
  // is returned to the control they came from. Driven by the state change rather
  // than the click handler, so it holds however the dialog was opened.
  useEffect(() => {
    if (pendingDelete) confirmRef.current?.focus()
  }, [pendingDelete])

  // Escape closes the confirm from anywhere on the page while it is open. A
  // window listener rather than onKeyDown on the dialog, because there is
  // deliberately no focus trap here — Tab can walk out of the confirm, and once
  // it has, an onKeyDown scoped to the dialog would stop hearing Escape.
  useEffect(() => {
    if (!pendingDelete) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setPendingDelete(null)
      pillRefs.current[pendingDelete.id]?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pendingDelete])

  // Pulse the gem when the goal changes — WAAPI on the wrapper, NO remount.
  // (Remounting would re-init the WebGL gem: heavy, and it visibly glitches.)
  useEffect(() => {
    const el = gemRef.current
    if (!el || !active) return
    const s = active === 'overall' ? 1.16 : 1
    el.animate(
      [
        { transform: `scale(${s * 0.92})` },
        { transform: `scale(${s * 1.12}) rotate(-3deg)` },
        { transform: `scale(${s})` },
      ],
      { duration: 750, easing: 'cubic-bezier(.34,1.56,.64,1)' },
    )
  }, [active])

  if (!mounted) return null

  const act = list.find((g) => g.id === active) ?? list[0]
  const accent = act?.accent ?? '#6EE7B7'
  // A weight the board cannot show is not part of the equation. A goal saved
  // while a tile existed keeps that tile's key forever (withShippedWeights only
  // fills absent keys, it never strips present ones), so a retired id would
  // otherwise render a row for a tile that is not on the board. Filtered here
  // rather than by rewriting the user's file: a stale key on disk is harmless,
  // a phantom term in the equation is not.
  const entries = Object.entries(act?.weights ?? {})
    .filter(([tile]) => tile in CORE_TILES)
    .sort((a, b) => b[1] - a[1])
  const advice = noticedFeed()[0]

  // Announce on the bus after every write, not just the delete: the board's
  // goal row, the settings sheet and this page are three readers of the same two
  // keys, and the bus is the only thing that reaches all of them. Without it a
  // goal switched HERE left the board rendering the old title, accent and badges.
  const announce = () => {
    try {
      window.dispatchEvent(new CustomEvent('vitality:goal'))
    } catch {
      /* ignore */
    }
  }

  const switchGoal = (id: string) => {
    setActiveGoalId(id)
    setActive(id)
    announce()
  }

  const addGoal = () => {
    const raw = draft.trim()
    if (!raw) return
    // Trimming the slug before slicing matters: "Get jacked!" and "Get jacked?"
    // both slugs to the same id, and a row of two identical React keys is a
    // warning today and an ambiguous delete tomorrow.
    const id = 'g-' + raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24)
    if (storedGoals().some((g) => g.id === id)) {
      setDraftError('That one is already on the board — a different title, or a weight to change.')
      return
    }
    // storedGoals(), not goals(): this is a WRITE, and goals() fills in weights
    // the saved file is missing for display only. Re-saving the list through it
    // would persist a weight the user never chose.
    saveGoals([...storedGoals(), { id, title: raw, weights: {}, pending: true } as Goal])
    setList(allGoals())
    setDraft('')
    setDraftError('')
    announce()
  }

  const askDelete = (g: Goal) => setPendingDelete(g)

  const closeConfirm = () => {
    setPendingDelete(null)
    // Focus returns to the pill that was clicked. It is a sibling of the button
    // that opened the dialog, not inside it, so it is still mounted after the
    // goal is gone from the list — the focus is never left on a removed node.
    pillRefs.current[pendingDelete?.id ?? '']?.focus()
  }

  const doDelete = () => {
    if (!pendingDelete) return
    const gone = pendingDelete
    setPendingDelete(null)
    deleteGoal(gone.id)
    refresh()
    announce()
    // Removing a pill shifts the row left, so the nearest remaining control is
    // the manage toggle — a stable node that still exists, so focus is not lost
    // to the document body (which is where it would land on a row that empties).
    deleteReturnRef.current?.focus()
  }

  const mono: React.CSSProperties = {
    fontFamily: 'ui-monospace, Menlo, monospace',
    letterSpacing: '.16em',
    textTransform: 'uppercase',
  }

  return (
    <main className="grain-overlay" style={{ minHeight: '100vh', position: 'relative', ['--wall-accent' as string]: accent }}>
      {/* entrance: the mentor rises to the top centre and everything fades in under it */}
      <style>{`
        @keyframes mentorIn { from { opacity: 0; transform: translateY(26px) scale(.86) } to { opacity: 1; transform: none } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
        @keyframes mentorPulse { 0% { transform: scale(1) } 40% { transform: scale(1.16) rotate(-2deg) } 100% { transform: scale(1) } }
        @keyframes bpVeil { from { opacity: 0 } to { opacity: 1 } }
        @keyframes bpIn { from { opacity: 0; transform: translateY(22px) scale(.94) } to { opacity: 1; transform: none } }
        @keyframes bpRow { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: none } }

        /* The delete confirm. Its entrance is the same rise the rest of the page
           uses, and it is the one thing here gated on prefers-reduced-motion: a
           confirm that flies in is a confirm the user did not ask for, so under
           reduce it appears with no motion at all. Inline animation declarations
           are the reason this needs a class — an inline style is not reachable by
           a media query, which is exactly why dashboard.module.css exists. */
        @media (prefers-reduced-motion: reduce) {
          .mentorConfirmVeil, .mentorConfirmCard { animation: none !important; }
        }
      `}</style>
      {!overlay && <WelcomeBackdrop />}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          background: `radial-gradient(60% 45% at 50% 0%, ${accent}24, transparent 70%)`,
          transition: 'background 1.2s ease',
        }}
      />

      <div style={{ position: 'relative', zIndex: 5, width: 'min(880px, calc(100vw - 40px))', margin: '0 auto', padding: '26px 0 90px', textAlign: 'center' }}>
        {overlay ? (
          <button
            type="button"
            onClick={onClose}
            style={{
              float: 'left',
              color: 'var(--muted, #8a8f98)',
              fontSize: 13,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ← board
          </button>
        ) : (
          <a href="/" style={{ float: 'left', color: 'var(--muted, #8a8f98)', fontSize: 13, textDecoration: 'none' }}>
            ← Dashboard
          </a>
        )}

        {/* ───────── ai mentor ───────── */}
        <div style={{ clear: 'both', paddingTop: 44, animation: 'mentorIn .9s cubic-bezier(.22,1,.36,1) both' }}>
          {/* the avatar IS the gem — one persistent WebGL instance (never remounted).
              It travels in on load, pulses on every switch (WAAPI), scales up for
              the main goal, and glows the goal's color. */}
          <div aria-hidden style={{ height: 150, display: 'grid', placeItems: 'center', marginBottom: 4 }}>
            <div
              ref={gemRef}
              style={{
                width: 132,
                height: 132,
                transform: act?.id === 'overall' ? 'scale(1.16)' : 'scale(1)',
                transition: 'transform .7s cubic-bezier(.34,1.56,.64,1), filter .8s ease',
                filter: `drop-shadow(0 0 ${act?.id === 'overall' ? 44 : 30}px ${accent}66)`,
              }}
            >
              <DashboardHeaderGem size={132} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center' }}>
            <span aria-hidden style={{ flex: 1, maxWidth: 180, height: 1, background: `linear-gradient(to right, transparent, ${accent}55)`, transition: 'background .8s ease' }} />
            <h1 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(30px, 4.6vw, 44px)', color: 'var(--fg, #fff)', margin: 0 }}>
              ai mentor
            </h1>
            <span aria-hidden style={{ flex: 1, maxWidth: 180, height: 1, background: `linear-gradient(to left, transparent, ${accent}55)`, transition: 'background .8s ease' }} />
          </div>
          <p style={{ ...mono, fontSize: 10.5, color: accent, margin: '10px 0 0', transition: 'color .8s ease' }}>notices everything · runs the math</p>
        </div>

        {/* the goal — easy in, easy out.

            The delete affordance is BEHIND a mode toggle rather than sitting on
            every pill: an ✕ 12px from a "switch this goal" target is a mis-tap
            away from destroying a file that cannot be rebuilt, and the row is the
            one surface in the app that is pure navigation. Same idiom as the
            board's Edit/Done, so it is not a new idea in this UI. The ✕ is a
            SEPARATE button at --touch, never nested inside the pill — nesting a
            button in a button is invalid HTML and the pill's own hit area would
            swallow the tap it is trying to guard against. */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center', marginTop: 34, animation: 'fadeUp .8s ease .25s both' }}>
          {list.map((g) => {
            const on = g.id === active
            const gA = g.accent ?? '#6EE7B7'
            const isOverall = g.id === 'overall'
            return (
              <span key={g.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                <button
                  ref={(el) => { pillRefs.current[g.id] = el }}
                  type="button"
                  onClick={() => switchGoal(g.id)}
                  aria-current={on ? 'true' : undefined}
                  style={{
                    ...mono,
                    fontSize: 11,
                    color: on ? gA : 'var(--muted, #8a8f98)',
                    background: on ? `${gA}12` : 'transparent',
                    border: `1px solid ${on ? gA + '59' : 'var(--border, #262626)'}`,
                    borderRadius: 999,
                    padding: '0 16px',
                    // --touch, like the board's own goal pills. The old 8px
                    // padding put this row at ~32px, under the app's own floor.
                    minHeight: 'var(--touch)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'color .6s ease, border-color .6s ease, background .6s ease',
                  }}
                >
                  {isOverall ? '★ ' : ''}
                  {g.title}
                </button>

                {removing && (
                  isOverall ? (
                    // The overall goal is a code constant, not a saved goal —
                    // there is nothing in localStorage to remove. It is shown
                    // locked rather than given a button that does nothing, so the
                    // reason is visible before anyone taps it.
                    <span
                      aria-hidden
                      title="The overall goal is the synthesis of every goal — the mentor keeps it."
                      style={{ display: 'inline-grid', placeItems: 'center', width: 'var(--touch)', height: 'var(--touch)', color: 'var(--muted, #8a8f98)', opacity: 0.45, fontSize: 13 }}
                    >
                      ★
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => askDelete(g)}
                      aria-label={`Delete goal: ${g.title}`}
                      title={`Delete ${g.title}`}
                      style={{
                        display: 'inline-grid',
                        placeItems: 'center',
                        width: 'var(--touch)',
                        height: 'var(--touch)',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 999,
                        color: 'var(--muted, #8a8f98)',
                        fontSize: 17,
                        lineHeight: 1,
                        cursor: 'pointer',
                        transition: 'color .2s ease, background .2s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#ff6b6b' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted, #8a8f98)' }}
                    >
                      ✕
                    </button>
                  )
                )}
              </span>
            )
          })}

          <button
            ref={deleteReturnRef}
            type="button"
            onClick={() => setRemoving((v) => !v)}
            aria-pressed={removing}
            style={{
              ...mono,
              fontSize: 10,
              letterSpacing: '.12em',
              color: removing ? 'var(--fg, #fff)' : 'var(--muted, #8a8f98)',
              background: removing ? 'rgba(255,255,255,.08)' : 'transparent',
              border: '1px solid var(--border, #262626)',
              borderRadius: 999,
              padding: '0 14px',
              minHeight: 'var(--touch)',
              cursor: 'pointer',
            }}
          >
            {removing ? 'Done' : 'Manage goals'}
          </button>
        </div>

        {/* x + x + x — the tiles, no borders, just the numbers */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'clamp(14px, 3vw, 30px)',
            flexWrap: 'wrap',
            marginTop: 46,
            animation: 'fadeUp .8s ease .4s both',
          }}
        >
          {entries.map(([tile, w], i) => (
            <div key={tile} style={{ display: 'flex', alignItems: 'center', gap: 'clamp(14px, 3vw, 30px)' }}>
              {i > 0 && (
                <span aria-hidden style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 30, fontWeight: 300, color: `${accent}66`, transition: 'color .8s ease' }}>
                  +
                </span>
              )}
              <div>
                <Roll value={w} color={accent} size={Math.max(30, 56 - entries.length * 3)} />
                <p style={{ ...mono, fontSize: 10, color: 'var(--muted, #8a8f98)', margin: '4px 0 0' }}>{label(tile)}</p>
              </div>
            </div>
          ))}

          {/* the +: what you're NOT tracking — the mentor's blueprints */}
          <button
            type="button"
            onClick={() => setIdeasOpen(true)}
            aria-label="What am I missing?"
            title="What am I missing?"
            style={{
              width: 54,
              height: 54,
              borderRadius: 999,
              border: `1px dashed ${accent}59`,
              background: 'transparent',
              color: accent,
              fontSize: 26,
              fontWeight: 300,
              cursor: 'pointer',
              transition: 'border-color .6s ease, color .6s ease',
            }}
          >
            +
          </button>
        </div>

        {/* ── the confirm ──
            Deleting a goal destroys its weights permanently: there is no
            cross-goal index and no tombstone, so `finance: 60` exists only inside
            that goal's object. The dialog says exactly that, in the app's own
            voice, before anything is written.

            It is NOT a focus trap. Escape closes it, the scrim closes it, Cancel
            closes it, and Tab past the last button leaves it — a keyboard user
            who wants out is never held. Focus lands on Cancel, never on the
            destructive button: the safe choice is the default one. */}
        {pendingDelete && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mentorConfirmTitle"
            aria-describedby="mentorConfirmBody"
            className="mentorConfirmVeil"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeConfirm()
            }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 97,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              background: 'rgba(0,0,0,.72)',
              backdropFilter: 'blur(12px)',
              animation: 'bpVeil .35s ease both',
            }}
          >
            <div
              className="mentorConfirmCard"
              style={{
                width: 'min(440px, 100%)',
                textAlign: 'center',
                padding: '30px 26px 24px',
                borderRadius: 16,
                border: '1px solid var(--border, #262626)',
                background: 'var(--bg-elevated, #121212)',
                boxShadow: '0 24px 60px rgba(0,0,0,.6)',
                animation: 'bpIn .55s cubic-bezier(.34,1.56,.64,1) both',
              }}
            >
              <p style={{ ...mono, fontSize: 9.5, color: '#ff6b6b', letterSpacing: '.2em', margin: '0 0 10px' }}>
                THIS CANNOT BE UNDONE
              </p>
              <h2
                id="mentorConfirmTitle"
                style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontStyle: 'italic', fontWeight: 400, fontSize: 25, color: 'var(--fg, #fff)', margin: 0 }}
              >
                Delete {pendingDelete.title}?
              </h2>
              <p
                id="mentorConfirmBody"
                style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--muted, #b9c4be)', margin: '14px auto 0', maxWidth: 340 }}
              >
                Its weights go with it. Every percentage the mentor set for this goal lives only
                here — there is no copy anywhere else, so they cannot be recovered.
                {pendingDelete.id === active && ' The board will move to another goal.'}
              </p>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
                <button
                  ref={confirmRef}
                  type="button"
                  onClick={closeConfirm}
                  style={{
                    ...mono,
                    fontSize: 11,
                    color: 'var(--fg, #fff)',
                    background: 'transparent',
                    border: '1px solid var(--border, #262626)',
                    borderRadius: 999,
                    padding: '0 20px',
                    minHeight: 'var(--touch)',
                    cursor: 'pointer',
                  }}
                >
                  Keep it
                </button>
                <button
                  type="button"
                  onClick={doDelete}
                  style={{
                    ...mono,
                    fontSize: 11,
                    color: '#fff',
                    background: '#e5484d',
                    border: '1px solid #e5484d',
                    borderRadius: 999,
                    padding: '0 20px',
                    minHeight: 'var(--touch)',
                    cursor: 'pointer',
                  }}
                >
                  Delete it
                </button>
              </div>
            </div>
          </div>
        )}

        {ideasOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Blueprints — tiles you're missing"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setIdeasOpen(false)
            }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 96,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              background: 'rgba(0,0,0,.72)',
              backdropFilter: 'blur(12px)',
              animation: 'bpVeil .35s ease both',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 'min(480px, 100%)',
                maxHeight: '84vh',
                overflow: 'auto',
                textAlign: 'center',
                padding: '12px 8px',
                animation: 'bpIn .55s cubic-bezier(.34,1.56,.64,1) both',
              }}
            >
              <p style={{ ...mono, fontSize: 9.5, color: accent, letterSpacing: '.2em', margin: '0 0 8px' }}>
                THE MENTOR SEES A GAP
              </p>
              <span style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontStyle: 'italic', fontSize: 24, color: 'var(--fg, #fff)' }}>
                You&apos;re not tracking everything.
              </span>

              <div style={{ margin: '30px 0 6px' }}>
                {tileIdeas(act?.id ?? 'overall').map((idea, i) => (
                  <div
                    key={idea.title}
                    style={{ padding: '18px 0', animation: `bpRow .6s cubic-bezier(.22,1,.36,1) ${0.12 + i * 0.09}s both` }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 14 }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-serif), Georgia, serif',
                          fontStyle: 'italic',
                          fontSize: 'clamp(30px, 5vw, 40px)',
                          fontWeight: 400,
                          color: 'var(--fg, #fff)',
                        }}
                      >
                        {idea.word ?? idea.title.split(/[\s/]/)[0]}
                      </span>
                      <span style={{ ...mono, fontSize: 13, color: accent }}>≈ {idea.estWeight}%</span>
                    </div>
                    <p style={{ ...mono, fontSize: 10, color: 'var(--muted, #8a8f98)', margin: '7px 0 0', letterSpacing: '.08em' }}>
                      {idea.title.toLowerCase()} · {idea.tracks}
                    </p>
                  </div>
                ))}
              </div>

              <p
                style={{
                  ...mono,
                  fontSize: 10,
                  color: 'var(--muted, #8a8f98)',
                  margin: '18px 0 0',
                  animation: 'bpRow .6s ease .4s both',
                }}
              >
                want one? tell the mentor — <i style={{ color: 'var(--fg, #fff)', fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 13 }}>“build me water”</i>
              </p>
            </div>
          </div>
        )}

        {/* = y — results, progress, advice */}
        <div style={{ marginTop: 52, animation: 'fadeUp .8s ease .55s both' }}>
          <span aria-hidden style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 34, fontWeight: 300, color: `${accent}88`, transition: 'color .8s ease' }}>
            =
          </span>
          <h2 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(24px, 3.6vw, 34px)', color: 'var(--fg, #fff)', margin: '10px 0 0' }}>
            {act?.title}
          </h2>

          {/* progress — computed by the mentor's data sweeps */}
          <div style={{ width: 'min(520px, 100%)', margin: '26px auto 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <span style={{ ...mono, fontSize: 10, color: 'var(--muted, #8a8f98)' }}>how far you&apos;ve come</span>
              <Roll value={act?.progress ?? 0} color={accent} size={22} />
            </div>
            <div style={{ height: 5, borderRadius: 999, background: `${accent}1c`, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${act?.progress ?? 0}%`,
                  height: '100%',
                  borderRadius: 999,
                  background: accent,
                  transition: 'width 1s cubic-bezier(.22,1,.36,1), background .8s ease',
                }}
              />
            </div>
          </div>

          {/* mentor notices — bullets, the key words bold */}
          {advice && (
            <div style={{ width: 'min(560px, 100%)', margin: '30px auto 0', textAlign: 'left' }}>
              <p style={{ ...mono, fontSize: 10.5, color: accent, margin: '0 0 10px', transition: 'color .8s ease' }}>
                mentor notices
              </p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {(advice.points ?? [advice.text]).map((pt, i) => (
                  <li
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 10,
                      color: 'var(--muted, #b9c4be)',
                      fontSize: 13.5,
                      lineHeight: 1.65,
                      margin: '7px 0',
                    }}
                  >
                    <span aria-hidden style={{ color: accent, transition: 'color .8s ease' }}>◆</span>
                    <span>
                      {pt.split(/\*\*(.+?)\*\*/g).map((part, j) =>
                        j % 2 ? (
                          <strong key={j} style={{ color: 'var(--fg, #fff)', fontWeight: 600 }}>
                            {part}
                          </strong>
                        ) : (
                          part
                        ),
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p style={{ ...mono, fontSize: 9.5, color: 'var(--muted, #8a8f98)', margin: '18px 0 0' }}>
            results · progress · advice — swept and computed by the mentor, always
          </p>
        </div>

        {/* write a new goal — the mentor shapes it */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            width: 'min(560px, 100%)',
            margin: '54px auto 0',
            border: '1px dashed var(--border, #333)',
            borderRadius: 999,
            padding: '6px 8px 6px 18px',
            animation: 'fadeUp .8s ease .7s both',
          }}
        >
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              if (draftError) setDraftError('')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addGoal()
            }}
            placeholder="Write a goal, raw — the mentor shapes and weighs it."
            style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: 'var(--fg, #fff)', fontSize: 13.5 }}
          />
          <button
            type="button"
            onClick={addGoal}
            style={{
              flex: '0 0 auto',
              background: accent,
              color: '#0a0f0c',
              border: 'none',
              borderRadius: 999,
              padding: '9px 16px',
              fontWeight: 600,
              fontSize: 12.5,
              cursor: 'pointer',
              transition: 'background .8s ease',
            }}
          >
            Give it to the mentor
          </button>
          {draftError && (
            <p role="status" style={{ ...mono, fontSize: 10.5, color: '#ff6b6b', margin: '12px 0 0', letterSpacing: '.04em', textTransform: 'none' }}>
              {draftError}
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
