/**
 * The local calendar-day key — the one function that decides what a
 * `vitality:tasks:<key>` storage key is. It reads the Date's LOCAL parts
 * (getFullYear / getMonth / getDate) and zero-pads them, so a key is always the
 * day the user is actually living in: never a UTC day, which would put anyone
 * west of Greenwich on tomorrow's and anyone east of it on yesterday's.
 *
 * It lives alone in this module because two places have to agree on it — the
 * task list that writes those keys and the board button that counts them — and
 * two copies of a key derivation are two chances to drift. Moved verbatim out
 * of app/app/Dashboard.tsx; the body is unchanged.
 */
export function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
