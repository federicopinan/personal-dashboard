'use client'

import Link from 'next/link'
import WelcomeBackdrop from './WelcomeBackdrop'
import styles from './PageShell.module.css'

/**
 * The chrome a standalone page wears: the same world behind it, the same film
 * grain and safe-area gutters as the board, the same type scale, and exactly one
 * way back to the board. Everything page-specific arrives as `children`.
 *
 * The accent in the top wash is the default world's own accent — the same
 * value WelcomeBackdrop paints the aurora with when the page gives it no
 * wallpaper, so the glow and the light behind it are one colour, not two.
 */
export default function PageShell({
  title,
  kicker,
  children,
}: {
  title: string
  kicker: string
  children: React.ReactNode
}) {
  return (
    <main className={`${styles.page} grain-overlay`}>
      <WelcomeBackdrop />
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2,
          pointerEvents: 'none',
          background: 'radial-gradient(60% 45% at 50% 0%, #6EE7B71f, transparent 70%)',
        }}
      />

      <div className={styles.shell}>
        <Link href="/" className={styles.back}>← Dashboard</Link>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.kicker}>{kicker}</p>
        <div className={styles.body}>{children}</div>
      </div>
    </main>
  )
}
