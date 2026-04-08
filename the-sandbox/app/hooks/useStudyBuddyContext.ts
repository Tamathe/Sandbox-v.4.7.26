'use client'

import { useState, useEffect, useCallback } from 'react'

// ── Types ────────────────────────────────────────────────────────────────────

type Mode = 'tutor' | 'quiz' | 'flashcards' | 'socratic' | 'teach-back' | 'debate' | 'essay'

export interface StudyBuddyContextProfile {
  preferredModality: string | null
  riskScore: number | null
  learningVelocity: number | null
  dominantBloomLevel: number | null
  avgCognitiveLoad: number | null
  topConceptsThisWeek: string[]
  peakEngagementHour: number | null
  lastSessionAt: string | null
}

export interface WeakConcept {
  concept: string
  effectiveMastery: number
  isStale: boolean
  encounterCount: number
  lastSeenAt: string
}

export interface StrongConcept {
  concept: string
  effectiveMastery: number
  encounterCount: number
}

export interface DueConcept {
  conceptSlug: string
  daysOverdue: number
  bloomHighWater: number | null
  remediationHints: string[]
}

export interface EpisodicMemoryEntry {
  toolName: string
  courseCode: string
  score: number | null
  conceptsOverlap: string[]
  createdAt: string
}

export interface RecentToolSession {
  id: string
  score: number | null
  conceptsTouched: string[]
  startedAt: string
  bloomLevel: number | null
  qualitySignal: string | null
}

export interface StudyBuddyContextData {
  profile: StudyBuddyContextProfile | null
  weakConcepts: WeakConcept[]
  strongConcepts: StrongConcept[]
  dueConcepts: DueConcept[]
  episodicMemory: EpisodicMemoryEntry[]
  episodicBlock: string
  recentToolSessions: RecentToolSession[]
  suggestedMode: Mode | null
  suggestedReason: string | null
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useStudyBuddyContext(
  toolId: string,
  userEmail: string,
): {
  context: StudyBuddyContextData | null
  loading: boolean
  refresh: () => void
} {
  const [context, setContext] = useState<StudyBuddyContextData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchContext = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/study/${toolId}/context`, {
        headers: { 'x-demo-user-email': userEmail },
      })
      if (!res.ok) {
        setContext(null)
        return
      }
      const data: StudyBuddyContextData = await res.json()
      setContext(data)
    } catch {
      setContext(null)
    } finally {
      setLoading(false)
    }
  }, [toolId, userEmail])

  useEffect(() => {
    fetchContext()
  }, [fetchContext])

  return { context, loading, refresh: fetchContext }
}
