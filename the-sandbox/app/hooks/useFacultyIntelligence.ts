// ─── useFacultyIntelligence ──────────────────────────────────────────────────
// Consolidated data hook for the Faculty Intelligence page.
// Parallel-fetches briefing, scorecard, and action items.

import { useState, useEffect, useCallback } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface FacultyBriefing {
  id: string
  userId: string
  courseId: string | null
  briefingHtml: string
  highlights: string[]
  concerns: string[]
  statsSnapshot: Record<string, number>
  stale: boolean
  generatedAt: string
}

interface ScorecardDimension {
  name: string
  avgScore: number
  maxScore: number
  distribution: { band: string; count: number }[]
}

interface ScorecardAssignment {
  assignmentId: string
  title: string
  dueAt: string | null
  pointsPossible: number
  submissionCount: number
  gradedCount: number
  avgComposite: number | null
  dimensions: ScorecardDimension[]
}

import type { ActionItem } from '../lib/analytics/action-panel-service'

export interface FacultyIntelligenceData {
  briefing: FacultyBriefing | null
  needsGeneration: boolean
  scorecard: ScorecardAssignment[]
  actions: ActionItem[]
  loading: boolean
  error: string | null
  refreshBriefing: () => Promise<void>
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useFacultyIntelligence(
  userEmail: string,
  courseId?: string,
): FacultyIntelligenceData {
  const [briefing, setBriefing] = useState<FacultyBriefing | null>(null)
  const [needsGeneration, setNeedsGeneration] = useState(false)
  const [scorecard, setScorecard] = useState<ScorecardAssignment[]>([])
  const [actions, setActions] = useState<ActionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const headers = useCallback(
    () => ({ 'x-demo-user-email': userEmail }),
    [userEmail],
  )

  // ── Parallel fetch all three sources ───────────────────────────────────────

  useEffect(() => {
    if (!userEmail) return
    let cancelled = false

    async function loadAll() {
      setLoading(true)
      setError(null)

      const h = headers()
      const qs = courseId ? `?courseId=${courseId}` : ''
      const scorecardQs = courseId ? `?courseId=${courseId}` : ''

      const [briefingRes, scorecardRes, actionsRes] = await Promise.allSettled([
        fetch(`/api/analytics/faculty-intelligence/briefing${qs}`, { headers: h }),
        // Scorecard requires courseId — skip if none selected
        courseId
          ? fetch(`/api/analytics/faculty-intelligence/scorecard${scorecardQs}`, { headers: h })
          : Promise.resolve(null),
        fetch(`/api/analytics/faculty-intelligence/actions${qs}`, { headers: h }),
      ])

      if (cancelled) return

      // Briefing
      if (briefingRes.status === 'fulfilled' && briefingRes.value?.ok) {
        try {
          const data = await briefingRes.value.json()
          setBriefing(data.briefing ?? null)
          setNeedsGeneration(data.needsGeneration ?? false)
        } catch {
          setBriefing(null)
          setNeedsGeneration(true)
        }
      } else {
        setBriefing(null)
        setNeedsGeneration(true)
      }

      // Scorecard
      if (
        scorecardRes.status === 'fulfilled' &&
        scorecardRes.value &&
        scorecardRes.value.ok
      ) {
        try {
          const data = await scorecardRes.value.json()
          setScorecard(data.scorecard ?? [])
        } catch {
          setScorecard([])
        }
      } else {
        setScorecard([])
      }

      // Actions
      if (actionsRes.status === 'fulfilled' && actionsRes.value?.ok) {
        try {
          const data = await actionsRes.value.json()
          setActions(data.actions ?? [])
        } catch {
          setActions([])
        }
      } else {
        setActions([])
      }

      setLoading(false)
    }

    loadAll().catch((err) => {
      if (!cancelled) {
        setError(err?.message ?? 'Failed to load intelligence data')
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [userEmail, courseId, headers])

  // ── Refresh briefing ───────────────────────────────────────────────────────

  const refreshBriefing = useCallback(async () => {
    const h = {
      ...headers(),
      'Content-Type': 'application/json',
    }
    try {
      const res = await fetch('/api/analytics/faculty-intelligence/briefing/refresh', {
        method: 'POST',
        headers: h,
        body: JSON.stringify({ courseId }),
      })
      if (res.ok) {
        const data = await res.json()
        setBriefing(data.briefing ?? null)
        setNeedsGeneration(false)
      }
    } catch {
      // Refresh failure is non-fatal
    }
  }, [headers, courseId])

  return {
    briefing,
    needsGeneration,
    scorecard,
    actions,
    loading,
    error,
    refreshBriefing,
  }
}
