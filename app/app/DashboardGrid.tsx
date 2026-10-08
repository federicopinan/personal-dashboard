'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import gsap from 'gsap'
import { VEE_TILE, DEFAULT_HOME_ORDER, coreDefaultSize, coreTileFor, tileLabel, type CoreTile } from '@/lib/tiles/coreTiles'
import { discoverTiles, humanizeTileId, isTileId, tileFilePath, type RosterProblem, type TileFetcher, type TileRescan, type TileRoster } from '@/lib/tiles/tileRoster'
import dynamic from 'next/dynamic'
import { activeGoal as readActiveGoal, allGoals, setActiveGoalId, tileWeights, type Goal } from '@/lib/tiles/weights'

// Lazy: the board never pays for the mentor (Three.js gem included) until it
// comes alive. Keeps first load fast.
const MentorPage = dynamic(() => import('@/app/mentor/MentorPage'), { ssr: false })
import { initVeeTiles } from '@/components/veeTilesAnim'
import { useTileHost } from '@/lib/tiles/useTileHost'
import { withBridge } from '@/lib/tiles/tileBridge'
import type { DashboardChrome } from '@/lib/tiles/dashboardChrome'

/**
 * The base dashboard grid. Every tile is an inert slot: the beautiful poster is
 * fixed, and clicking a tile either opens the sealed HTML you dropped into
 * public/tiles/<id>.html (from `/tile` or an addon command), or — if the slot
 * is empty — opens the "how to build this" ConnectorOverlay.
 *
 * WHICH tiles exist is public/tiles/manifest.json, the roster (lib/tiles/
 * tileRoster.ts); DEFAULT_HOME_ORDER is only the default ARRANGEMENT a fresh
 * board starts from. An id the roster names but the core registry
 * (lib/tiles/coreTiles.tsx) has never heard of is a first-class tile: it gets a
 * neutral face and a name derived from its id. It is not a broken board, and it
 * must never throw.
 *
 * No auth, no server. The board is a plain 3-column CSS grid in the user's
 * order (components/veeTiles.css owns the columns); the living orbs are
 * animated by initVeeTiles, exactly as in the full app.
 */

// The default ARRANGEMENT (the seeded order), minus the Library tile. This is
// where a fresh board starts, NOT the list of tiles that exist: the roster is
// public/tiles/manifest.json, written by whoever adds a tile file. This list is
// the fallback the board runs on when that manifest cannot be read, so a repo
// that never installed one still boots.
const DEFAULT_SLOTS = DEFAULT_HOME_ORDER.filter((id) => id !== 'library') as string[]

type FilledMap = Record<string, string> // slotId -> sealed HTML

// One fetch shape for both the mount discovery and a re-scan. no-store, so a
// re-scan right after the harness wrote a file is never answered from cache.
const fetchTile: TileFetcher = (url) => fetch(url, { cache: 'no-store' })

/* ── the Vee centre art (wire feeds + ring pulse), animated by veeTilesAnim ── */
function VeeArt() {
  return (
    <>
      <div className="disc" />
      <svg className="art" viewBox="0 0 434 250">
        <path className="wire" style={{ stroke: 'rgba(167,243,208,.2)' }} d="M216 66 V2" />
        <path className="wire" style={{ stroke: 'rgba(185,163,255,.2)' }} d="M262 96 H300 V40 H760" />
        <path className="wire" style={{ stroke: 'rgba(232,200,120,.2)' }} d="M262 140 H320 V192 H760" />
        <path className="wire" style={{ stroke: 'rgba(167,243,208,.2)' }} d="M190 158 V248" />
        <path className="wire" style={{ stroke: 'rgba(185,163,255,.2)' }} d="M170 140 H114 V192 H-326" />
        <path className="wire" style={{ stroke: 'rgba(232,200,120,.2)' }} d="M170 96 H134 V56 H-326" />
        <g className="feedgrp">
          <path className="feed" pathLength="100" d="M216 2 V66" />
          <path className="feed" pathLength="100" d="M760 40 H300 V96 H262" />
          <path className="feed" pathLength="100" d="M760 192 H320 V140 H262" />
          <path className="feed" pathLength="100" d="M190 248 V158" />
          <path className="feed" pathLength="100" d="M-326 192 H114 V140 H170" />
          <path className="feed" pathLength="100" d="M-326 56 H134 V96 H170" />
        </g>
        <rect className="chip" x="170" y="66" width="92" height="92" rx="24" />
        <g className="ringgrp">
          <rect className="ring-soft" x="170" y="66" width="92" height="92" rx="24" />
          <rect className="ring-line" x="170" y="66" width="92" height="92" rx="24" />
        </g>
        <g className="vgrp">
          <path className="v-base" d="M201 96 L216 129 L231 96" />
          <path className="vm" d="M201 96 L216 129 L231 96" />
        </g>
      </svg>
      <div className="scrim" />
    </>
  )
}

