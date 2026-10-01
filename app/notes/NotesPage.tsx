'use client'

import PageShell from '@/components/PageShell'
import NotesSection from './NotesSection'

// Notes get a page of their own instead of a panel at the bottom of the board:
// a list you read, search and edit deserves the full width of a page and one
// obvious way back to the equation.
export default function NotesPage() {
  return (
    <PageShell title="Notes" kicker="everything you have written down">
      <NotesSection />
    </PageShell>
  )
}
