'use client'

import { useState, useEffect } from 'react'

export type StepStatus = 'pending' | 'success' | 'skip'

export type StepState = {
  step: string
  status: StepStatus
}

export type FieldState = {
  value: string | { code: string; name: string }[] | { tag: string }[]
  source: string
}

export type EnrichedProfile = {
  name: string
  role: 'EDUCATOR' | 'STUDENT' | 'ADMIN'
  title: string | null
  department: string | null
  college: string | null
  interests: string[]
  courses: { code: string; name: string }[]
}

type EnrichmentEvent =
  | { type: 'step'; step: string; status: StepStatus }
  | { type: 'field'; field: string; value: string; source: string }
  | { type: 'courses'; courses: { code: string; name: string }[] }
  | { type: 'interests'; interests: { tag: string }[] }
  | { type: 'complete'; confidence: 'high' | 'medium' | 'low'; profile: EnrichedProfile }
  | { type: 'error'; message: string }

function upsertStep(steps: StepState[], event: { step: string; status: StepStatus }): StepState[] {
  const idx = steps.findIndex((s) => s.step === event.step)
  if (idx === -1) return [...steps, { step: event.step, status: event.status }]
  const next = [...steps]
  next[idx] = { step: event.step, status: event.status }
  return next
}

export function useEnrichmentStream(email: string | null) {
  const [steps, setSteps] = useState<StepState[]>([])
  const [fields, setFields] = useState<Record<string, FieldState>>({})
  const [profile, setProfile] = useState<EnrichedProfile | null>(null)
  const [confidence, setConfidence] = useState<'high' | 'medium' | 'low' | null>(null)
  const [status, setStatus] = useState<'idle' | 'streaming' | 'complete' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!email) return

    setStatus('streaming')
    setSteps([])
    setFields({})
    setProfile(null)
    setConfidence(null)
    setErrorMessage(null)

    const es = new EventSource(`/api/onboarding/enrich-stream?email=${encodeURIComponent(email)}`)

    es.onmessage = (e) => {
      const event: EnrichmentEvent = JSON.parse(e.data as string)

      if (event.type === 'step') {
        setSteps((prev) => upsertStep(prev, event))
      } else if (event.type === 'field') {
        setFields((prev) => ({ ...prev, [event.field]: { value: event.value, source: event.source } }))
      } else if (event.type === 'courses') {
        setFields((prev) => ({ ...prev, courses: { value: event.courses, source: 'catalog' } }))
      } else if (event.type === 'interests') {
        setFields((prev) => ({ ...prev, interests: { value: event.interests, source: 'bio-extraction' } }))
      } else if (event.type === 'complete') {
        setProfile(event.profile)
        setConfidence(event.confidence)
        setStatus('complete')
        es.close()
      } else if (event.type === 'error') {
        setErrorMessage(event.message)
        setStatus('error')
        es.close()
      }
    }

    es.onerror = () => {
      setStatus('error')
      setErrorMessage('Connection lost — you can fill in your details manually.')
      es.close()
    }

    return () => es.close()
  }, [email])

  return { steps, fields, profile, confidence, status, errorMessage }
}
