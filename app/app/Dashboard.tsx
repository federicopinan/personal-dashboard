'use client'

import { useEffect, useState, useCallback, useId, useRef } from 'react'
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
  const pill = (id: TabType, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => { setTab(id); setArmed(false) }}
      style={{
        ...mono, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase',
        color: tab === id ? 'var(--fg, #fff)' : 'var(--muted, #8a8f98)',
        background: tab === id ? 'rgba(255,255,255,.08)' : 'transparent',
        border: 'none', borderRadius: 999, padding: '7px 13px', cursor: 'pointer',
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
      style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,.62)', backdropFilter: 'blur(6px)' }}
    >
      <div style={{ width: 'min(540px, 100%)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-elevated, #121212)', border: '1px solid var(--border, #262626)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 10px', borderBottom: '1px solid var(--border, #262626)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: 2, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', maxWidth: 'calc(100% - 36px)' }}>
            {pill('profile', 'profile')}
            {pill('goals', 'equation')}
            {pill('data', 'data')}
            {pill('how', 'info')}
            {pill('yours', 'style')}
          </div>
          <button type="button" aria-label="Close" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--muted, #8a8f98)', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '20px 24px' }}>
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
                    {['train', 'fuel', 'vitals', 'peak', 'finance'].map((tileKey) => {
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

function NotesSection() {
  const [notes, setNotes] = useState<{ id: string; text: string; ts: number }[]>([])
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    try { const r = localStorage.getItem('vitality:notes'); if (r) setNotes(JSON.parse(r)) } catch { setError('Could not load saved notes.') }
  }, [])

  const persist = (next: typeof notes) => {
    try { localStorage.setItem('vitality:notes', JSON.stringify(next)); setNotes(next); setError(''); return true }
    catch { setError('Could not save notes. Your changes were not saved.'); return false }
  }

  const addNote = () => {
    if (!input.trim()) return
    const next = [{ id: crypto.randomUUID(), text: input.trim(), ts: Date.now() }, ...notes]
    if (persist(next)) setInput('')
  }

  const deleteNote = (id: string) => {
    const next = notes.filter(n => n.id !== id)
    persist(next)
  }

  const saveEdit = (id: string) => {
    if (!input.trim()) { setError('A note cannot be empty. The original note is unchanged.'); return }
    if (persist(notes.map(n => n.id === id ? { ...n, text: input.trim() } : n))) { setEditing(null); setInput('') }
  }
  const cancelEdit = () => { setEditing(null); setInput(''); setError('') }
  const visible = notes.filter(n => n.text.toLowerCase().includes(query.toLowerCase()))

  return (
    <div style={{ marginTop: 32 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', margin: '0 0 12px' }}>Notes</h3>
      {error && <p role="alert" style={{ color: '#ff8b8b', fontSize: 13 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') editing ? saveEdit(editing) : addNote(); else if (e.key === 'Escape' && editing) cancelEdit() }}
          placeholder="Write a note..."
          style={{ flex: 1, padding: '10px 14px', minHeight: 42, borderRadius: 8, border: '1px solid var(--border, #262626)', background: 'var(--bg, #0a0a0a)', color: 'var(--fg, #fff)', fontSize: 16, outline: 'none' }}
        />
        <button onClick={() => editing ? saveEdit(editing) : addNote()} style={{ padding: '10px 18px', minHeight: 42, borderRadius: 8, border: 'none', background: 'var(--mint, #6EE7B7)', color: 'var(--mint-ink, #042a1c)', fontWeight: 600, cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap' }}>
          {editing ? 'Save' : 'Add'}
        </button>
        {editing && <button type="button" onClick={cancelEdit} style={{ padding: '10px 12px', minHeight: 42, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg)', cursor: 'pointer' }}>Cancel edit</button>}
      </div>
      <input aria-label="Search notes" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search notes..." style={{ width: '100%', marginBottom: 12, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border, #262626)', background: 'var(--bg, #0a0a0a)', color: 'var(--fg, #fff)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {visible.map(n => (
          <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px', background: 'var(--bg-elevated, #121212)', borderRadius: 8, border: '1px solid var(--border, #1c1c1c)' }}>
            <div style={{ flex: 1 }}><small style={{ color: 'var(--muted)' }}>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(n.ts)}</small><div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--fg)' }}>{n.text}</div></div>
            <button onClick={() => { setEditing(n.id); setInput(n.text) }} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>Edit</button>
            <button onClick={() => deleteNote(n.id)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 2, fontSize: 16, lineHeight: 1 }} title="Delete">×</button>
          </div>
        ))}
        {notes.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>No notes yet.</p>}
      </div>
    </div>
  )
}

function TasksSection() {
  const [tasks, setTasks] = useState<{ id: string; text: string; done: boolean }[]>([])
  const [input, setInput] = useState('')
  const [day, setDay] = useState(() => localDateKey(new Date()))
  const [history, setHistory] = useState<string[]>([])
  const [error, setError] = useState('')
  // What the date field is showing while it is being edited. Kept apart from
  // `day` so a half-typed date never reloads the task list, and so Escape has
  // something to restore.
  const [dayDraft, setDayDraft] = useState(day)
  const [dayError, setDayError] = useState('')
  const [dayStatus, setDayStatus] = useState('')
  // Set by Escape, consumed by onBlur: reverting the draft and blurring in the
  // same tick would otherwise let the blur handler commit the stale DOM value.
  const dayCancelRef = useRef(false)
  // A day change made by stepping/chip/picker (not the first mount) is read out
  // to assistive tech, which cannot see the date change on screen.
  const dayMountedRef = useRef(false)
  const dayFieldId = useId()
  const dayTextRef = useRef<HTMLInputElement>(null)
  const dayNativeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i) || '').filter(k => /^vitality:tasks:\d{4}-\d{2}-\d{2}$/.test(k)).map(k => k.slice('vitality:tasks:'.length))
      setHistory(keys.sort().reverse())
    } catch { setError('Could not read task history.') }
  }, [])

  useEffect(() => {
    try { const r = localStorage.getItem(`vitality:tasks:${day}`); setTasks(r ? JSON.parse(r) : []); setError('') }
    catch { setTasks([]); setError('Could not load tasks for this date.') }
  }, [day])

  // Any committed change re-seeds the field, so stepping or picking a chip can
  // never leave a stale edit on screen.
  useEffect(() => { setDayDraft(day) }, [day])

  useEffect(() => {
    if (!dayMountedRef.current) { dayMountedRef.current = true; return }
    setDayStatus(formatDayKey(day))
  }, [day])

  const save = useCallback((next: typeof tasks, target = day) => {
    try {
      localStorage.setItem(`vitality:tasks:${target}`, JSON.stringify(next))
      setTasks(next); setHistory(prev => Array.from(new Set([target, ...prev])).sort().reverse()); setError('')
      return true
    } catch { setError('Could not save tasks. Your changes were not saved.'); return false }
  }, [day])

  /* The one and only way `day` changes. Every path — the two steppers, the text
     field, the native picker, the saved-date chips — funnels through here, and
     a value is only ever accepted once `localDateKey` has produced it. That is
     what guarantees the selected day, the printed date and the
     `vitality:tasks:<key>` read/write can never drift onto a different calendar
     day (e.g. a UTC shift for anyone west of Greenwich). */
  const commitDay = (raw: string) => {
    const next = normaliseDayKey(raw)
    if (!next) { setDayDraft(day); setDayError('Use a real date as YYYY-MM-DD — for example 2026-10-01.'); return }
    setDayError('')
    // Same day back: skip setDay so the task list does not reload, but still
    // rewrite the field with the canonical padding (2026-1-1 -> 2026-01-01).
    if (next === day) setDayDraft(next)
    else setDay(next)
  }

  const openCalendar = () => {
    const el = dayNativeRef.current
    // showPicker() is Chromium / Safari 16.4+ / Firefox 101+, and throws
    // NotAllowedError outside a click. Anything it refuses falls back to the
    // text field, so the button is never a dead end.
    if (el && typeof el.showPicker === 'function') {
      try { el.showPicker(); return } catch { /* fall through to the text field */ }
    }
    dayTextRef.current?.focus()
  }

  const addTask = () => {
    if (!input.trim()) return
    if (save([...tasks, { id: crypto.randomUUID(), text: input.trim(), done: false }])) setInput('')
  }

  const toggle = (id: string) => {
    save(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  const deleteTask = (id: string) => {
    save(tasks.filter(t => t.id !== id))
  }

  return (
    <div style={{ marginTop: 32 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', margin: '0 0 12px' }}>Tasks by local date</h3>
      {error && <p role="alert" style={{ color: '#ff8b8b', fontSize: 13 }}>{error}</p>}
      <div className={styles.dayPick}>
        <label className={styles.dayLabel} htmlFor={dayFieldId}>Task day</label>
        <div className={styles.dayControl}>
          <button type="button" className={styles.dayStep} onClick={() => commitDay(shiftDayKey(day, -1))} aria-label={`Previous day, ${formatDayKey(shiftDayKey(day, -1))}`} title="Previous day">←</button>
          <div className={styles.dayReadout}>
            <span className={styles.dayDisplay}>{formatDayKey(day)}</span>
            <input
              id={dayFieldId}
              ref={dayTextRef}
              className={styles.dayInput}
              value={dayDraft}
              onChange={e => { setDayDraft(e.target.value); setDayError('') }}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); commitDay(e.currentTarget.value) }
                // Escape abandons the edit and keeps the caret, so the date can
                // be retyped without reaching for the mouse. cancelRef stops the
                // blur that follows from re-committing the abandoned text.
                else if (e.key === 'Escape') { dayCancelRef.current = true; setDayDraft(day); setDayError('') }
              }}
              onBlur={e => {
                if (dayCancelRef.current) { dayCancelRef.current = false; return }
                commitDay(e.currentTarget.value)
              }}
              placeholder="YYYY-MM-DD"
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={dayError ? true : undefined}
              aria-describedby={dayError ? `${dayFieldId}-error` : undefined}
            />
          </div>
          <button type="button" className={styles.dayStep} onClick={() => commitDay(shiftDayKey(day, 1))} aria-label={`Next day, ${formatDayKey(shiftDayKey(day, 1))}`} title="Next day">→</button>
          <button type="button" className={styles.dayIconBtn} onClick={openCalendar} aria-label="Open calendar picker" title="Open calendar picker">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <rect x="3.5" y="5" width="17" height="15" rx="3" />
              <path d="M3.5 10h17M8 3v4M16 3v4" />
            </svg>
          </button>
        </div>
        {/* Not display:none — showPicker() refuses an unrendered input. Kept out
            of the tab order and out of the a11y tree; the button above is its
            accessible stand-in. */}
        <input
          ref={dayNativeRef}
          type="date"
          value={day}
          onChange={e => commitDay(e.target.value)}
          tabIndex={-1}
          aria-hidden="true"
          className={styles.srOnly}
        />
        {dayError && <p id={`${dayFieldId}-error`} role="alert" className={styles.dayError}>{dayError}</p>}
        <span role="status" className={styles.srOnly}>{dayStatus}</span>
        {history.length > 1 && <div className={styles.dayChips}>
          <span className={styles.dayChipsLabel}>Saved dates</span>
          {history.map(date => <button type="button" key={date} className={styles.dayChip} onClick={() => commitDay(date)} aria-pressed={day === date}>{date}</button>)}
        </div>}
      </div>
      <button type="button" onClick={() => { const prev = new Date(`${day}T12:00:00`); prev.setDate(prev.getDate() - 1); const source = localDateKey(prev); try { const prior = JSON.parse(localStorage.getItem(`vitality:tasks:${source}`) || '[]'); const targetIds = new Set(tasks.map(t => t.id)); const carry = prior.filter((t: { id: string; done: boolean }) => !t.done && !targetIds.has(t.id)); if (carry.length) save([...tasks, ...carry.map((t: { id: string; text: string }) => ({ id: t.id, text: t.text, done: false }))]); else setError('No new incomplete tasks to carry forward.') } catch { setError('Could not read the previous date’s tasks.') } }} style={{ marginBottom: 12, padding: '7px 12px', borderRadius: 8, background: 'transparent', color: 'var(--fg)', border: '1px solid var(--border)' }}>Carry incomplete tasks from previous date</button>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addTask() }}
          placeholder="Add a task..."
          style={{ flex: 1, padding: '10px 14px', minHeight: 42, borderRadius: 8, border: '1px solid var(--border, #262626)', background: 'var(--bg, #0a0a0a)', color: 'var(--fg, #fff)', fontSize: 16, outline: 'none' }}
        />
        <button onClick={addTask} style={{ padding: '10px 18px', minHeight: 42, borderRadius: 8, border: 'none', background: 'var(--mint, #6EE7B7)', color: 'var(--mint-ink, #042a1c)', fontWeight: 600, cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap' }}>
          Add
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tasks.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-elevated, #121212)', borderRadius: 8, border: '1px solid var(--border, #1c1c1c)' }}>
            <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} style={{ accentColor: 'var(--mint, #6EE7B7)', width: 16, height: 16, cursor: 'pointer' }} />
            <span style={{ flex: 1, fontSize: 14, color: 'var(--fg)', textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.5 : 1 }}>{t.text}</span>
            <button onClick={() => deleteTask(t.id)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 2, fontSize: 16, lineHeight: 1 }} title="Delete">×</button>
          </div>
        ))}
        {tasks.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>No tasks for this date.</p>}
      </div>
    </div>
  )
}

