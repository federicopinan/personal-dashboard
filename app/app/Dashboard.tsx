'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './dashboard.module.css'
import DashboardHeader from './DashboardHeader'
import WelcomeBackdrop from '@/components/WelcomeBackdrop'
import DashboardHeaderGem from './DashboardHeaderGem'
import DashboardGrid from './DashboardGrid'
import '@/components/veeTiles.css'
import { dashboardChrome, backgroundAccent, DEFAULT_CHROME, type DashboardChrome } from '@/lib/tiles/dashboardChrome'
import { activeGoal, goals, saveGoals, activeGoalId, setActiveGoalId, type Goal } from '@/lib/tiles/weights'
import { profile, saveProfile, type Profile } from '@/lib/tiles/profile'
import { tileStore } from '@/lib/tiles/tileStore'
import { localDateKey } from '@/lib/localDate'

interface DashboardProps {
  firstName: string | null
  userId: string
}

const MAKE_IT_YOURS_PROMPT =
  "Make this dashboard MINE. Before you touch anything, talk it through with me — one question at a time: do I keep the gem avatar? The art on each tile? The mentor tile's design? The background (mountains + particles)? Then ask how I want it to FEEL — mood, colors, energy. Only after my answers: strip every piece of Vitality style I let go of, restyle the board to me, and keep every tile and all my data working."

type TabType = 'profile' | 'goals' | 'how' | 'yours' | 'data'

