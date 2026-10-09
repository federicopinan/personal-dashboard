/**
 * headerStatus holds the per-user chrome that lives next to the date: the time
 * block (location only — greeting and clock are derived live from the clock) and
 * the weather block (location + temp + condition + optional humidity + wind).
 *
 * Persistence is localStorage, per user (same key shape as dashboardChrome):
 *   vitality:<userId>:time     -> TimeStatus
 *   vitality:<userId>:weather  -> WeatherStatus
 *
 * The dashboard renders these inline in the header. They are NOT sealed tiles
 * (a sealed tile has no network and no direct localStorage access — it goes
 * through window.Vitality); header chrome is in-app React and uses localStorage
 * directly the same way goals/profile/chrome do.
 *
 * Manual entry, no API. The offline-first rule from the rest of the dashboard
 * applies: every value is something the user (or /sweep) puts in.
 */

/** What the time block carries. The greeting + clock are derived, never stored. */
export interface TimeStatus {
  /** Free-form. Default empty so the prompt shows on first run. */
  location: string
}

/** What the weather block carries. temp is the integer the user enters (no unit
 *  selector — "what you say it is" matches how location is owned). */
export interface WeatherStatus {
  location: string
  temp: number | null
  /** Free-form. e.g. "Clear", "Cloudy", "Light rain". */
  condition: string
  humidity: number | null
  wind: number | null
}

const TIME_DEFAULT: TimeStatus = { location: '' }
const WEATHER_DEFAULT: WeatherStatus = {
  location: '',
  temp: null,
  condition: '',
  humidity: null,
  wind: null,
}

const timeKey = (userId: string) => `vitality:${userId}:time`
const weatherKey = (userId: string) => `vitality:${userId}:weather`

const hasStorage = () => typeof window !== 'undefined' && !!window.localStorage

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
}

function readTime(userId: string): TimeStatus {
  if (!hasStorage()) return { ...TIME_DEFAULT }
  try {
    const raw = window.localStorage.getItem(timeKey(userId))
    if (!raw) return { ...TIME_DEFAULT }
    return { ...TIME_DEFAULT, ...obj(JSON.parse(raw)) }
  } catch {
    return { ...TIME_DEFAULT }
  }
}

function readWeather(userId: string): WeatherStatus {
  if (!hasStorage()) return { ...WEATHER_DEFAULT }
  try {
    const raw = window.localStorage.getItem(weatherKey(userId))
    if (!raw) return { ...WEATHER_DEFAULT }
    const o = obj(JSON.parse(raw))
    // Coerce the numeric fields defensively. JSON round-trips preserve numbers,
    // so this only ever matters for a hand-edited or legacy payload.
    return {
      ...WEATHER_DEFAULT,
      ...o,
      temp: typeof o.temp === 'number' && isFinite(o.temp) ? o.temp : null,
      humidity: typeof o.humidity === 'number' && isFinite(o.humidity) ? o.humidity : null,
      wind: typeof o.wind === 'number' && isFinite(o.wind) ? o.wind : null,
    }
  } catch {
    return { ...WEATHER_DEFAULT }
  }
}

function writeTime(userId: string, patch: Partial<TimeStatus>) {
  if (!hasStorage()) return
  try {
    const next = { ...readTime(userId), ...patch }
    window.localStorage.setItem(timeKey(userId), JSON.stringify(next))
  } catch {
    /* quota / blocked. fail quiet */
  }
}

function writeWeather(userId: string, patch: Partial<WeatherStatus>) {
  if (!hasStorage()) return
  try {
    const next: WeatherStatus = {
      ...readWeather(userId),
      ...patch,
      // The numeric fields accept "" or null and store null. Anything else must
      // be a finite number, otherwise the field silently becomes null — a "12abc"
      // is a typo, not a temperature.
      temp:
        patch.temp === null || patch.temp === undefined
          ? null
          : typeof patch.temp === 'number' && isFinite(patch.temp)
            ? patch.temp
            : readWeather(userId).temp,
      humidity:
        patch.humidity === null || patch.humidity === undefined
          ? null
          : typeof patch.humidity === 'number' && isFinite(patch.humidity)
            ? patch.humidity
            : readWeather(userId).humidity,
      wind:
        patch.wind === null || patch.wind === undefined
          ? null
          : typeof patch.wind === 'number' && isFinite(patch.wind)
            ? patch.wind
            : readWeather(userId).wind,
    }
    window.localStorage.setItem(weatherKey(userId), JSON.stringify(next))
  } catch {
    /* quota / blocked. fail quiet */
  }
}

function resetTime(userId: string) {
  if (!hasStorage()) return
  try {
    window.localStorage.removeItem(timeKey(userId))
  } catch {
    /* fail quiet */
  }
}

function resetWeather(userId: string) {
  if (!hasStorage()) return
  try {
    window.localStorage.removeItem(weatherKey(userId))
  } catch {
    /* fail quiet */
  }
}

export const timeStatus = { get: readTime, save: writeTime, reset: resetTime }
export const weatherStatus = { get: readWeather, save: writeWeather, reset: resetWeather }
