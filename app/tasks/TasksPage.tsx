'use client'

import PageShell from '@/components/PageShell'
import TasksSection from './TasksSection'

// Tasks get a page of their own instead of a panel at the bottom of the board:
// a day-by-day list is worked through, not glanced at, and it carries its own
// date control, history and carry-forward.
export default function TasksPage() {
  return (
    <PageShell title="Tasks" kicker="yesterday, today, tomorrow">
      <TasksSection />
    </PageShell>
  )
}
