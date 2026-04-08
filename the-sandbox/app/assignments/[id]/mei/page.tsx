'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BarChart3, Loader2 } from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'
import PageHeader from '../../../components/PageHeader'
import MeiDashboard from '../../../components/assignments/MeiDashboard'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MeiStudent {
  id: string
  studentId: string
  meiScore: number
  durationTrend: number
  scoreTrend: number
  hintIndependence: number
  reformulationDecline: number
  bloomCeiling: number
  sessionsAnalyzed: number
  computedAt: string
  student: { id: string; name: string; email: string }
}

interface MeiAggregates {
  totalStudents: number
  scoredStudents: number
  avgMeiScore: number | null
  medianMeiScore: number | null
  avgDurationTrend: number | null
  avgScoreTrend: number | null
  avgHintIndependence: number | null
  avgReformulationDecline: number | null
  avgBloomCeiling: number | null
}

interface AssignmentMeta {
  title: string
  courseId: string
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MeiPage() {
  const { id: assignmentId } = useParams<{ id: string }>()
  const { currentUser } = useAuth()

  const authHeaders: Record<string, string> = currentUser?.email
    ? { 'x-demo-user-email': currentUser.email }
    : {}

  const [scores, setScores] = useState<MeiStudent[]>([])
  const [aggregates, setAggregates] = useState<MeiAggregates | null>(null)
  const [assignmentMeta, setAssignmentMeta] = useState<AssignmentMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch assignment meta + MEI data in parallel
      const [metaRes, meiRes] = await Promise.all([
        fetch(`/api/assignments/${assignmentId}`, { headers: authHeaders }),
        fetch(`/api/assignments/${assignmentId}/mei`, { headers: authHeaders }),
      ])

      if (!metaRes.ok) {
        setError('Assignment not found')
        return
      }
      if (!meiRes.ok) {
        const d = await meiRes.json().catch(() => ({}))
        setError(d.error ?? 'Failed to load MEI data')
        return
      }

      const meta = await metaRes.json()
      const mei = await meiRes.json()

      setAssignmentMeta({ title: meta.title, courseId: meta.course?.id ?? meta.courseId })
      setScores(mei.scores ?? [])
      setAggregates(mei.aggregates ?? null)
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId, currentUser?.email])

  useEffect(() => { load() }, [load])

  // Auth guard — only educators/admins should see this
  const isEducator = currentUser.role === 'EDUCATOR' || currentUser.role === 'ADMIN'
  if (!isEducator) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="font-extrabold text-gray-600 mb-1">Access Denied</h2>
          <p className="text-sm text-gray-400">Only educators can view MEI dashboards.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="size-8 animate-spin text-[#0033A0]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="font-extrabold text-gray-600 mb-1">Error</h2>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={`MEI Scores — ${assignmentMeta?.title ?? 'Assignment'}`}
        subtitle={`${aggregates?.scoredStudents ?? 0} of ${aggregates?.totalStudents ?? 0} students scored`}
        action={
          <Link
            href={assignmentMeta?.courseId ? `/courses/${assignmentMeta.courseId}/assignments` : '#'}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="size-4" />
            Back to Assignments
          </Link>
        }
      >
        <div className="mt-2 flex items-center gap-1.5 text-xs text-[#0033A0]">
          <BarChart3 className="size-3.5" />
          <span className="font-medium">Mastery Efficiency Index Dashboard</span>
        </div>
      </PageHeader>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {aggregates && (
          <MeiDashboard
            assignmentId={assignmentId}
            authHeaders={authHeaders}
            scores={scores}
            aggregates={aggregates}
            onRefresh={load}
          />
        )}
      </div>
    </div>
  )
}