/* ── a percentage that ROLLS to its value like a stock ticker ── */
function RollPct({ value, color }: { value: number; color: string }) {
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
    // The box, the size and the offset live in components/veeTiles.css
    // (.rollPct): the tile is a fluid cell now, so a fixed 46px and a fixed
    // top:52 were only ever right at the 300px the mockup drew. Only the two
    // values that come from the goal stay inline.
    <span
      className="rollPct"
      style={{
        color,
        textShadow: `0 0 26px ${color}59`,
      }}
    >
      {shown}%
    </span>
  )
}

/* ── one tile face (core poster or Vee), inert: the hit layer opens a slot ── */
function TileFace({
  id,
  isVee,
  core,
  fixed,
  editable,
  onRemove,
  weight,
  accent,
  kicker,
  onOpen,
}: {
  id: string
  isVee: boolean
  core: CoreTile | null
  /** The mentor only: y is a full-width hero above the grid, so it carries an
   *  explicit size. The x tiles take their size from their grid cell instead. */
  fixed?: CSSProperties
  /** Grid tiles wobble in edit mode; the mentor (y) never does. */
  editable?: boolean
  /** Present only in edit mode: shows the ✕ remove badge. */
  onRemove?: () => void
  /** This input's share of the active goal — big, centered, no border. */
  weight?: number
  /** The active goal's color: mint by default, gold for the main goal. */
  accent?: string
  /** Mentor only: the active goal title, shown as the kicker. */
  kicker?: string
  onOpen: () => void
}) {
  // A tile the CORE registry has never heard of (one an AI harness added) has
  // no descriptor: it gets a name derived from its id, no corner index, no
  // glyph and no art — a neutral glass face. The old `core!.label` / `core!.art`
  // threw on exactly this id and took the whole board down with it.
  const label = isVee ? VEE_TILE.label : (core?.label ?? humanizeTileId(id))
  const index = isVee ? VEE_TILE.index : core?.index
  const variant = (core?.variant || (isVee ? 'vee' : undefined)) as string | undefined
  const orb = !isVee && core ? core.orb : undefined
  const style: CSSProperties = { position: 'relative', ...fixed }
  return (
    <div
      data-size={isVee ? coreDefaultSize('vee') : coreDefaultSize(id)}
      data-orb={orb?.mode}
      data-roam={orb?.roam}
      data-pt={orb?.pt}
      className={`tile${variant ? ' ' + variant : ''}${editable ? ' editable' : ''}`}
      style={style}
    >
      <div className="aurora" />

      {isVee ? <VeeArt /> : core?.art}

      {index && <span className="index">{index}</span>}
      {!isVee && core && <span className="glyph">{core.glyph}</span>}
      {isVee && <span className="kicker">{kicker ?? VEE_TILE.kicker}</span>}

      {isVee ? (
        <span className="label">{label}</span>
      ) : (
        <div className="cap">
          <span className="label">{label}</span>
        </div>
      )}
      <span className="arrow">→</span>

      {weight != null && <RollPct value={weight} color={accent ?? '#6EE7B7'} />}

      {/* Inert: clicking opens the slot (filled tile or connector), never navigates. */}
      <button type="button" className="hit" aria-label={`Open ${label}`} onClick={onOpen} />

      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${label}`}
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 9,
            width: 26,
            height: 26,
            borderRadius: 999,
            border: '1px solid rgba(255,107,107,.5)',
            background: 'rgba(20,6,6,.85)',
            color: '#ff6b6b',
            cursor: 'pointer',
            fontSize: 13,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      )}
    </div>
  )
}

/* ── open a filled slot's sealed HTML in a sandboxed iframe ── */
function OpenTileOverlay({
  slot,
  register,
  unregister,
  onClose,
}: {
  slot: { id: string; name: string; html: string }
  register: (w: Window | null, id: string) => void
  unregister: (w: Window | null) => void
  onClose: () => void
}) {
  const winRef = useRef<Window | null>(null)
  return (
    <div className="openOverlay openFull" role="dialog" aria-modal="true" aria-label={slot.name}>
      <div className="openCard">
        <div className="openTop">
          <button type="button" className="openBack" onClick={onClose}>
            <span aria-hidden="true">←</span> Dashboard
          </button>
          <span className="openSlotName">{slot.name}</span>
        </div>
        <div className="openStage">
          <iframe
            ref={(el) => {
              if (el) {
                winRef.current = el.contentWindow
                register(el.contentWindow, slot.id)
              } else if (winRef.current) {
                unregister(winRef.current)
                winRef.current = null
              }
            }}
            onLoad={(e) => {
              winRef.current = e.currentTarget.contentWindow
              register(e.currentTarget.contentWindow, slot.id)
            }}
            className="openFrame"
            srcDoc={withBridge(slot.html)}
            sandbox="allow-scripts"
            title={slot.name}
          />
        </div>
      </div>
    </div>
  )
}

/* ── the connector: how to build (and hook up) an empty slot ── */
function ConnectorOverlay({ id, label, onClose }: { id: string; label: string; onClose: () => void }) {
  const path = `public/tiles/${id}.html`
  const prompt = `Build a "${label}" tile for my Vitality dashboard as ONE self-contained HTML file (all CSS and JS inline, no external requests). Dark background, mint #6EE7B7. Save and load with await window.Vitality.save(data) and await window.Vitality.load() (the dashboard provides window.Vitality, do not use localStorage). Write it to ${path}.`
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(prompt).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    })
  }
  return (
    <div
      className="openOverlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Build the ${label} tile`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="openCard" style={{ maxWidth: 620 }}>
        <div className="openTop">
          <span className="openTitle">Build the {label} tile</span>
          <button type="button" className="openClose" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>
        <div className="openStage" style={{ display: 'block', overflow: 'auto', padding: '22px 24px' }}>
          <p style={{ color: 'var(--muted)', lineHeight: 1.6, marginTop: 0 }}>
            This tile is a <strong style={{ color: 'var(--fg)' }}>slot</strong>. It fills when a
            file exists at <code style={{ color: 'var(--mint)' }}>{path}</code>. Two ways to fill it:
          </p>

          <ol style={{ color: 'var(--muted)', lineHeight: 1.7, paddingLeft: 18 }}>
            <li>
              <strong style={{ color: 'var(--fg)' }}>From library:</strong> copy the tile template from
              <code style={{ color: 'var(--mint)' }}> tiles-library/{id}.html</code> to <code style={{ color: 'var(--mint)' }}>{path}</code>.
            </li>
            <li style={{ marginTop: 8 }}>
              <strong style={{ color: 'var(--fg)' }}>Custom tile:</strong> run
              <code style={{ color: 'var(--mint)' }}> /tile {id}</code> or paste this prompt:
            </li>
          </ol>

          <pre
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '12px 14px',
              whiteSpace: 'pre-wrap',
              color: 'var(--fg)',
              fontSize: 13,
              lineHeight: 1.55,
            }}
          >
            {prompt}
          </pre>

          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 0 }}>
            Then commit + redeploy (or reload locally) and the tile appears right here.
          </p>

          <button
            type="button"
            onClick={copy}
            style={{
              marginTop: 14,
              padding: '0.65rem 1.2rem',
              borderRadius: 999,
              background: 'var(--mint)',
              color: 'var(--mint-ink, #042a1c)',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {copied ? 'Copied ✓' : 'Copy build prompt'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── when the roster and the folder disagree, the board says so out loud ── */
function RosterNotice({ problems }: { problems: RosterProblem[] }) {
  if (!problems.length) return null
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        margin: '0 0 18px',
        padding: '12px 14px',
        border: '1px solid var(--border)',
        borderLeft: '2px solid var(--amber, #E8964A)',
        borderRadius: 12,
        background: 'var(--bg-elevated, rgba(255,255,255,.02))',
      }}
    >
      {problems.map((p) => (
        <p key={p.code} style={{ margin: 0, color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.6 }}>
          {p.message}
        </p>
      ))}
    </div>
  )
}

