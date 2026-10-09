'use client'

import PageShell from '@/components/PageShell'
import BookmarksSection from './BookmarksSection'

export default function BookmarksPage() {
  return (
    <PageShell title="Bookmarks" kicker="the links you reach for often">
      <BookmarksSection />
    </PageShell>
  )
}
