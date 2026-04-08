// ─── useFacultyHomeBundle ───────────────────────────────────────
// Replaces 5+ individual API calls with a single bundle request.
// Drop-in replacement for useFacultyHome — same return shape.

import { useCallback } from 'react'
import type { BriefingData } from '../components/faculty-home/briefing-utils'
import type { FacultyHomepageV2Data } from '../lib/faculty/homepage-types'
import type { DayLifecycleData } from '../lib/faculty/day-lifecycle-service'
import { apiFetch } from '../lib/api-client'
import { useApiFetch } from './useApiFetch'
import { useAuth } from '../lib/auth-context'

interface CourseHealth {
  id: string
  code: string
  title: string
  enrolled: number
  engagementPct: number
  avgScore: number | null
  atRiskCount: number
}

interface DashboardData {
  toolsPublished: number
  activeStudents: number
  courseHealth: CourseHealth[]
  pendingGradeCount?: number
  gradingQueueStale?: number
}

interface AsyncTask {
  id: string
  prompt: string
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  result: string | null
  resultType: string | null
  queuedAt: string
  completedAt: string | null
  reviewedAt: string | null
  accepted: boolean | null
}

interface FacultyHomeBundleResponse {
  briefing: BriefingData | null
  dashboard: DashboardData | null
  homepage: FacultyHomepageV2Data | null
  dayLifecycle: DayLifecycleData | null
  tasks: AsyncTask[]
}

interface FacultyHomeData {
  briefing: BriefingData | null
  dashboard: DashboardData | null
  engagementCourses: { id: string; name: string; totalStudents: number; weeks: { weekOf: string; engagement: number }[] }[]
  conceptGaps: { concept: string; studentCount: number; avgMastery: number }[]
  v2Data: FacultyHomepageV2Data | null
  dayLifecycle: DayLifecycleData | null
  overnightTasks: AsyncTask[]
  loading: boolean
  briefingLoading: boolean
  v2Loading: boolean
  error: string | null
  refreshBriefing: () => Promise<void>
}

export function useFacultyHomeBundle(_userEmail: string): FacultyHomeData {
  const { currentUser } = useAuth()
  const { data, isLoading: loading, error: swrError, mutate } = useApiFetch<FacultyHomeBundleResponse>('/api/faculty/home-bundle')

  const refreshBriefing = useCallback(async () => {
    try {
      const briefing = await apiFetch<BriefingData>(currentUser.email, '/api/briefing')
      mutate(prev => prev ? { ...prev, briefing } : prev, false)
    } catch {
      // Non-fatal
    }
  }, [currentUser.email, mutate])

  return {
    briefing: data?.briefing ?? null,
    dashboard: data?.dashboard ?? null,
    engagementCourses: [], // Removed routes — always empty
    conceptGaps: [], // Removed routes — always empty
    v2Data: data?.homepage ?? null,
    dayLifecycle: data?.dayLifecycle ?? null,
    overnightTasks: data?.tasks ?? [],
    loading,
    briefingLoading: loading,
    v2Loading: loading,
    error: swrError ? 'Failed to load homepage data' : null,
    refreshBriefing,
  }
}
