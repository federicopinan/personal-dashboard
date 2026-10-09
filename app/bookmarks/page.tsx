import type { Metadata } from 'next'
import BookmarksPage from './BookmarksPage'

export const metadata: Metadata = {
  title: 'Bookmarks · Vitality',
  description: 'Your go-to links — favicons, names, one tap to open.',
}

// Bookmarks get a page of their own, the same shape /notes and /tasks use:
// a list you read and edit deserves the full width of a page and one obvious
// way back to the dashboard.
export default function Page() {
  return <BookmarksPage />
}