// Parses a `YYYY-MM-DD` key into a LOCAL Date pinned to 12:00. Noon is the
// anchor that makes the day arithmetic safe: a DST shift or an extreme zone
// (UTC-12 .. UTC+14) can never move noon onto the neighbouring calendar day.
// Returns null for anything that is not a real date, so `2026-02-31` and
// `2026-13-01` are rejected rather than silently rolling into March / next year.
function dayFromKey(key: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const probe = new Date(y, mo - 1, d, 12, 0, 0, 0)
  // Round-trips the parts, which also rejects years < 100 (the Date constructor
  // would map them onto 1900+).
  if (probe.getFullYear() !== y || probe.getMonth() !== mo - 1 || probe.getDate() !== d) return null
  return probe
}

// One step of the day, in local time, across month and year boundaries.
function shiftDayKey(key: string, delta: number) {
  const base = dayFromKey(key)
  if (!base) return key
  base.setDate(base.getDate() + delta)
  return localDateKey(base)
}

// Accepts the shorthand a person types (2026-1-1) and returns a canonical key
// produced by localDateKey itself. The result is the ONLY kind of value that
// may ever reach setDay, which is what pins storage to local calendar days.
function normaliseDayKey(raw: string) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(raw.trim())
  if (!m) return null
  const parsed = dayFromKey(`${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`)
  return parsed ? localDateKey(parsed) : null
}

// The readable form of a key, formatted from the key's OWN digits. Pinning the
// zone to UTC and the locale to en-US makes this a pure function of the string:
// the server pass and the browser produce byte-identical text whatever the
// machine timezone or locale is, so the label can never disagree with the key
// (nor cause a hydration mismatch). en-US matches the dashboard header.
const DAY_FORMAT = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' })

function formatDayKey(key: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!m) return ''
  return DAY_FORMAT.format(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)))
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
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
          <NotesSection />
          <TasksSection />
        </div>
      </div>

      {settingsOpen && <SettingsPanel userId={userId} onClose={() => setSettingsOpen(false)} />}
    </main>
  )
}
