'use client'

import { useEffect, useState } from 'react'
import styles from './HeaderStatus.module.css'

interface HeaderStatusProps {
  /** Reserved for future per-user overrides; today the block has none. */
  userId?: string
}

interface WeatherSnapshot {
  /** Temperature in °C, integer. wttr.in reports Celsius when `format=j1`. */
  temp: number | null
  /** Short condition string, e.g. "Clear", "Light rain". wttr.in returns this
   *  exact form on its `current_condition[0].weatherDesc[0].value` field. */
  condition: string
  /** City + country as wttr.in resolved them, joined for the chrome line. */
  location: string
  /** Relative humidity in %. wttr.in is the source of truth; null when absent. */
  humidity: number | null
  /** Wind speed in km/h. Same source as humidity. */
  wind: number | null
  /** Epoch ms the snapshot was fetched. Drives the 10-minute refresh. */
  fetchedAt: number
}

/** Browser-driven chrome that lives under the date. Both rows read straight
 *  from the browser (the OS clock + a public weather endpoint) — no editable
 *  fields, no localStorage persistence, nothing the user has to set up.
 *
 *  The Time row shows the local HH:MM and the IANA timezone the browser
 *  reports; both tick / re-derive on mount. The Weather row fetches
 *  wttr.in/?format=j1 on mount, holds the response in component state, and
 *  re-fetches every 10 minutes. A stale or missing response shows muted
 *  em-dashes — never a fake number — until the next successful fetch lands.
 */
export default function HeaderStatus(_: HeaderStatusProps) {
  const [now, setNow] = useState<Date | null>(null)
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null)
  const [weatherState, setWeatherState] = useState<'loading' | 'live' | 'error'>('loading')

  // The clock. Ticked once per second. setNow(null) on mount keeps the SSR
  // and the first client paint identical; the effect runs after mount and
  // the next tick produces the real value.
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Weather. Auto-located via wttr.in by IP at fetch time. Cached for ten
  // minutes — a refresh more often than that hammers a free public endpoint
  // without telling us anything new.
  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setTimeout> | null = null

    const fetchOnce = async () => {
      try {
        const res = await fetch('https://wttr.in/?format=j1', {
          headers: { Accept: 'application/json' },
        })
        if (!res.ok) throw new Error('not ok')
        const j = await res.json()
        if (!alive) return
        const cur = Array.isArray(j?.current_condition) ? j.current_condition[0] : null
        const area = Array.isArray(j?.nearest_area) ? j.nearest_area[0] : null
        const tempRaw = cur?.temp_C
        const temp = typeof tempRaw === 'string' || typeof tempRaw === 'number'
          ? Math.round(Number(tempRaw))
          : null
        const condition = (cur?.weatherDesc?.[0]?.value ?? '').toString().trim()
        const areaName = (area?.areaName?.[0]?.value ?? '').toString().trim()
        const country = (area?.country?.[0]?.value ?? '').toString().trim()
        const humidityRaw = cur?.humidity
        const humidity = typeof humidityRaw === 'string' || typeof humidityRaw === 'number'
          ? Math.round(Number(humidityRaw))
          : null
        const windRaw = cur?.windspeedKmph
        const wind = typeof windRaw === 'string' || typeof windRaw === 'number'
          ? Math.round(Number(windRaw))
          : null
        const location = [areaName, country].filter(Boolean).join(', ')
        setWeather({
          temp: Number.isFinite(temp) ? (temp as number) : null,
          condition,
          location,
          humidity: Number.isFinite(humidity) ? (humidity as number) : null,
          wind: Number.isFinite(wind) ? (wind as number) : null,
          fetchedAt: Date.now(),
        })
        setWeatherState('live')
      } catch {
        if (!alive) return
        setWeatherState('error')
      } finally {
        // Schedule the next refresh only after this one settled, so a
        // hung network never stacks timers.
        if (alive) timer = setTimeout(fetchOnce, 10 * 60 * 1000)
      }
    }

    fetchOnce()
    return () => {
      alive = false
      if (timer) clearTimeout(timer)
    }
  }, [])

  return (
    <div className={styles.status} aria-label="Time and weather">
      <div className={styles.row}>
        <span className={styles.label}>Time</span>
        <span className={styles.clock}>
          {now ? formatClock(now) : <span className={styles.placeholder}>--:--</span>}
        </span>
        <span className={styles.secondary}>{now ? formatZone(now) : ''}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Weather</span>
        {weatherState === 'loading' || !weather ? (
          <>
            <span className={styles.placeholder}>—°</span>
            <span className={styles.placeholder}>—</span>
          </>
        ) : (
          <>
            {weather.temp != null ? (
              <span className={styles.temp}>{weather.temp}°</span>
            ) : (
              <span className={styles.placeholder}>—°</span>
            )}
            {weather.condition ? (
              <span className={styles.conditionText}>{weather.condition}</span>
            ) : null}
            {weather.location ? (
              <span className={styles.locationText}>{weather.location}</span>
            ) : null}
            {(weather.humidity != null || weather.wind != null) && (
              <span className={styles.chips}>
                {weather.humidity != null && (
                  <span className={styles.chip}>{weather.humidity}%</span>
                )}
                {weather.wind != null && (
                  <span className={styles.chip}>{weather.wind} km/h</span>
                )}
              </span>
            )}
          </>
        )}
        {weatherState === 'error' && (
          <span className={styles.secondary}>couldn&rsquo;t load weather</span>
        )}
      </div>
    </div>
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
