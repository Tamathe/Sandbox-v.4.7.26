'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, User } from 'lucide-react'
import Link from 'next/link'
import PageHeader from '../../../../components/PageHeader'
import SuccessScoreChart from '../../../../components/success/SuccessScoreChart'
import SignalBreakdown from '../../../../components/success/SignalBreakdown'
import InterventionTimeline from '../../../../components/success/InterventionTimeline'
import TrajectoryBadge from '../../../../components/success/TrajectoryBadge'
import SeverityBadge from '../../../../components/success/SeverityBadge'

export default function StudentSuccessDetailPage() {
  const { courseId, userId } = useParams<{ courseId: string; userId: string }>()
  const [student, setStudent] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [interventions, setInterventions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/success/course/${courseId}/students`).then(r => r.json()),
      fetch(`/api/success/history?courseId=${courseId}&days=90`).then(r => r.json()),
      fetch(`/api/success/interventions?courseId=${courseId}`).then(r => r.json()),
    ]).then(([students, hist, ints]) => {
      const s = (Array.isArray(students) ? students : []).find((s: any) => s.userId === userId)
      setStudent(s ?? null)
      setHistory(Array.isArray(hist) ? hist : [])
      setInterventions((Array.isArray(ints) ? ints : []).filter((i: any) => i.userId === userId))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [courseId, userId])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-64 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <p className="text-gray-500">Student not found or no score data available.</p>
      </div>
    )
  }

  const signals = [
    student.loginScore != null && { signal: 'loginFrequency', score: student.loginScore },
    student.assignmentScore != null && { signal: 'assignmentSubmission', score: student.assignmentScore },
    student.sandyUsageScore != null && { signal: 'sandyUsageDecay', score: student.sandyUsageScore },
    student.studySessionScore != null && { signal: 'studySessionCadence', score: student.studySessionScore },
    student.conceptMasteryScore != null && { signal: 'conceptMasterySlope', score: student.conceptMasteryScore },
    student.commonsScore != null && { signal: 'commonsParticipation', score: student.commonsScore },
    student.flashcardScore != null && { signal: 'flashcardConsistency', score: student.flashcardScore },
    student.gradeTrendScore != null && { signal: 'gradeTrend', score: student.gradeTrendScore },
    student.toolEngagementScore != null && { signal: 'toolEngagement', score: student.toolEngagementScore },
    student.contentAccessScore != null && { signal: 'contentAccess', score: student.contentAccessScore },
  ].filter(Boolean) as { signal: string; score: number }[]

  const severity = student.score < 15 ? 'CRITICAL' : student.score < 30 ? 'URGENT' : student.score < 50 ? 'CONCERN' : student.score < 70 ? 'WATCH' : null

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <Link
        href="/analytics/success"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#0033A0]"
      >
        <ArrowLeft className="size-4" />
        Back to dashboard
      </Link>

      <div className="flex items-center gap-4">
        <div className="size-12 rounded-full bg-gray-200 flex items-center justify-center">
          <User className="size-6 text-gray-500" />
        </div>
        <div>
          <h1 className="font-extrabold text-2xl">{student.user.name}</h1>
          <p className="text-sm text-gray-500">{student.user.email}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-3xl font-bold">{student.score}/100</span>
          <TrajectoryBadge trajectory={student.trajectory} />
          {severity && <SeverityBadge severity={severity} />}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score history chart */}
        <div className="border rounded-2xl shadow-sm p-6">
          <h3 className="font-extrabold text-lg mb-4">Score History (90 days)</h3>
          {history.length > 0 ? (
            <SuccessScoreChart history={history} />
          ) : (
            <p className="text-sm text-gray-400 py-8 text-center">No history data yet.</p>
          )}
        </div>

        {/* Signal breakdown */}
        <div className="border rounded-2xl shadow-sm p-6">
          <h3 className="font-extrabold text-lg mb-4">Signal Breakdown</h3>
          <SignalBreakdown signals={signals} />
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border rounded-xl p-4">
          <span className="text-xs text-gray-500">Baseline Score</span>
          <p className="text-xl font-bold">{student.baselineScore ?? '—'}</p>
        </div>
        <div className="border rounded-xl p-4">
          <span className="text-xs text-gray-500">Peak Score</span>
          <p className="text-xl font-bold">{student.peakScore ?? '—'}</p>
        </div>
        <div className="border rounded-xl p-4">
          <span className="text-xs text-gray-500">7d Change</span>
          <p className={`text-xl font-bold ${(student.scoreDelta7d ?? 0) > 0 ? 'text-emerald-600' : (student.scoreDelta7d ?? 0) < 0 ? 'text-red-600' : ''}`}>
            {(student.scoreDelta7d ?? 0) > 0 ? '+' : ''}{student.scoreDelta7d ?? 0}
          </p>
        </div>
        <div className="border rounded-xl p-4">
          <span className="text-xs text-gray-500">Days Since Active</span>
          <p className="text-xl font-bold">{student.daysSinceActive}</p>
        </div>
      </div>

      {/* Interventions */}
      <div className="border rounded-2xl shadow-sm p-6">
        <h3 className="font-extrabold text-lg mb-4">Intervention History</h3>
        <InterventionTimeline interventions={interventions} />
      </div>
    </div>
  )
}
