'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth-context'
import TeachBackLauncher from './TeachBackLauncher'

interface TeachBackSectionProps {
  courseId: string
}

interface ConceptOption {
  slug: string
  label: string
  mastery: number
}

/**
 * Fetches eligible concepts (mastery > 0.75, Bloom < 6) for a course
 * and renders the TeachBackLauncher if any exist.
 */
export default function TeachBackSection({ courseId }: TeachBackSectionProps) {
  const { currentUser } = useAuth()
  const [concepts, setConcepts] = useState<ConceptOption[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        // Fetch concept masteries for this student + course
        const res = await fetch(`/api/teach-back/eligible?courseId=${courseId}`, {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (!cancelled && Array.isArray(data.concepts)) {
          setConcepts(data.concepts)
        }
      } catch {
        // Silently fail — this is an enhancement, not critical
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }
    load()
    return () => { cancelled = true }
  }, [courseId, currentUser.email])

  if (!loaded || concepts.length === 0) return null

  return <TeachBackLauncher courseId={courseId} concepts={concepts} />
}