function SettingsPanel({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [tab, setTab] = useState<TabType>('profile')
  const [copied, setCopied] = useState<string | null>(null)
  const [dataIds, setDataIds] = useState<string[]>([])
  const [armed, setArmed] = useState(false)

  // Profile state
  const [prof, setProf] = useState<Profile>(() => profile())
  const [profSaved, setProfSaved] = useState(false)

  // Goals state
  const [goalList, setGoalList] = useState<Goal[]>(() => goals())
  const [selectedGId, setSelectedGId] = useState<string>(() => activeGoalId() || (goals()[0]?.id ?? ''))
  const [goalsSaved, setGoalsSaved] = useState(false)

  useEffect(() => {
    setDataIds(tileStore.listDataIds(userId))
  }, [userId])

  // The equation tab keeps its own copy of the goals, seeded once at mount, so a
  // delete in the mentor (or a save from another tab) would leave this panel
  // offering a goal that no longer exists until a reload. Re-read on the same bus
  // the save already uses. Unsaved weight edits are the one thing this drops —
  // the panel is modal, so nothing can change the goals underneath it while it
  // is open except the mentor's own Delete, and losing an uncommitted slider
  // drag to a deliberate delete is the smaller wrong.
  useEffect(() => {
    const onGoal = () => {
      setGoalList(goals())
      setSelectedGId(activeGoalId() || goals()[0]?.id || '')
    }
    window.addEventListener('vitality:goal', onGoal)
    return () => window.removeEventListener('vitality:goal', onGoal)
  }, [])

  const copy = (text: string, tag: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(tag)
      window.setTimeout(() => setCopied(null), 1600)
    })
  }

  const handleSaveProfile = () => {
    saveProfile(prof)
    setProfSaved(true)
    window.setTimeout(() => setProfSaved(false), 2000)
  }

  const handleSaveGoals = () => {
    saveGoals(goalList)
    setActiveGoalId(selectedGId)
    setGoalsSaved(true)
    window.dispatchEvent(new Event('vitality:goal'))
    window.setTimeout(() => setGoalsSaved(false), 2000)
  }

  const wipeOne = async (id: string) => {
    await tileStore.clearData(userId, id)
    window.location.reload()
  }
  const wipeAll = async () => {
    if (!armed) { setArmed(true); return }
    await Promise.all(dataIds.map((id) => tileStore.clearData(userId, id)))
    window.location.reload()
  }

  const mono: React.CSSProperties = {
    fontFamily: 'ui-monospace, Menlo, monospace',
    letterSpacing: '.08em',
  }
  // The pill's box (padding, height, radius) is in dashboard.module.css because a
  // tab has to reach --touch on a phone and an inline style cannot be reached by
  // a media query. Only the selected/unselected colours stay here, since they
  // are state, not shape.
  const pill = (id: TabType, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => { setTab(id); setArmed(false) }}
      className={styles.sheetTab}
      style={{
        ...mono, letterSpacing: '.12em', textTransform: 'uppercase',
        color: tab === id ? 'var(--fg, #fff)' : 'var(--muted, #8a8f98)',
        background: tab === id ? 'rgba(255,255,255,.08)' : 'transparent',
      }}
    >
      {label}
    </button>
  )

  const currentGoal = goalList.find((g) => g.id === selectedGId) ?? goalList[0]

  const updateWeight = (tileKey: string, val: number) => {
    setGoalList((prev) =>
      prev.map((g) =>
        g.id === selectedGId
          ? { ...g, weights: { ...g.weights, [tileKey]: val } }
          : g
      )
    )
  }

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Settings"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      className={styles.sheetScrim}
    >
      <div className={styles.sheetCard}>
        <div className={styles.sheetTop}>
          <div className={styles.sheetTabs}>
            {pill('profile', 'profile')}
            {pill('goals', 'equation')}
            {pill('data', 'data')}
            {pill('how', 'info')}
            {pill('yours', 'style')}
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className={styles.sheetClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
          </button>
        </div>

        <div className={styles.sheetBody}>
          {tab === 'profile' && (
            <div>
              <p style={{ fontWeight: 600, color: 'var(--fg, #fff)', margin: '0 0 14px', fontSize: 15 }}>User profile</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Name</label>
                  <input
                    type="text"
                    value={prof.name ?? ''}
                    onChange={(e) => setProf({ ...prof, name: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--bg, #000)', border: '1px solid var(--border, #262626)', color: 'var(--fg, #fff)', fontSize: 16 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Age</label>
                  <input
                    type="number"
                    value={prof.age ?? ''}
                    onChange={(e) => setProf({ ...prof, age: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--bg, #000)', border: '1px solid var(--border, #262626)', color: 'var(--fg, #fff)', fontSize: 16 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Weight (kg)</label>
                  <input
                    type="number"
                    value={prof.weightKg ?? ''}
                    onChange={(e) => setProf({ ...prof, weightKg: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--bg, #000)', border: '1px solid var(--border, #262626)', color: 'var(--fg, #fff)', fontSize: 16 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Height (cm)</label>
                  <input
                    type="number"
                    value={prof.heightCm ?? ''}
                    onChange={(e) => setProf({ ...prof, heightCm: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--bg, #000)', border: '1px solid var(--border, #262626)', color: 'var(--fg, #fff)', fontSize: 16 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Sex</label>
                  <select
                    value={prof.sex ?? 'male'}
                    onChange={(e) => setProf({ ...prof, sex: e.target.value as 'male' | 'female' })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--bg, #000)', border: '1px solid var(--border, #262626)', color: 'var(--fg, #fff)', fontSize: 16 }}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Units</label>
                  <select
                    value={prof.units ?? 'metric'}
                    onChange={(e) => setProf({ ...prof, units: e.target.value as 'metric' | 'imperial' })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--bg, #000)', border: '1px solid var(--border, #262626)', color: 'var(--fg, #fff)', fontSize: 16 }}
                  >
                    <option value="metric">Metric (kg, cm)</option>
                    <option value="imperial">Imperial (lbs, ft)</option>
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSaveProfile}
                style={{ width: '100%', marginTop: 20, padding: '0.7rem 1rem', borderRadius: 999, background: 'var(--mint, #6EE7B7)', color: 'var(--mint-ink, #042a1c)', border: 'none', fontWeight: 600, cursor: 'pointer' }}
              >
                {profSaved ? 'Saved ✓' : 'Save profile'}
              </button>
            </div>
          )}

          {tab === 'goals' && (
            <div>
              <p style={{ fontWeight: 600, color: 'var(--fg, #fff)', margin: '0 0 14px', fontSize: 15 }}>Active goal & equation weights</p>
              
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Select active goal</label>
              <select
                value={selectedGId}
                onChange={(e) => setSelectedGId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--bg, #000)', border: '1px solid var(--border, #262626)', color: 'var(--fg, #fff)', fontSize: 16, marginBottom: 16 }}
              >
                {goalList.map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>

              {currentGoal && (
                <div>
                  <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Goal name</label>
                  <input
                    type="text"
                    value={currentGoal.title}
                    onChange={(e) => {
                      const val = e.target.value
                      setGoalList((prev) => prev.map((g) => g.id === selectedGId ? { ...g, title: val } : g))
                    }}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--bg, #000)', border: '1px solid var(--border, #262626)', color: 'var(--fg, #fff)', fontSize: 16, marginBottom: 16 }}
                  />

                  <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>Weights per tile (%):</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {['train', 'fuel', 'vitals', 'sleep', 'screen', 'water', 'peak', 'finance'].map((tileKey) => {
                      const weightVal = currentGoal.weights?.[tileKey] ?? 0
                      return (
                        <div key={tileKey} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <span style={{ fontSize: 13, textTransform: 'capitalize', color: 'var(--fg)', width: 70 }}>{tileKey}</span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={weightVal}
                            onChange={(e) => updateWeight(tileKey, Number(e.target.value))}
                            style={{ flex: 1, accentColor: 'var(--mint, #6EE7B7)' }}
                          />
                          <span style={{ fontSize: 13, color: 'var(--mint)', width: 40, textAlign: 'right' }}>{weightVal}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleSaveGoals}
                style={{ width: '100%', marginTop: 20, padding: '0.7rem 1rem', borderRadius: 999, background: 'var(--mint, #6EE7B7)', color: 'var(--mint-ink, #042a1c)', border: 'none', fontWeight: 600, cursor: 'pointer' }}
              >
                {goalsSaved ? 'Saved ✓' : 'Save equation changes'}
              </button>
            </div>
          )}

          {tab === 'how' && (
            <div>
              <p style={{ fontWeight: 600, color: 'var(--fg, #fff)', margin: '0 0 8px', fontSize: 15 }}>Your board renders. I think.</p>
            <p style={{ color: 'var(--muted)', lineHeight: 1.65, margin: 0, fontSize: 13.5 }}>
              I work as a loop: data runs <strong style={{ color: 'var(--fg)' }}>back and forth</strong>{' '}
              between your dashboard and me. I read what your tiles saved, retune your weights, goals and notices,
              and write them back — the board only renders. The longer the loop runs, the more it adjusts to <em>you</em>.
            </p>
            <p style={{ ...mono, fontSize: 10, letterSpacing: '.16em', color: 'var(--mint, #6EE7B7)', margin: '18px 0 8px', textTransform: 'uppercase' }}>
              how data gets in
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', color: 'var(--muted)', fontSize: 13, lineHeight: 2 }}>
              <li><strong style={{ color: 'var(--fg)' }}>manual</strong> — type it straight into a tile</li>
              <li><strong style={{ color: 'var(--fg)' }}>api keys</strong> — I fetch (stocks) and file it in</li>
            </ul>
          </div>
        )}

        {tab === 'yours' && (
          <div style={{ padding: '22px 24px' }}>
            <p style={{ color: 'var(--muted)', lineHeight: 1.6, margin: 0, fontSize: 14 }}>
              Want your own design? This is a <strong style={{ color: 'var(--fg)' }}>conversation, not a switch</strong>.
              Paste this into Claude Code and I&apos;ll talk it through with you first — what do you keep (the avatar,
              the tile art, the background), and how do you want it to feel — before I strip a single
              pixel of Vitality style.
            </p>
            <pre style={{ background: 'var(--bg, #000)', border: '1px solid var(--border, #262626)', borderRadius: 10, padding: '12px 14px', whiteSpace: 'pre-wrap', color: 'var(--fg)', fontSize: 12, lineHeight: 1.55, margin: '14px 0 0', maxHeight: 200, overflow: 'auto' }}>
              {MAKE_IT_YOURS_PROMPT}
            </pre>
            <button type="button" onClick={() => copy(MAKE_IT_YOURS_PROMPT, 'yours')} style={{ width: '100%', marginTop: 16, padding: '0.7rem 1rem', borderRadius: 999, background: 'var(--mint, #6EE7B7)', color: 'var(--mint-ink, #042a1c)', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
              {copied === 'yours' ? 'Copied ✓' : 'Copy the make-it-yours prompt'}
            </button>
          </div>
        )}

        {tab === 'data' && (
          <div style={{ padding: '22px 24px' }}>
            <p style={{ color: 'var(--muted)', lineHeight: 1.6, margin: 0, fontSize: 14 }}>
              Don&apos;t like the demo numbers? <strong style={{ color: 'var(--fg)' }}>Every tile stays</strong> — only
              what&apos;s inside goes black. Wipe one tile to keep it as a clean shell, or detonate all
              the data at once.
            </p>
            {dataIds.length === 0 ? (
              <p style={{ ...mono, fontSize: 11, color: 'var(--muted, #8a8f98)', margin: '18px 0 0' }}>
                no saved tile data on this device — the tiles are already clean.
              </p>
            ) : (
              <>
                <div style={{ margin: '16px 0 0' }}>
                  {dataIds.map((id) => (
                    <div key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border, #1c1c1c)' }}>
                      <span style={{ color: 'var(--fg)', fontSize: 13.5, textTransform: 'capitalize' }}>{id}</span>
                      <button type="button" onClick={() => wipeOne(id)} style={{ ...mono, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted, #8a8f98)', background: 'transparent', border: '1px solid var(--border, #262626)', borderRadius: 999, padding: '5px 12px', cursor: 'pointer' }}>
                        wipe
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={wipeAll} style={{ width: '100%', marginTop: 18, padding: '0.7rem 1rem', borderRadius: 999, background: armed ? '#e5484d' : 'transparent', color: armed ? '#fff' : 'var(--fg)', border: armed ? 'none' : '1px solid var(--border)', fontWeight: 600, cursor: 'pointer', transition: 'background .25s ease, color .25s ease' }}>
                  {armed ? 'Sure? Everything inside every tile goes black' : 'Detonate all tile data'}
                </button>
              </>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

// The board's way in to /notes and /tasks. Each card says what is actually in
// this browser right now — how many notes are saved, how many tasks are still
// open on today's local date. Both numbers are read once on mount and are
// display-only: nothing here writes, and a key that cannot be read leaves the
// line empty rather than claiming a zero.
function RouteLinks() {
  const [counts, setCounts] = useState<{ notes: number | null; open: number | null }>({ notes: null, open: null })

  useEffect(() => {
    let notes: number | null = null
    let open: number | null = null
    try {
      const saved = JSON.parse(localStorage.getItem('vitality:notes') || '[]')
      if (Array.isArray(saved)) notes = saved.length
    } catch { /* a payload we cannot read is not this button's error to report */ }
    try {
      const today = JSON.parse(localStorage.getItem(`vitality:tasks:${localDateKey(new Date())}`) || '[]')
      if (Array.isArray(today)) open = today.filter((t: { done?: boolean }) => !t.done).length
    } catch { /* same */ }
    setCounts({ notes, open })
  }, [])

  return (
    <>
      <div className={styles.navRow}>
        <Link href="/notes" className={styles.navCard}>
          <span className={styles.navKicker}>Notes</span>
          <span className={styles.navCount}>{counts.notes === null ? '' : `${counts.notes} saved`}</span>
          <span aria-hidden className={styles.navArrow}>→</span>
        </Link>
        <Link href="/tasks" className={styles.navCard}>
          <span className={styles.navKicker}>Tasks</span>
          <span className={styles.navCount}>{counts.open === null ? '' : `${counts.open} open today`}</span>
          <span aria-hidden className={styles.navArrow}>→</span>
        </Link>
      </div>
      {/* Deep work lives on its own app, so this leaves the dashboard entirely
          rather than opening a route here. It is its own row, not a third card
          in .navRow: that row is a fixed two-up and a third would break the
          pairing the two routes are meant to have. target/rel are the correct
          values for a deliberate cross-origin hand-off to a tool the user owns. */}
      <a className={styles.deepWork} href="https://locked-in.ai.studio" target="_blank" rel="noopener noreferrer">
        <span className={styles.navKicker}>Deep work</span>
        <span className={styles.deepWorkName}>locked-in.ai.studio</span>
        <span aria-hidden className={styles.navArrow}>↗</span>
      </a>
    </>
  )
}

export default function Dashboard({ firstName, userId }: DashboardProps) {
  const [chrome, setChrome] = useState<DashboardChrome | undefined>(undefined)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [goalAccent, setGoalAccent] = useState<string | undefined>(undefined)

  useEffect(() => {
    setChrome(dashboardChrome.get(userId))
    try { setGoalAccent(activeGoal()?.accent) } catch {}
    const onGoal = () => setGoalAccent(activeGoal()?.accent)
    window.addEventListener('vitality:goal', onGoal)
    return () => window.removeEventListener('vitality:goal', onGoal)
  }, [userId])

  const wallAccent = goalAccent ?? (chrome ? backgroundAccent(chrome.background) : '#6EE7B7')

  return (
    <main className={`${styles.page} ${styles.oneScreen} grain-overlay`} style={{ ['--wall-accent' as string]: wallAccent }}>
      <WelcomeBackdrop background={chrome?.background} />
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none', background: `radial-gradient(55% 40% at 50% 0%, ${wallAccent}1f, transparent 70%)`, transition: 'background 1.2s ease' }} />

      <div className={styles.shell}>
        <div className={styles.headerRow}>
          <DashboardHeaderGem className={styles.headerGem} />
          <DashboardHeader firstName={firstName} greeting={chrome?.greeting} date={chrome?.date} />
          <div
            className={styles.profileAvatar}
            onClick={() => setSettingsOpen(true)}
            role="button" tabIndex={0} title="Settings" aria-label="Settings"
            style={{ cursor: 'pointer' }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSettingsOpen(true) } }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </div>
        </div>

        <DashboardGrid userId={userId} chrome={chrome ?? DEFAULT_CHROME} />

        <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px 48px' }}>
          <RouteLinks />
        </div>
      </div>

      {settingsOpen && <SettingsPanel userId={userId} onClose={() => setSettingsOpen(false)} />}
    </main>
  )
}
