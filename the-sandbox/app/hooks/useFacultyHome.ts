// ─── useFacultyHome ─────────────────────────────────────────
// Consolidated data fetching hook for the faculty homepage.
// Parallel-fetches briefing, dashboard, engagement trends, and concept gaps.

import { useState, useEffect, useCallback } from 'react'
import type { BriefingData } from '../components/faculty-home/briefing-utils'
import type { FacultyHomepageV2Data } from '../lib/faculty/homepage-types'
import type { DayLifecycleData } from '../lib/faculty/day-lifecycle-service'

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

interface EngagementCourse {
  id: string
  name: string
  totalStudents: number
  weeks: { weekOf: string; engagement: number }[]
}

interface ConceptGap {
  concept: string
  studentCount: number
  avgMastery: number
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

interface FacultyHomeData {
  briefing: BriefingData | null
  dashboard: DashboardData | null
  engagementCourses: EngagementCourse[]
  conceptGaps: ConceptGap[]
  v2Data: FacultyHomepageV2Data | null
  dayLifecycle: DayLifecycleData | null
  overnightTasks: AsyncTask[]
  loading: boolean
  briefingLoading: boolean
  v2Loading: boolean
  error: string | null
  refreshBriefing: () => Promise<void>
}

export function useFacultyHome(userEmail: string): FacultyHomeData {
  const [briefing, setBriefing] = useState<BriefingData | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [engagementCourses, setEngagementCourses] = useState<EngagementCourse[]>([])
  const [conceptGaps, setConceptGaps] = useState<ConceptGap[]>([])
  const [v2Data, setV2Data] = useState<FacultyHomepageV2Data | null>(null)
  const [dayLifecycle, setDayLifecycle] = useState<DayLifecycleData | null>(null)
  const [overnightTasks, setOvernightTasks] = useState<AsyncTask[]>([])
  const [loading, setLoading] = useState(true)
  const [briefingLoading, setBriefingLoading] = useState(true)
  const [v2Loading, setV2Loading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const headers = useCallback(() => ({
    'x-demo-user-email': userEmail,
  }), [userEmail])

  const fetchBriefing = useCallback(async () => {
    setBriefingLoading(true)
    try {
      const res = await fetch('/api/briefing', { headers: headers() })
      if (res.ok) {
        const data = await res.json()
        setBriefing(data)
      }
    } catch {
      // Briefing failure is non-fatal — dashboard still renders
    } finally {
      setBriefingLoading(false)
    }
  }, [headers])

  useEffect(() => {
    let cancelled = false

    async function loadAll() {
      setLoading(true)
      setError(null)
      setBriefingLoading(true)
      setV2Loading(true)
      setBriefing(null)
      setDashboard(null)
      setEngagementCourses([])
      setConceptGaps([])
      setV2Data(null)
      setDayLifecycle(null)
      setOvernightTasks([])

      const h = headers()

      // Parallel fetch all data sources
      const [briefingRes, dashboardRes, engagementRes, conceptsRes, v2Res, dayLifecycleRes, overnightRes] = await Promise.allSettled([
        fetch('/api/briefing', { headers: h }),
        fetch('/api/dashboard', { headers: h }),
        fetch('/api/workshop/command-center/engagement-trend', { headers: h }),
        fetch('/api/workshop/command-center/concept-gaps', { headers: h }),
        fetch('/api/faculty/homepage-data', { headers: h }),
        fetch('/api/faculty/day-summary', { headers: h }),
        fetch('/api/faculty/overnight-tasks', { headers: h }),
      ])

      if (cancelled) return

      // Briefing
      if (briefingRes.status === 'fulfilled' && briefingRes.value.ok) {
        try {
          const data = await briefingRes.value.json()
          setBriefing(data)
        } catch { /* ignore */ }
      }
      setBriefingLoading(false)

      // Dashboard
      if (dashboardRes.status === 'fulfilled' && dashboardRes.value.ok) {
        try {
          const data = await dashboardRes.value.json()
          setDashboard(data)
        } catch { /* ignore */ }
      }

      // Engagement trends
      if (engagementRes.status === 'fulfilled' && engagementRes.value.ok) {
        try {
          const data = await engagementRes.value.json()
          setEngagementCourses(data.courses ?? [])
        } catch { /* ignore */ }
      }

      // Concept gaps
      if (conceptsRes.status === 'fulfilled' && conceptsRes.value.ok) {
        try {
          const data = await conceptsRes.value.json()
          setConceptGaps(data.concepts ?? [])
        } catch { /* ignore */ }
      }

      // Faculty homepage v2 data
      if (v2Res.status === 'fulfilled' && v2Res.value.ok) {
        try {
          const data = await v2Res.value.json()
          setV2Data(data)
        } catch {
          setV2Data(null)
        }
      } else {
        setV2Data(null)
      }
      setV2Loading(false)

      // Day lifecycle data
      if (dayLifecycleRes.status === 'fulfilled' && dayLifecycleRes.value.ok) {
        try {
          const data = await dayLifecycleRes.value.json()
          setDayLifecycle(data)
        } catch { /* ignore */ }
      }

      // Overnight Sandy tasks
      if (overnightRes.status === 'fulfilled' && overnightRes.value.ok) {
        try {
          const data = await overnightRes.value.json()
          setOvernightTasks(data.tasks ?? [])
        } catch { /* ignore */ }
      }

      if (!cancelled) setLoading(false)
    }

    void loadAll()
    return () => { cancelled = true }
  }, [headers])

  return {
    briefing,
    dashboard,
    engagementCourses,
    conceptGaps,
    v2Data,
    dayLifecycle,
    overnightTasks,
    loading,
    briefingLoading,
    v2Loading,
    error,
    refreshBriefing: fetchBriefing,
  }
}
