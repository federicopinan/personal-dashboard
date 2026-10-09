'use client'

import { useEffect, useMemo, useState } from 'react'

interface Bookmark {
  id: string
  name: string
  url: string
  /** epoch ms; drives default ordering (newest first). */
  addedAt: number
}

const STORAGE_KEY = 'vitality:bookmarks'

/**
 * Bookmarks — one list, one key. Each bookmark is a small card:
 * the URL's favicon at the top (sourced from Google's `s2/favicons`,
 * an anonymous public endpoint that needs no key), the bookmark's
 * own name below it, a tap anywhere on the card opens the link in
 * a new tab. The list lives in `vitality:bookmarks` as a JSON array
 * and is the source of truth — no other tile reads it, no panel
 * shows it, the dashboard only knows the COUNT.
 */
export default function BookmarksSection() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          // Coerce each row into the latest shape: a payload written by an
          // older build may not have addedAt, and a hand-edited entry may
          // not have an id. Drop rows that lack the required fields rather
          // than patch silently — a bookmark without a name or url is not
          // a fact about anything.
          const cleaned: Bookmark[] = parsed
            .filter((b: unknown): b is Partial<Bookmark> =>
              !!b && typeof b === 'object' && typeof (b as Bookmark).name === 'string' && typeof (b as Bookmark).url === 'string')
            .map((b) => ({
              id: typeof b.id === 'string' && b.id ? b.id : crypto.randomUUID(),
              name: b.name as string,
              url: b.url as string,
              addedAt: typeof b.addedAt === 'number' ? b.addedAt : Date.now(),
            }))
          setBookmarks(cleaned)
        }
      }
    } catch {
      setError('Could not load saved bookmarks.')
    }
    setLoaded(true)
  }, [])

  const persist = (next: Bookmark[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setBookmarks(next)
      setError('')
      return true
    } catch {
      setError('Could not save bookmarks. Your changes were not saved.')
      return false
    }
  }

  const addBookmark = () => {
    const n = name.trim()
    const u = url.trim()
    if (!n || !u) {
      setError('Both a name and a URL are required.')
      return
    }
    if (!persist([{ id: crypto.randomUUID(), name: n, url: normalizeUrl(u), addedAt: Date.now() }, ...bookmarks])) return
    setName('')
    setUrl('')
  }

  const deleteBookmark = (id: string) => persist(bookmarks.filter((b) => b.id !== id))

  const sorted = useMemo(
    () => [...bookmarks].sort((a, b) => b.addedAt - a.addedAt),
    [bookmarks],
  )

  return (
    <div style={{ marginTop: 32 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', margin: '0 0 12px' }}>Bookmarks</h3>
      {error && <p role="alert" style={{ color: '#ff8b8b', fontSize: 13 }}>{error}</p>}
      {/* Same composer pattern as notes: a two-up flex row that wraps the
          inputs and the Add button onto a clean second line at phone widths
          rather than overflowing. minWidth:0 is the part that lets the
          inputs give way, since Add must stay a single no-wrap pill. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        <input
          aria-label="Bookmark name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addBookmark() }}
          placeholder="Name (e.g. Figma)"
          style={{ flex: '1 1 160px', minWidth: 0, padding: '10px 14px', minHeight: 'var(--touch)', borderRadius: 8, border: '1px solid var(--border, #262626)', background: 'var(--bg, #0a0a0a)', color: 'var(--fg, #fff)', fontSize: 16, outline: 'none' }}
        />
        <input
          aria-label="Bookmark URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addBookmark() }}
          placeholder="URL (figma.com)"
          inputMode="url"
          autoComplete="off"
          style={{ flex: '2 1 220px', minWidth: 0, padding: '10px 14px', minHeight: 'var(--touch)', borderRadius: 8, border: '1px solid var(--border, #262626)', background: 'var(--bg, #0a0a0a)', color: 'var(--fg, #fff)', fontSize: 16, outline: 'none' }}
        />
        <button
          onClick={addBookmark}
          style={{ padding: '0 18px', minHeight: 'var(--touch)', borderRadius: 8, border: 'none', background: 'var(--mint, #6EE7B7)', color: 'var(--mint-ink, #042a1c)', fontWeight: 600, cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap' }}
        >
          Add
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 14,
        }}
      >
        {sorted.map((b) => (
          <BookmarkCard key={b.id} bookmark={b} onDelete={() => deleteBookmark(b.id)} />
        ))}
        {!loaded && (
          <p role="status" style={{ color: 'var(--muted)', fontSize: 13, margin: 0, gridColumn: '1 / -1' }}>
            Loading bookmarks...
          </p>
        )}
        {/* Same "no fact yet" caveat as notes/tasks: never claim empty
            before the read has landed, and never while a load error is on
            screen — those would be two answers to the same question. */}
        {loaded && !error && bookmarks.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0, gridColumn: '1 / -1' }}>
            No bookmarks yet. Add one above.
          </p>
        )}
      </div>
    </div>
  )
}

