import type { Metadata } from 'next'
import TasksPage from './TasksPage'

export const metadata: Metadata = {
  title: 'Tasks · Vitality',
  description: 'One task list per local day, kept on this device.',
}

// The task list, on its own page. It used to sit at the foot of the board,
// where the date control, the saved dates and the carry-forward all competed
// with the equation for the same column.
export default function Page() {
  return <TasksPage />
}
