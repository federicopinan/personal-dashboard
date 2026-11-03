import Dashboard from './app/Dashboard'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard · Vitality',
}

// The base is a single page: the dashboard. No auth, no backend — a fixed
// per-browser userId keeps the localStorage namespaces (chrome, tile skins,
// layout) stable.
export default function Page() {
  return <Dashboard userId="me" />
}
