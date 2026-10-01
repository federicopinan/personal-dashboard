'use client'

import { useEffect, useState, useCallback, useId, useRef } from 'react'
import { localDateKey } from '@/lib/localDate'
// The day control's styles still live in the dashboard module, where UX-4 put
// them next to the focus-ring convention they follow. A CSS module is a
// class-name map, so importing it from here costs no layout coupling and the
// reviewed block stays where it is.
import styles from '@/app/app/dashboard.module.css'

/**
 * Tasks — one list per local calendar day. Each day is its own
 * `vitality:tasks:YYYY-MM-DD` key holding a JSON array of `{ id, text, done }`;
 * `day` is always a value localDateKey itself produced, so the selected day,
 * the printed date and the storage key can never land on different days.
 */
export default function TasksSection() {
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
  // The date the rows on screen were actually loaded for. `day` is the date
  // being asked for, and the two are equal exactly once the read has landed.
  // Deriving readiness from the loaded date (instead of flipping a boolean in
  // the effect) means stepping to another date can never paint the previous
  // day's rows — or its "nothing here" — under the new date.
  const [loadedDay, setLoadedDay] = useState<string | null>(null)

  useEffect(() => {
    try {
      const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i) || '').filter(k => /^vitality:tasks:\d{4}-\d{2}-\d{2}$/.test(k)).map(k => k.slice('vitality:tasks:'.length))
      setHistory(keys.sort().reverse())
    } catch { setError('Could not read task history.') }
  }, [])

  useEffect(() => {
    try { const r = localStorage.getItem(`vitality:tasks:${day}`); setTasks(r ? JSON.parse(r) : []); setError('') }
    catch { setTasks([]); setError('Could not load tasks for this date.') }
    setLoadedDay(day)
  }, [day])

  // Any committed change re-seeds the field, so stepping or picking a chip can
  // never leave a stale edit on screen.
  useEffect(() => { setDayDraft(day) }, [day])

  useEffect(() => {
    if (!dayMountedRef.current) { dayMountedRef.current = true; return }
    setDayStatus(formatDayKey(day))
  }, [day])

  const ready = loadedDay === day

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
        {ready && history.length > 1 && <div className={styles.dayChips}>
          <span className={styles.dayChipsLabel}>Saved dates</span>
          {history.map(date => <button type="button" key={date} className={styles.dayChip} onClick={() => commitDay(date)} aria-pressed={day === date}>{date}</button>)}
        </div>}
      </div>
      {/* The composer above stays mounted while a day is loading, on purpose:
          unmounting it would throw away a half-typed task and the caret with
          it. The rows below are the part that must never be stale. */}
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
        {ready && tasks.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-elevated, #121212)', borderRadius: 8, border: '1px solid var(--border, #1c1c1c)' }}>
            <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} style={{ accentColor: 'var(--mint, #6EE7B7)', width: 16, height: 16, cursor: 'pointer' }} />
            <span style={{ flex: 1, fontSize: 14, color: 'var(--fg)', textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.5 : 1 }}>{t.text}</span>
            <button onClick={() => deleteTask(t.id)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 2, fontSize: 16, lineHeight: 1 }} title="Delete">×</button>
          </div>
        ))}
        {!ready && <p role="status" style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>Loading tasks...</p>}
        {/* Never while a load error is on screen, for the same reason the notes
            list waits: "No tasks for this date" would be a guess, not a read. */}
        {ready && !error && tasks.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>No tasks for this date.</p>}
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