/* ── the "+ New tile" panel: the tile comes from the AI harness, not from here ──
   There is no in-app builder and no model call: the tile is an HTML file the
   user's assistant writes into public/tiles/. This panel's whole job is to say
   so, point at the real contract (.claude/commands/tile.md), and offer a
   re-scan so a file that landed a second ago shows up without a page reload. */
function NewTileOverlay({ onClose, onRescan }: { onClose: () => void; onRescan: () => Promise<TileRescan> }) {
  const [id, setId] = useState('')
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<TileRescan | null>(null)
  const tid = id.trim().toLowerCase()
  const valid = tid === '' || isTileId(tid)
  const shown = tid || '<id>'

  const prompt = `Build a "${shown}" tile for my Vitality dashboard as ONE self-contained HTML file (all CSS and JS inline, no external requests). Dark background, mint #6EE7B7. Save and load with await window.Vitality.save(data) and await window.Vitality.load() (the dashboard provides window.Vitality, do not use localStorage). Write it to ${tileFilePath(shown)}, add "${shown}" to the "tiles" array in public/tiles/manifest.json, and follow the sealed tile contract in .claude/commands/tile.md.`

  const copy = () => {
    navigator.clipboard?.writeText(prompt).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    })
  }

  const rescan = async () => {
    setBusy(true)
    setResult(null)
    try {
      setResult(await onRescan())
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="openOverlay"
      role="dialog"
      aria-modal="true"
      aria-label="New tile"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="openCard" style={{ maxWidth: 560, height: 'auto' }}>
        <div className="openTop">
          <span className="openTitle">New tile</span>
          <button type="button" className="openClose" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>
        <div className="openStage" style={{ display: 'block', overflow: 'auto', padding: '24px 26px 26px' }}>
          <p style={{ margin: 0, color: 'var(--fg)', fontSize: 19, fontFamily: 'var(--font-serif), Georgia, serif', fontStyle: 'italic' }}>
            Your assistant builds it. This board has no in-app builder.
          </p>
          <p style={{ margin: '10px 0 0', color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.65 }}>
            Open this repo in Claude Code, OpenCode, or any AI harness and ask for a tile. It writes
            the file, the file appears here, and the tile's data stays in this browser.
          </p>

          <ol style={{ margin: '16px 0 0', color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.7, paddingLeft: 18 }}>
            <li>
              Give it a name. Lowercase, no spaces: <code style={{ color: 'var(--mint)' }}>coffee</code>,{' '}
              <code style={{ color: 'var(--mint)' }}>reading</code>, <code style={{ color: 'var(--mint)' }}>guitar</code>.
            </li>
            <li style={{ marginTop: 6 }}>
              It writes <code style={{ color: 'var(--mint)' }}>{tileFilePath(shown)}</code> and adds that id
              to <code style={{ color: 'var(--mint)' }}>public/tiles/manifest.json</code>. Both, or the
              board cannot see the tile.
            </li>
            <li style={{ marginTop: 6 }}>
              Come back and press <strong style={{ color: 'var(--fg)' }}>Re-scan tiles</strong>.
            </li>
          </ol>

          <p style={{ margin: '14px 0 0', color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.6 }}>
            A tile is one sealed HTML file: no network, no localStorage, all CSS and JS inline. The exact
            rules are in <code style={{ color: 'var(--mint)' }}>.claude/commands/tile.md</code> — read that
            before writing one.
          </p>

          <label style={{ display: 'block', marginTop: 18, color: 'var(--muted)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase' }}>
            Tile name
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="coffee"
              spellCheck={false}
              autoComplete="off"
              style={{
                display: 'block',
                width: '100%',
                marginTop: 7,
                padding: '11px 13px',
                borderRadius: 12,
                border: `1px solid ${valid ? 'var(--border)' : 'var(--amber, #E8964A)'}`,
                background: 'var(--bg-elevated, #0b0f0d)',
                color: 'var(--fg)',
                fontFamily: 'ui-monospace, Menlo, monospace',
                fontSize: 14,
              }}
            />
          </label>
          {!valid && (
            <p style={{ margin: '6px 0 0', color: 'var(--amber, #E8964A)', fontSize: 12 }}>
              Lowercase letters, digits, dot and dash only — the name becomes the file name.
            </p>
          )}

          <pre
            style={{
              margin: '12px 0 0',
              background: 'var(--bg-elevated, #0b0f0d)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '12px 14px',
              whiteSpace: 'pre-wrap',
              color: 'var(--fg)',
              fontSize: 12.5,
              lineHeight: 1.55,
            }}
          >
            {prompt}
          </pre>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 16 }}>
            <button
              type="button"
              onClick={copy}
              style={{
                padding: '0.65rem 1.2rem',
                borderRadius: 999,
                background: 'var(--mint)',
                color: 'var(--mint-ink, #042a1c)',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {copied ? 'Copied ✓' : 'Copy build prompt'}
            </button>
            <button
              type="button"
              onClick={rescan}
              disabled={busy}
              style={{
                padding: '0.65rem 1.2rem',
                borderRadius: 999,
                background: 'transparent',
                color: 'var(--mint)',
                border: '1px solid var(--border)',
                fontWeight: 600,
                cursor: busy ? 'progress' : 'pointer',
                opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? 'Scanning…' : 'Re-scan tiles'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.65rem 1.2rem',
                borderRadius: 999,
                background: 'transparent',
                color: 'var(--muted)',
                border: 'none',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>

          {result && (
            <div role="status" style={{ marginTop: 14, color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.65 }}>
              {result.added.length > 0 ? (
                <p style={{ margin: 0, color: 'var(--fg)' }}>
                  On the board now: {result.added.map((a) => tileLabel(a)).join(', ')}.
                </p>
              ) : (
                <p style={{ margin: 0 }}>Nothing new. The board has every tile the manifest lists.</p>
              )}
              {result.problems.map((p) => (
                <p key={p.code} style={{ margin: '8px 0 0', color: 'var(--amber, #E8964A)' }}>
                  {p.message}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── the welcome-home "see the vision" screen: pure black, one line, one way back ── */
function EmptyCanvas({ onBack }: { onBack: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 24,
        zIndex: 100,
      }}
    >
      <h1
        style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: 'clamp(40px, 7vw, 76px)',
          color: '#fff',
          margin: 0,
          letterSpacing: '-.015em',
        }}
      >
        See the vision.
      </h1>
      <p style={{ color: '#6EE7B7', fontSize: 'clamp(15px, 2.4vw, 21px)', margin: '18px 0 0', letterSpacing: '.02em' }}>
        You can create anything.
      </p>
      <button
        type="button"
        onClick={onBack}
        style={{
          marginTop: 42,
          background: '#6EE7B7',
          color: '#04140d',
          border: 'none',
          borderRadius: 999,
          padding: '0 28px',
          minHeight: 'var(--touch)',
          display: 'inline-flex',
          alignItems: 'center',
          fontWeight: 600,
          fontSize: 15,
          cursor: 'pointer',
        }}
      >
        ← Back to dashboard
      </button>
    </div>
  )
}

/* ── the blank board's default face: shown when no tiles exist yet ── */
function VisionEmptyState({ onNewTile }: { onNewTile: () => void }) {
  return (
    <div
      style={{
        minHeight: '62vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '48px 24px',
      }}
    >
      <h1
        style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: 'clamp(36px, 6vw, 68px)',
          color: 'var(--fg, #fff)',
          margin: 0,
          letterSpacing: '-.015em',
        }}
      >
        See the vision.
      </h1>
      <p style={{ color: '#6EE7B7', fontSize: 'clamp(15px, 2.4vw, 20px)', margin: '16px 0 0', letterSpacing: '.02em' }}>
        You can create anything.
      </p>
      <p style={{ color: 'var(--muted, #8a8f98)', fontSize: 14, margin: '28px 0 0', maxWidth: 460, lineHeight: 1.65 }}>
        This board is yours, and empty. Build your own tile with <strong style={{ color: 'var(--fg, #fff)' }}>+ New
        tile</strong> — or run <code style={{ color: '#6EE7B7' }}>/vitality</code> in Claude Code to load the full
        dashboard we built.
      </p>
      <button
        type="button"
        onClick={onNewTile}
        style={{
          marginTop: 30,
          background: '#6EE7B7',
          color: '#04140d',
          border: 'none',
          borderRadius: 999,
          padding: '0 26px',
          minHeight: 'var(--touch)',
          display: 'inline-flex',
          alignItems: 'center',
          fontWeight: 600,
          fontSize: 15,
          cursor: 'pointer',
        }}
      >
        + New tile
      </button>
    </div>
  )
}

interface DashboardGridProps {
  userId: string
  chrome?: DashboardChrome
}

export default function DashboardGrid({ userId }: DashboardGridProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [filled, setFilled] = useState<FilledMap>({})
  const [openId, setOpenId] = useState<string | null>(null) // filled slot opened live
  const [connectId, setConnectId] = useState<string | null>(null) // empty slot connector
  const [newOpen, setNewOpen] = useState(false) // "+ New tile" creator
  const [showWelcome, setShowWelcome] = useState(false) // transient "see the vision" home (non-destructive)
  const [loaded, setLoaded] = useState(false) // tile discovery finished — gates the blank "see the vision" state
  const [roster, setRoster] = useState<TileRoster>({ ids: DEFAULT_SLOTS, problems: [] }) // the manifest's ids + anything wrong with it
  const [scratched, setScratched] = useState(false) // deliberate "start from scratch" → clean canvas, no onboarding text
  const [editing, setEditing] = useState(false) // edit mode: row tiles wobble, show ✕, drag to reorder
  const [order, setOrder] = useState<string[]>([]) // persisted row order (x tiles)
  const [removed, setRemoved] = useState<string[]>([]) // slots removed from the row in edit mode
  const [goal, setGoal] = useState<Goal | undefined>(undefined) // active goal: drives %s, colors, the mentor kicker
  const [mentorAlive, setMentorAlive] = useState(false) // the mentor comes to life OVER the board — no page load
  const [xPeek, setXPeek] = useState(true) // the `x = %s` breakdown: flashes on change, fades after 5s (the `x` stays)
  const dragId = useRef<string | null>(null)
  const filledRef = useRef<FilledMap>({})

  useEffect(() => {
    if (!ref.current || (!openId && !connectId && !newOpen && !mentorAlive)) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const overlay = ref.current?.querySelector('.openOverlay, .mentorOverlay')
      if (!overlay) return
      gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' })
      const card = overlay.querySelector('.openCard')
      if (card) gsap.fromTo(card, { y: 12 }, { y: 0, duration: 0.32, ease: 'power2.out' })
    }, ref)
    return () => mm.revert()
  }, [openId, connectId, newOpen, mentorAlive])

  const { register, unregister } = useTileHost(userId, undefined, () => {})

  useEffect(() => {
    setMounted(true)
    try {
      setScratched(window.localStorage.getItem('vitality:scratched') === '1')
      const o = JSON.parse(window.localStorage.getItem('vitality:eq:order') || 'null')
      if (Array.isArray(o)) setOrder(o.filter((x) => typeof x === 'string'))
      const r = JSON.parse(window.localStorage.getItem('vitality:eq:removed') || 'null')
      if (Array.isArray(r)) setRemoved(r.filter((x) => typeof x === 'string'))
      setGoal(readActiveGoal())
    } catch {
      /* ignore */
    }
  }, [])

  // The board DISPATCHES vitality:goal but never listened to it, so its own
  // `goal` state could only be corrected by the one-off read in the mentor's
  // onClose. Delete a goal in the mentor and the board kept rendering that goal's
  // title, accent and weights — the badges and the x = breakdown described a goal
  // that was no longer in storage. Listening makes the board follow every writer:
  // the settings sheet, the mentor page, and a second tab.
  useEffect(() => {
    const onGoal = () => setGoal(readActiveGoal())
    window.addEventListener('vitality:goal', onGoal)
    return () => window.removeEventListener('vitality:goal', onGoal)
  }, [])

  // While the mentor is alive over the board, the board must not scroll —
  // only the overlay does (it has its own overflowY). Blur stays.
  useEffect(() => {
    if (!mentorAlive) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mentorAlive])

  // Discover which tiles exist. The roster is public/tiles/manifest.json — the
  // list of ids written by whoever added a tile file — and each id is then read
  // from public/tiles/<id>.html. A non-ok response means "no tile for this id".
  // The dashboard is local-only: no cloud tile source, no override layer, and
  // whichever file is in the repo is the tile that ships.
  useEffect(() => {
    let alive = true
    ;(async () => {
      const scan = await discoverTiles(fetchTile, DEFAULT_SLOTS)
      if (alive) {
        setFilled(scan.html)
        setRoster({ ids: scan.ids, problems: scan.problems })
        setLoaded(true)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // Re-scan without a reload, for a tile the user's harness just wrote. It
  // re-reads the manifest and the tile files and REPLACES `filled` — the folder
  // is the truth, so a deleted tile disappears too. It touches nothing else:
  // `order` and `removed` are read from storage once, on mount, and are never
  // written here, so vitality:eq:order and vitality:eq:removed come through a
  // re-scan exactly as they were, and a new id is APPENDED to the board instead
  // of being pushed into the saved order.
  const rescan = useCallback(async (): Promise<TileRescan> => {
    const scan = await discoverTiles(fetchTile, DEFAULT_SLOTS)
    const added = scan.ids.filter((id) => scan.html[id] && !filledRef.current[id])
    filledRef.current = scan.html
    setFilled(scan.html)
    setRoster({ ids: scan.ids, problems: scan.problems })
    return { added, problems: scan.problems }
  }, [])

  // The board shows ONLY tiles that actually exist. A fresh scaffold has none, so
  // it boots to the blank "see the vision" canvas; tiles appear as they're built
  // (/tile), shipped by an episode command (/logger), or installed (/vitality).
  const filledOrder = useMemo(() => roster.ids.filter((id) => filled[id]), [filled, roster.ids])

  // Each input's estimated share of the goal (plain numbers — Claude retunes them
  // at build time for YOUR goal; localStorage override wins. See lib/tiles/weights).
  const weights = useMemo(() => (mounted ? tileWeights() : {}), [mounted, goal])

  // The grid tiles (the x's): every filled tile except the mentor, in the user's
  // saved order, minus anything they removed in edit mode. New tiles append —
  // an id the saved order never mentions is added at the end, not dropped, and
  // the saved order itself is left exactly as the user left it.
  const gridIds = useMemo(() => {
    const base = order.length ? order : DEFAULT_SLOTS
    const seen = new Set(base)
    const all = [...base, ...roster.ids.filter((id) => !seen.has(id))]
    return all.filter((id) => id !== 'vee' && filled[id] && !removed.includes(id))
  }, [order, filled, removed, roster.ids])

  // The grid as a SET signature. initVeeTiles binds to the DOM, so it only has
  // to re-run when a tile appears or disappears — a reorder keeps the same
  // nodes (they are keyed by id), so the orbs keep wandering where they were.
  const gridKey = useMemo(() => [...gridIds].sort().join(','), [gridIds])

  // The live `x =` breakdown: each tile's real-time weight toward the goal.
  const xPercents = gridIds.map((id) => `${weights[id] ?? 0}%`).join(' · ')
  // Flash it whenever anything changes (weights retuned, goal switched, tiles
  // reordered/added), hold 5s, then fade. Keyed on the actual values so it only
  // re-shows on a real change.
  const xSignature = gridIds.map((id) => `${id}:${weights[id] ?? 0}`).join(',') + '|' + (goal?.id ?? '')
  useEffect(() => {
    setXPeek(true)
    const t = setTimeout(() => setXPeek(false), 5000)
    return () => clearTimeout(t)
  }, [xSignature])

  const saveOrder = (next: string[]) => {
    setOrder(next)
    try {
      window.localStorage.setItem('vitality:eq:order', JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }

  const saveRemoved = (next: string[]) => {
    setRemoved(next)
    try {
      window.localStorage.setItem('vitality:eq:removed', JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }

  // Drag-reorder: while dragging over a sibling, move the dragged tile there live.
  const moveTo = (src: string, dst: string) => {
    if (src === dst) return
    const cur = gridIds.slice()
    const from = cur.indexOf(src)
    const to = cur.indexOf(dst)
    if (from < 0 || to < 0) return
    cur.splice(from, 1)
    cur.splice(to, 0, src)
    saveOrder(cur)
  }

  // (Re)bind the living orbs whenever the SET of tiles on the board changes.
  // A tile added to a new row is a new DOM node, so initVeeTiles has to run
  // again for its orb to attach; a removed one lets its orb go with it. The
  // column count is CSS's business now — resizing reflows the grid without
  // touching a single node, and the orbs live in SVG user space, so a resize
  // needs no re-bind.
  useEffect(() => {
    if (!ref.current || !mounted) return
    return initVeeTiles(ref.current, { score: null, showNumber: false })
  }, [mounted, gridKey])

  // Esc closes any overlay.
  useEffect(() => {
    if (!openId && !connectId && !newOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenId(null)
        setConnectId(null)
        setNewOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openId, connectId, newOpen])

  if (!mounted) return null

  const openSlot = (id: string) => {
    if (editing) return // while editing, taps rearrange — they don't open
    if (filled[id]) setOpenId(id)
    else setConnectId(id)
  }

  // Null-safe: a tile the core registry has never heard of is named after its
  // own id. The old lookup indexed CORE_TILES with the raw id and threw on
  // anything outside the union, which white-screened the whole board.
  const labelFor = (id: string) => tileLabel(id)

  const isEmpty = filledOrder.length === 0

  return (
    <div className={`veeTiles${editing ? ' editing' : ''}`} ref={ref}>
      {loaded && <RosterNotice problems={roster.problems} />}
      {!loaded ? null : isEmpty ? (
        // A fresh board shows the onboarding vision; a deliberately-scratched board
        // stays clean — just header + background, nothing in the middle.
        scratched ? null : <VisionEmptyState onNewTile={() => setNewOpen(true)} />
      ) : (
        // ── The equation: y on top (the mentor — the output), x + x + x below
        //    (the inputs — a 3-column grid, every tile the same size). ──
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <style>{`@keyframes goalPop { from { opacity: 0; transform: translateY(12px) scale(.94) } to { opacity: 1; transform: none } }`}</style>

          {/* the picked goal comes out — big, centred, in its own colour */}
          <div className="equationGoal" style={{ textAlign: 'center', minHeight: 46 }}>
            <span
              key={goal?.id ?? 'none'}
              style={{
                display: 'inline-block',
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: 'clamp(22px, 3.2vw, 34px)',
                color: goal?.accent ?? 'var(--mint, #6EE7B7)',
                textShadow: `0 0 34px ${goal?.accent ?? '#6EE7B7'}44`,
                overflowWrap: 'anywhere',
              }}
            >
              {goal?.id === 'overall' ? '★ ' : ''}
              {goal?.title ?? ''}
            </span>
          </div>

          {/* y = the goal picker — every goal visible, one tap to switch */}
          <div className="equationPicker" style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <span style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic', fontSize: 22, color: goal?.accent ?? 'var(--mint, #6EE7B7)', transition: 'color .8s ease' }}>y</span>
            <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--muted, #8a8f98)' }}>=</span>

            {/* main (★) goal stands alone; the standalone goals share ONE border */}
            {(() => {
              const gs = mounted ? allGoals() : []
              const mainG = gs.find((g) => g.id === 'overall')
              const others = gs.filter((g) => g.id !== 'overall')
              const pick = (g: Goal) => {
                setActiveGoalId(g.id)
                setGoal(g)
                try {
                  window.dispatchEvent(new CustomEvent('vitality:goal'))
                } catch {
                  /* ignore */
                }
              }
              const btn = (g: Goal, grouped: boolean) => {
                const on = g.id === goal?.id
                const main = g.id === 'overall'
                const gA = g.accent ?? '#6EE7B7'
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => pick(g)}
                    style={{
                      fontFamily: 'ui-monospace, Menlo, monospace',
                      fontSize: 11,
                      letterSpacing: '.12em',
                      textTransform: 'uppercase',
                      color: on || main ? gA : 'var(--muted, #8a8f98)',
                      background: on ? `${gA}1a` : 'transparent',
                      border: grouped ? 'none' : `1px solid ${on ? `${gA}88` : `${gA}44`}`,
                      boxShadow: grouped && on ? `inset 0 0 0 1px ${gA}66` : 'none',
                      borderRadius: 999,
                      padding: '0 15px',
                      minHeight: 'var(--touch)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {main ? '★ ' : ''}
                    {g.title}
                  </button>
                )
              }
              return (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', minWidth: 0 }}>
                  {mainG && btn(mainG, false)}
                  {others.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, border: '1px solid var(--border, #262626)', borderRadius: 999, padding: 4, flexWrap: 'wrap', minWidth: 0 }}>
                      {others.map((g) => btn(g, true))}
                    </div>
                  )}
                </div>
              )
            })()}

          </div>
          <details className="mobileGoals">
            <summary>Switch goal</summary>
            <div className="mobileGoalsList">
              {allGoals().map((g) => (
                <button
                  key={g.id}
                  type="button"
                  aria-current={g.id === goal?.id ? 'true' : undefined}
                  onClick={(e) => {
                    setActiveGoalId(g.id)
                    setGoal(g)
                    window.dispatchEvent(new CustomEvent('vitality:goal'))
                    e.currentTarget.closest('details')?.removeAttribute('open')
                  }}
                >
                  {g.id === 'overall' ? '★ ' : ''}{g.title}
                </button>
              ))}
            </div>
          </details>
          <TileFace
            id="vee"
            isVee
            core={null}
            fixed={{ width: '100%', height: 'var(--mentor-height, clamp(240px, 34vh, 340px))' }}
            kicker={goal?.title}
            onOpen={() => {
              if (!editing) setMentorAlive(true) // the mentor comes to life — no page load
            }}
          />

          <div className="equationInputs" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minWidth: 0 }}>
            <a href="/mentor" style={{ display: 'flex', alignItems: 'baseline', gap: 10, textDecoration: 'none', minWidth: 0 }}>
              <span style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic', fontSize: 22, color: goal?.accent ?? 'var(--mint, #6EE7B7)', transition: 'color .8s ease' }}>x</span>
              <span
                aria-hidden
                style={{
                  fontFamily: 'ui-monospace, Menlo, monospace',
                  fontSize: 11,
                  letterSpacing: '.16em',
                  textTransform: 'uppercase',
                  overflowWrap: 'anywhere',
                  minWidth: 0,
                  pointerEvents: 'none',
                  color: goal?.accent ?? 'var(--mint, #6EE7B7)',
                  opacity: xPeek ? 0.8 : 0,
                  transform: xPeek ? 'translateX(0)' : 'translateX(-6px)',
                  filter: xPeek ? 'blur(0)' : 'blur(3px)',
                  transition:
                    'opacity .9s cubic-bezier(.16,1,.3,1), transform .9s cubic-bezier(.16,1,.3,1), filter .9s ease',
                }}
              >
                = {xPercents}
              </span>
            </a>
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              style={{
                background: editing ? 'var(--mint)' : 'transparent',
                color: editing ? 'var(--mint-ink, #042a1c)' : 'var(--muted)',
                border: editing ? 'none' : '1px solid var(--border)',
                borderRadius: 999,
                padding: '0 16px',
                minHeight: 'var(--touch)',
                display: 'inline-flex',
                flexShrink: 0,
                alignItems: 'center',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {editing ? 'Done' : 'Edit'}
            </button>
          </div>
          <div className="mobileWeights" aria-label="Input weights for active goal">
            {gridIds.map((id) => <span key={id}>{labelFor(id)} <strong>{weights[id] ?? 0}%</strong></span>)}
          </div>

          <div className="xGrid">
            {gridIds.map((id, index) => (
              <div
                key={id}
                className="xCell"
                draggable={editing}
                onDragStart={() => {
                  dragId.current = id
                }}
                onDragOver={(e) => {
                  if (editing && dragId.current && dragId.current !== id) {
                    e.preventDefault()
                    moveTo(dragId.current, id)
                  }
                }}
                onDragEnd={() => {
                  dragId.current = null
                }}
              >
                <TileFace
                  id={id}
                  isVee={false}
                  core={coreTileFor(id)}
                  editable
                  onRemove={editing ? () => saveRemoved([...removed, id]) : undefined}
                  weight={weights[id] ?? 0}
                  accent={goal?.accent}
                  onOpen={() => openSlot(id)}
                />
                {editing && (
                  <div className="reorderControls">
                    <button type="button" disabled={index === 0} aria-label={`Move ${labelFor(id)} earlier`} onClick={() => moveTo(id, gridIds[index - 1])}>↑</button>
                    <button type="button" disabled={index === gridIds.length - 1} aria-label={`Move ${labelFor(id)} later`} onClick={() => moveTo(gridIds[index + 1], id)}>↓</button>
                  </div>
                )}
              </div>
            ))}

            {/* the + tile: the same cell, transparent — build the next input */}
            <button type="button" className="xAdd" onClick={() => setNewOpen(true)} aria-label="New tile">
              +
            </button>
          </div>
        </div>
      )}

      {openId && filled[openId] && (
        <OpenTileOverlay
          key={openId}
          slot={{ id: openId, name: labelFor(openId), html: filled[openId] }}
          register={register}
          unregister={unregister}
          onClose={() => setOpenId(null)}
        />
      )}

      {connectId && (
        <ConnectorOverlay id={connectId} label={labelFor(connectId)} onClose={() => setConnectId(null)} />
      )}

      {newOpen && (
        <NewTileOverlay
          onClose={() => setNewOpen(false)}
          onRescan={rescan}
        />
      )}

      {!isEmpty && (
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 6 }}>
          <button
            type="button"
            onClick={() => setShowWelcome(true)}
            aria-label="See the vision"
            style={{
              background: 'transparent',
              color: 'var(--muted)',
              border: '1px solid var(--border)',
              borderRadius: 999,
              padding: '10px 16px',
              fontWeight: 500,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            See the vision
          </button>
        </div>
      )}

      {showWelcome && <EmptyCanvas onBack={() => setShowWelcome(false)} />}

      {/* the mentor, alive over the board — everything fades behind it */}
      {mentorAlive && (
        <div
          className="mentorOverlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 95,
            overflowY: 'auto',
            overscrollBehavior: 'contain', // reaching the ends must not scroll the board behind
            background: 'rgba(3, 8, 6, .93)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <MentorPage
            overlay
            onClose={() => {
              setMentorAlive(false)
              // whatever goal they picked in there, the board follows it
              setGoal(readActiveGoal())
              try {
                window.dispatchEvent(new CustomEvent('vitality:goal'))
              } catch {
                /* ignore */
              }
            }}
          />
        </div>
      )}
    </div>
  )
}