function BookmarkCard({ bookmark, onDelete }: { bookmark: Bookmark; onDelete: () => void }) {
  const host = safeHost(bookmark.url)
  const favicon = host ? `https://www.google.com/s2/favicons?domain=${host}&sz=64` : ''
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        padding: '20px 12px 14px',
        background: 'var(--bg-elevated, #121212)',
        border: '1px solid var(--border, #262626)',
        borderRadius: 16,
        textAlign: 'center',
        transition: 'border-color .15s, transform .15s',
      }}
    >
      <a
        href={bookmark.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${bookmark.name} in a new tab`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          color: 'var(--fg, #fff)',
          textDecoration: 'none',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 14,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border, #262626)',
            display: 'grid',
            placeItems: 'center',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {favicon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={favicon}
              alt=""
              loading="lazy"
              width={48}
              height={48}
              style={{ width: 48, height: 48, display: 'block' }}
              onError={(e) => {
                // If the icon endpoint 404s, drop the broken image tag — the
                // fallback letter underneath stays visible. We DO NOT swap to
                // a generic globe here: a 32x32 transparent letter on a
                // rounded square is already the affordance.
                const t = e.currentTarget
                t.style.display = 'none'
                t.parentElement?.setAttribute('data-broken', '1')
              }}
            />
          ) : null}
          {/* Always render a fallback letter behind the img so an empty
              favicon response still has SOMETHING to show. The img sits on top
              when present and replaces the fallback when loadable. */}
          <span
            aria-hidden
            style={{
              position: 'absolute',
              fontFamily: 'var(--font-serif, Georgia, serif)',
              fontStyle: 'italic',
              fontSize: 28,
              lineHeight: 1,
              color: 'var(--mint, #6EE7B7)',
              pointerEvents: 'none',
            }}
          >
            {bookmark.name.trim().charAt(0).toUpperCase() || '·'}
          </span>
        </div>
        <span
          style={{
            fontSize: 13.5,
            lineHeight: 1.35,
            color: 'var(--fg, #fff)',
            fontWeight: 500,
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {bookmark.name}
        </span>
      </a>
      {/* The X sits OUTSIDE the anchor so the delete click never navigates.
          Visually it's a tiny ghost button at the top-right of the card. */}
      <button
        onClick={onDelete}
        aria-label={`Delete ${bookmark.name}`}
        title={`Delete ${bookmark.name}`}
        style={{
          position: 'absolute',
          top: 6,
          right: 8,
          width: 24,
          height: 24,
          padding: 0,
          background: 'transparent',
          border: 'none',
          color: 'var(--muted)',
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
          borderRadius: 999,
          opacity: 0.6,
        }}
      >
        ×
      </button>
    </div>
  )
}

/** Strip query/fragment and lowercase the host so the favicon endpoint gets
 *  the canonical domain. A google.com/s2 URL can be anything, but the s2
 *  service keys the icon by domain and works best without a path. */
function safeHost(rawUrl: string): string | null {
  try {
    return new URL(normalizeUrl(rawUrl)).host.toLowerCase()
  } catch {
    return null
  }
}

/** Prepends https:// when the user typed a bare host (figma.com) so the
 *  stored URL is always absolute and the open target is correct. */
function normalizeUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('//')) return 'https:' + trimmed
  return 'https://' + trimmed
}
