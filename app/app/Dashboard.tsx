'use client'

import { useEffect, useState, useCallback } from 'react'
import styles from './dashboard.module.css'
import DashboardHeader from './DashboardHeader'
import WelcomeBackdrop from '@/components/WelcomeBackdrop'
import DashboardHeaderGem from './DashboardHeaderGem'
import DashboardGrid from './DashboardGrid'
import '@/components/veeTiles.css'
import { dashboardChrome, backgroundAccent, DEFAULT_CHROME, type DashboardChrome } from '@/lib/tiles/dashboardChrome'
import { activeGoal } from '@/lib/tiles/weights'
import { tileStore } from '@/lib/tiles/tileStore'

interface DashboardProps {
  firstName: string | null
  userId: string
}

const MAKE_IT_YOURS_PROMPT =
  "Make this dashboard MINE. Before you touch anything, talk it through with me — one question at a time: do I keep the gem avatar? The art on each tile? The mentor tile's design? The background (mountains + particles)? Then ask how I want it to FEEL — mood, colors, energy. Only after my answers: strip every piece of Vitality style I let go of, restyle the board to me, and keep every tile and all my data working."

function SettingsPanel({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [tab, setTab] = useState<'how' | 'yours' | 'data'>('how')
  const [copied, setCopied] = useState<string | null>(null)
  const [dataIds, setDataIds] = useState<string[]>([])
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    setDataIds(tileStore.listDataIds(userId))
  }, [userId])

  const copy = (text: string, tag: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(tag)
      window.setTimeout(() => setCopied(null), 1600)
    })
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
  const pill = (id: 'how' | 'yours' | 'data', label: string) => (
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

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Settings"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(0,0,0,.62)', backdropFilter: 'blur(6px)' }}
    >
      <div style={{ width: 'min(520px, 100%)', background: 'var(--bg-elevated, #121212)', border: '1px solid var(--border, #262626)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 10px', borderBottom: '1px solid var(--border, #262626)' }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {pill('how', 'How it works')}
            {pill('yours', 'Make it yours')}
            {pill('data', 'Tile data')}
          </div>
          <button type="button" aria-label="Close" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--muted, #8a8f98)', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
          </button>
        </div>

        {tab === 'how' && (
          <div style={{ padding: '22px 24px' }}>
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
              <li><strong style={{ color: 'var(--fg)' }}>mcp connector</strong> — your own token; I write in from anywhere</li>
              <li><strong style={{ color: 'var(--fg)' }}>scheduled sweeps</strong> — I run on a schedule, noticing while you sleep</li>
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
              Don&apos;t like the demo numbers? <strong style={{ color: 'var(--fg)' }}>Every card stays</strong> — only
              what&apos;s inside goes black. Wipe one tile to keep it as a clean shell, or detonate all
              the data at once.
            </p>
            {dataIds.length === 0 ? (
              <p style={{ ...mono, fontSize: 11, color: 'var(--muted, #8a8f98)', margin: '18px 0 0' }}>
                no saved tile data on this device — the cards are already clean.
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
  )
}

function NotesSection() {
  const [notes, setNotes] = useState<{ id: string; text: string; ts: number }[]>([])
  const [input, setInput] = useState('')

  useEffect(() => {
    try { const r = localStorage.getItem('vitality:notes'); if (r) setNotes(JSON.parse(r)) } catch {}
  }, [])

  const addNote = () => {
    if (!input.trim()) return
    const n = { id: crypto.randomUUID(), text: input.trim(), ts: Date.now() }
    const next = [n, ...notes]
    setNotes(next)
    localStorage.setItem('vitality:notes', JSON.stringify(next))
    setInput('')
  }

  const deleteNote = (id: string) => {
    const next = notes.filter(n => n.id !== id)
    setNotes(next)
    localStorage.setItem('vitality:notes', JSON.stringify(next))
  }

  return (
    <div style={{ marginTop: 32 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', margin: '0 0 12px' }}>Notes</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addNote() }}
          placeholder="Write a note..."
          style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border, #262626)', background: 'var(--bg, #0a0a0a)', color: 'var(--fg, #fff)', fontSize: 14, outline: 'none' }}
        />
        <button onClick={addNote} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--mint, #6EE7B7)', color: 'var(--mint-ink, #042a1c)', fontWeight: 600, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>
          Add
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {notes.map(n => (
          <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px', background: 'var(--bg-elevated, #121212)', borderRadius: 8, border: '1px solid var(--border, #1c1c1c)' }}>
            <span style={{ flex: 1, fontSize: 14, lineHeight: 1.5, color: 'var(--fg)' }}>{n.text}</span>
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

  useEffect(() => {
    try {
      // load today's tasks
      const today = new Date().toISOString().slice(0, 10)
      const r = localStorage.getItem(`vitality:tasks:${today}`)
      if (r) setTasks(JSON.parse(r))
    } catch {}
  }, [])

  const save = useCallback((next: typeof tasks) => {
    setTasks(next)
    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem(`vitality:tasks:${today}`, JSON.stringify(next))
  }, [])

  const addTask = () => {
    if (!input.trim()) return
    save([...tasks, { id: crypto.randomUUID(), text: input.trim(), done: false }])
    setInput('')
  }

  const toggle = (id: string) => {
    save(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  const deleteTask = (id: string) => {
    save(tasks.filter(t => t.id !== id))
  }

  return (
    <div style={{ marginTop: 32 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', margin: '0 0 12px' }}>Today's Tasks</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addTask() }}
          placeholder="Add a task..."
          style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border, #262626)', background: 'var(--bg, #0a0a0a)', color: 'var(--fg, #fff)', fontSize: 14, outline: 'none' }}
        />
        <button onClick={addTask} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--mint, #6EE7B7)', color: 'var(--mint-ink, #042a1c)', fontWeight: 600, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>
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
        {tasks.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>No tasks for today.</p>}
      </div>
    </div>
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
          <NotesSection />
          <TasksSection />
        </div>
      </div>

      {settingsOpen && <SettingsPanel userId={userId} onClose={() => setSettingsOpen(false)} />}
    </main>
  )
}
