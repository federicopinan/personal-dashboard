'use client'

import { useState, useEffect, useRef } from 'react'
import gsap from 'gsap'
import styles from './dashboard.module.css'
import { DEFAULT_CHROME, type Greeting, type DateConfig } from '@/lib/tiles/dashboardChrome'
import HeaderStatus from '@/components/HeaderStatus'

interface DashboardHeaderProps {
  firstName?: string | null
  greeting?: Greeting
  date?: DateConfig
  /** Per-user chrome (time + weather) lives under this key. */
  userId: string
}

/**
 * The editorial greeting + date. Prop-driven so a user can personalise it
 * (lib/tiles/dashboardChrome): keep the auto time-of-day line or write their own,
 * show / accent their name, scale it, and pick the date format (or hide it). The
 * FONT stays Instrument Serif italic (the unified Vitality voice) — only wording,
 * name, accent, and scale are exposed.
 *
 * Below the greeting + date sits the HeaderStatus block: a live clock, an
 * editable location, and a manual weather row (lib/tiles/headerStatus). The
 * auto-greeting phrase list and the time block read from the SAME clock so a
 * header that says "Late night" agrees with the clock that says 23:42.
 */
export default function DashboardHeader({ firstName, greeting, date, userId }: DashboardHeaderProps) {
  const header = useRef<HTMLDivElement>(null)
  const g = greeting ?? DEFAULT_CHROME.greeting
  const d = date ?? DEFAULT_CHROME.date
  const [autoWord, setAutoWord] = useState('')
  const [fullDate, setFullDate] = useState('')
  const [todayDate, setTodayDate] = useState('')

  useEffect(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(header.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.42, ease: 'power2.out' })
    }, header)
    return () => mm.revert()
  }, [])

  useEffect(() => {
    const now = new Date()
    const hour = now.getHours()
    // Four cases — Late night covers 22–04, good morning 05–11, good afternoon
    // 12–17, good evening 18–21. Matches the time block (HeaderStatus) so the
    // two never disagree across an hour boundary.
    setAutoWord(
      hour < 5 ? 'Late night' :
      hour < 12 ? 'Good morning' :
      hour < 18 ? 'Good afternoon' :
      'Good evening'
    )
    setFullDate(now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }))
    setTodayDate(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))
  }, [])

  // Custom wording falls back to the auto line if blank (never render empty).
  const word = g.mode === 'custom' && g.text.trim() ? g.text.trim() : autoWord
  const includesName = !!(firstName && word.toLowerCase().includes(firstName.toLowerCase()))
  const renderName = g.showName && firstName && !includesName
  const dateText = d.format === 'today' ? todayDate : fullDate

  return (
    <div className={styles.header} ref={header} style={{ ['--greet-scale' as string]: g.scale }}>
      <h1 className={styles.greeting}>
        {word}
        {renderName ? (
          <>
            ,&nbsp;<span className={g.accentName ? styles.greetingName : undefined}>{firstName}</span>
          </>
        ) : null}
      </h1>
      {d.show && <p className={styles.date}>{dateText}</p>}
      <HeaderStatus userId={userId} />
    </div>
  )
}
