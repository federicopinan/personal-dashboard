'use client'

import { useEffect, useState, type FormEvent } from 'react'
import FadeContent from '@/components/FadeContent'
import styles from './onboarding.module.css'

function parse(raw: string | null): unknown {
  if (raw === null) return null
  try { return JSON.parse(raw) } catch { return null }
}

function profileMissing(raw: string | null): boolean {
  const value = parse(raw)
  return !value || typeof value !== 'object' || Array.isArray(value) ||
    typeof (value as Record<string, unknown>).name !== 'string' ||
    !(value as { name: string }).name.trim()
}

function validGoal(value: unknown): value is { id: string; title: string; weights: Record<string, unknown> } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const goal = value as Record<string, unknown>
  return typeof goal.id === 'string' && !!goal.id.trim() && typeof goal.title === 'string' &&
    !!goal.title.trim() && !!goal.weights && typeof goal.weights === 'object' && !Array.isArray(goal.weights)
}

function goalsMissing(raw: string | null): boolean {
  const value = parse(raw)
  return !Array.isArray(value) || !value.length || !value.every(validGoal)
}

function preserve(key: string, raw: string | null) {
  if (raw === null) return
  let backup = `${key}:onboarding-backup`
  let n = 1
  while (localStorage.getItem(backup) !== null) backup = `${key}:onboarding-backup:${n++}`
  localStorage.setItem(backup, raw)
}

export default function Onboarding({ onGym, gymOpened = 0 }: { onGym: () => void; gymOpened?: number }) {
  const [missing, setMissing] = useState({ profile: false, goals: false })
  const [step, setStep] = useState<'hidden' | 'details' | 'gym'>('hidden')
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      const profile = profileMissing(localStorage.getItem('vitality:profile'))
      const goals = goalsMissing(localStorage.getItem('vitality:goals'))
      setMissing({ profile, goals })
      if (profile || goals) setStep('details')
      else if (localStorage.getItem('vitality:onboarding:gym') === 'pending') setStep('gym')
    } catch {
      setError('Browser storage is unavailable. Enable it to save your setup.')
      setStep('details')
    }
  }, [])

  useEffect(() => {
    if (!gymOpened) return
    try {
      localStorage.setItem('vitality:onboarding:gym', 'done')
      setStep('hidden')
    } catch {
      setError('Could not save your progress. Check browser storage and try again.')
    }
  }, [gymOpened])

  function save(event: FormEvent) {
    event.preventDefault()
    if ((missing.profile && !name.trim()) || (missing.goals && !goal.trim())) {
      setError('Enter a name and goal for the fields shown.')
      return
    }
    setError('')
    try {
      // Another tab may have configured either part while this form was open.
      const profileRaw = localStorage.getItem('vitality:profile')
      if (missing.profile && profileMissing(profileRaw)) {
        const existing = parse(profileRaw)
        preserve('vitality:profile', profileRaw)
        const fields = existing && typeof existing === 'object' && !Array.isArray(existing) ? existing : {}
        localStorage.setItem('vitality:profile', JSON.stringify({ ...fields, name: name.trim() }))
      }
      const goalsRaw = localStorage.getItem('vitality:goals')
      if (missing.goals && goalsMissing(goalsRaw)) {
        const existing = parse(goalsRaw)
        const saved = Array.isArray(existing) ? existing.filter(validGoal) : []
        const id = `goal-${Date.now()}-${Math.random().toString(36).slice(2)}`
        preserve('vitality:goals', goalsRaw)
        const active = localStorage.getItem('vitality:goal:active')
        if (!saved.some((item) => item.id === active) && !(saved.length && active === 'overall')) {
          preserve('vitality:goal:active', active)
          localStorage.setItem('vitality:goal:active', id)
        }
        localStorage.setItem('vitality:goals', JSON.stringify([...saved, { id, title: goal.trim(), weights: {}, pending: true }]))
      }
      localStorage.setItem('vitality:onboarding:gym', 'pending')
      window.dispatchEvent(new Event('vitality:profile'))
      window.dispatchEvent(new Event('vitality:goal'))
      setStep('gym')
    } catch {
      setError('Could not save your setup. Check browser storage and try again.')
    }
  }

  function finish(open: boolean) {
    if (open) { onGym(); return }
    try { localStorage.setItem('vitality:onboarding:gym', 'done') } catch {
      setError('Could not save your progress. Check browser storage and try again.')
      return
    }
    setStep('hidden')
  }

  if (step === 'hidden') return null
  return (
    <FadeContent className={styles.panelWrap} initialOpacity={0.75} duration={0.4}>
    <section className={styles.panel} aria-labelledby="onboarding-title">
      {step === 'details' ? (
        <form onSubmit={save}>
          <h2 id="onboarding-title">Make this dashboard yours</h2>
          <p>Start with your own details. You can edit your profile and goals later in Settings.</p>
          {missing.profile && <label>Your name<input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></label>}
          {missing.goals && <label>Your first goal<input required maxLength={160} value={goal} onChange={(e) => setGoal(e.target.value)} /></label>}
          <button type="submit">Continue</button>
        </form>
      ) : (
        <div>
          <h2 id="onboarding-title">Set up training</h2>
          <p>Open Train to choose a routine or start empty. An existing routine will be kept.</p>
          <div className={styles.actions}>
            <button type="button" onClick={() => finish(true)}>Open Train</button>
            <button type="button" onClick={() => finish(false)}>Later</button>
          </div>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
    </FadeContent>
  )
}
