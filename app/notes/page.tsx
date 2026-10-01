import type { Metadata } from 'next'
import NotesPage from './NotesPage'

export const metadata: Metadata = {
  title: 'Notes · Vitality',
  description: 'Everything you have written down, searchable, on this device.',
}

// The notes list, on its own page. It used to sit at the foot of the board,
// where a long list was something you scrolled past rather than something you
// read.
export default function Page() {
  return <NotesPage />
}
