'use client'

import { useEffect, useState } from 'react'
import { timeStatus, weatherStatus, type TimeStatus, type WeatherStatus } from '@/lib/tiles/headerStatus'
import styles from './HeaderStatus.module.css'

interface HeaderStatusProps {
  userId: string
}

/**
 * The chrome that sits next to the date — a tickable clock, an editable
 * location, and a manual weather row. Same offline philosophy as the rest of
 * the dashboard: no API, no GPS; every value is something the user typed.
 *
 * Each editable cell is click-to-edit and edits blur-or-Enter to save. Escape
 * cancels and rolls back. Empty cells show a placeholder so the user knows the
 * field exists on first run, and the same cell turns the placeholder into the
 * typed value the moment it commits.
 */
export default function HeaderStatus({ userId }: HeaderStatusProps) {
  // Mount-guarded reads: localStorage is server-undefined, so the first render
  // must produce SOMETHING consistent between SSR and CSR — a stable empty
  // shape here, then useEffect populates the real values on the client.
  const [time, setTime] = useState<TimeStatus>({ location: '' })
  const [weather, setWeather] = useState<WeatherStatus>({
    location: '',
    temp: null,
    condition: '',
    humidity: null,
    wind: null,
  })
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setTime(timeStatus.get(userId))
    setWeather(weatherStatus.get(userId))
    setHydrated(true)
  }, [userId])

  // The clock. Each tick re-fires the same render — cheap, and keeps the time
  // honest across hour boundaries (the same clock that drives the header
  // greeting phrase derives its tick from here).
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const saveTimeLoc = (next: string) => {
    const patched = { location: next }
    setTime((prev) => ({ ...prev, ...patched }))
    timeStatus.save(userId, patched)
  }

  const saveWeather = (patch: Partial<WeatherStatus>) => {
    setWeather((prev) => ({ ...prev, ...patch }))
    weatherStatus.save(userId, patch)
  }

  return (
    <div className={styles.status} aria-label="Time and weather">
      <div className={styles.row}>
        <span className={styles.label}>Time</span>
        <span className={styles.clock}>
          {now ? formatClock(now) : <span className={styles.placeholder}>--:--</span>}
        </span>
        <span className={styles.secondary}>
          {now ? formatZone(now) : ''}
        </span>
        <span className={styles.dot} aria-hidden>·</span>
        <EditCell
          value={time.location}
          placeholder="set location"
          ariaLabel="Time location"
          className={styles.loc}
          onCommit={saveTimeLoc}
        />
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Weather</span>
        {hydrated && weather.temp != null ? (
          <span className={styles.temp}>{Math.round(weather.temp)}°</span>
        ) : (
          <span className={styles.placeholder}>—°</span>
        )}
        <EditCell
          value={weather.condition}
          placeholder="condition"
          ariaLabel="Weather condition"
          className={styles.cond}
          onCommit={(v) => saveWeather({ condition: v })}
        />
        {hydrated && (weather.humidity != null || weather.wind != null) && (
          <span className={styles.chips}>
            {weather.humidity != null && (
              <span className={styles.chip}>{Math.round(weather.humidity)}%</span>
            )}
            {weather.wind != null && (
              <span className={styles.chip}>{Math.round(weather.wind)} km/h</span>
            )}
          </span>
        )}
        {hydrated &&
          weather.temp == null &&
          !weather.condition &&
          (weather.humidity == null && weather.wind == null) && (
            <span className={styles.secondary}>tap to set temp + condition</span>
          )}
        <span className={styles.dot} aria-hidden>·</span>
        <EditCell
          value={weather.location}
          placeholder="set city"
          ariaLabel="Weather location"
          className={styles.loc}
          onCommit={(v) => saveWeather({ location: v })}
        />
      </div>
    </div>
  )
}

/* Small click-to-edit, enter/blur-to-save, escape-to-cancel cell. Single-line
   text, no validation. Kept inline in this file because it's only used here;
   a separate component would be premature without a second caller. */
interface EditCellProps {
  value: string
  placeholder: string
  ariaLabel: string
  className?: string
  onCommit: (next: string) => void
}
function EditCell({ value, placeholder, ariaLabel, className, onCommit }: EditCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  // Resync the draft when the persisted value changes under us (no local edit
  // in flight). Skipped during an active edit so a save that triggers re-render
  // never yanks the input back to the old value mid-typing.
  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        inputMode="text"
        aria-label={ariaLabel}
        className={`${styles.input} ${className ?? ''}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const next = draft.trim()
          if (next !== value) onCommit(next)
          setEditing(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur()
          } else if (e.key === 'Escape') {
            setDraft(value)
            setEditing(false)
          }
        }}
      />
    )
  }

  const empty = !value.trim()
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={`${styles.cell} ${className ?? ''} ${empty ? styles.cellEmpty : ''}`}
      onClick={() => {
        setDraft(value)
        setEditing(true)
      }}
    >
      {empty ? placeholder : value}
    </button>
  )
}

/** HH:MM AM/PM in the locale of the user. */
function formatClock(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })
}

/** The IANA timezone the browser actually gave us — a fact the OS, not us. */
function formatZone(d: Date): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return ''
  }
}
