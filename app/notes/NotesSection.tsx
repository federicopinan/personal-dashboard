'use client'

import { useEffect, useState } from 'react'

/**
 * Notes — one list, one key. Everything lives in `vitality:notes` as a JSON
 * array of `{ id, text, ts }`; the list on screen is that array, newest first,
 * filtered by the search box.
 */
export default function NotesSection() {
  const [notes, setNotes] = useState<{ id: string; text: string; ts: number }[]>([])
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [error, setError] = useState('')
  // The first paint lands before the effect has read localStorage. Until it
  // has, "No notes yet" would be a claim about an empty array, not about this
  // device, so the two states are kept apart: `loaded` is what tells them
  // apart. It flips on the error path too — a failed read is a real answer.
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try { const r = localStorage.getItem('vitality:notes'); if (r) setNotes(JSON.parse(r)) } catch { setError('Could not load saved notes.') }
    setLoaded(true)
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
      {/* flexWrap + minWidth:0 on the input is what makes this row survive
          320px. Editing adds a third button, so at a phone width the input and
          the actions genuinely cannot share a line: the buttons wrap to a second
          line instead of pushing the composer past the edge of the screen. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') editing ? saveEdit(editing) : addNote(); else if (e.key === 'Escape' && editing) cancelEdit() }}
          placeholder="Write a note..."
          style={{ flex: '1 1 180px', minWidth: 0, padding: '10px 14px', minHeight: 'var(--touch)', borderRadius: 8, border: '1px solid var(--border, #262626)', background: 'var(--bg, #0a0a0a)', color: 'var(--fg, #fff)', fontSize: 16, outline: 'none' }}
        />
        <button onClick={() => editing ? saveEdit(editing) : addNote()} style={{ padding: '0 18px', minHeight: 'var(--touch)', borderRadius: 8, border: 'none', background: 'var(--mint, #6EE7B7)', color: 'var(--mint-ink, #042a1c)', fontWeight: 600, cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap' }}>
          {editing ? 'Save' : 'Add'}
        </button>
        {editing && <button type="button" onClick={cancelEdit} style={{ padding: '0 14px', minHeight: 'var(--touch)', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg)', cursor: 'pointer', whiteSpace: 'nowrap' }}>Cancel edit</button>}
      </div>
      <input aria-label="Search notes" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search notes..." style={{ width: '100%', marginBottom: 12, padding: '0 12px', minHeight: 'var(--touch)', borderRadius: 8, border: '1px solid var(--border, #262626)', background: 'var(--bg, #0a0a0a)', color: 'var(--fg, #fff)', fontSize: 16 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {visible.map(n => (
          <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 2, padding: '4px 4px 4px 12px', background: 'var(--bg-elevated, #121212)', borderRadius: 8, border: '1px solid var(--border, #1c1c1c)' }}>
            <div style={{ flex: 1, minWidth: 0 }}><small style={{ color: 'var(--muted)' }}>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(n.ts)}</small><div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--fg)' }}>{n.text}</div></div>
            <button onClick={() => { setEditing(n.id); setInput(n.text) }} style={{ flex: '0 0 auto', display: 'grid', placeItems: 'center', minWidth: 'var(--touch)', minHeight: 'var(--touch)', padding: '0 8px', background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13 }} aria-label={`Edit note: ${n.text}`}>Edit</button>
            <button onClick={() => deleteNote(n.id)} style={{ flex: '0 0 auto', display: 'grid', placeItems: 'center', width: 'var(--touch)', height: 'var(--touch)', background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }} title="Delete" aria-label={`Delete note: ${n.text}`}>×</button>
          </div>
        ))}
        {!loaded && <p role="status" style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>Loading notes...</p>}
        {/* Only once the read has landed, and never while a load error is on
            screen — "No notes yet" next to "Could not load saved notes" would
            be two answers to the same question, one of them a guess. */}
        {loaded && !error && notes.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>No notes yet.</p>}
      </div>
    </div>
  )
}
