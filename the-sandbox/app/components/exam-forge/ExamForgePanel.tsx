'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../lib/auth-context'
import ExamCard from './ExamCard'
import ExamConfigModal from './ExamConfigModal'
import {
  FlaskConical,
  Loader2,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  TrendingUp,
  Brain,
} from 'lucide-react'
import { format } from 'date-fns'

// ── Types ─────────────────────────────────────────────────────────────────────

interface UpcomingAssignment {
  id: string
  title: string
  dueAt: string | null
  category: string | null
  pointsPossible: number
}

interface PastExam {
  id: string
  title: string
  courseCode: string
  courseName: string
  questionCount: number
  score: number | null
  completedAt: string | null
  createdAt: string
}

interface ExamForgeStats {
  totalGenerated: number
  totalCompleted: number
  avgScore: number | null
  conceptWeaknesses: { concept: string; avgScore: number; attempts: number }[]
}

interface ExamForgePanelProps {
  courseId: string
}

export default function ExamForgePanel({ courseId }: ExamForgePanelProps) {
  const { currentUser } = useAuth()
  const isStudent = currentUser.role === 'STUDENT' || currentUser.role === 'ADMIN'
  const isEducator = currentUser.role === 'EDUCATOR' || currentUser.role === 'ADMIN'

  return isStudent ? (
    <StudentExamForge courseId={courseId} />
  ) : isEducator ? (
    <EducatorExamForge courseId={courseId} />
  ) : null
}

// ── Student View ─────────────────────────────────────────────────────────────

function StudentExamForge({ courseId }: { courseId: string }) {
  const { currentUser } = useAuth()
  const router = useRouter()

  const [assignments, setAssignments] = useState<UpcomingAssignment[]>([])
  const [pastExams, setPastExams] = useState<PastExam[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [modalTarget, setModalTarget] = useState<{ assignmentId?: string; title?: string } | null>(null)

  // Fetch upcoming assignments + past exams
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      fetch(`/api/assignments?courseId=${courseId}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      }).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/exam-forge?courseId=${courseId}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([assignmentsData, examsData]) => {
        if (cancelled) return

        if (assignmentsData) {
          const all = Array.isArray(assignmentsData) ? assignmentsData : assignmentsData.assignments ?? []
          const now = Date.now()
          const fourteenDays = 14 * 24 * 60 * 60 * 1000
          const upcoming = all.filter((a: UpcomingAssignment & { type?: string }) => {
            const isExamType = ['quiz', 'exam', 'midterm', 'final'].includes(a.category ?? '')
            const isDueSoon = a.dueAt && new Date(a.dueAt).getTime() > now && new Date(a.dueAt).getTime() - now < fourteenDays
            return isExamType && isDueSoon
          })
          setAssignments(upcoming)
        }

        if (examsData) {
          setPastExams(Array.isArray(examsData) ? examsData : [])
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load exam data')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [courseId, currentUser.email])

  // Generate practice exam
  const handleGenerate = useCallback(async (questionCount: number) => {
    const assignmentId = modalTarget?.assignmentId
    setGenerating(assignmentId ?? 'general')
    setError(null)

    try {
      const res = await fetch('/api/exam-forge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({
          courseId,
          targetAssignmentId: assignmentId,
          questionCount,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Failed to generate exam')
      }

      const exam = await res.json()
      setModalTarget(null)
      router.push(`/exam-forge/${exam.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate exam')
    } finally {
      setGenerating(null)
    }
  }, [courseId, currentUser.email, router, modalTarget])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="size-5 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-5 text-[#0033A0]" />
          <h2 className="text-base font-extrabold text-gray-900">AI Assessment Builder</h2>
          <span className="text-xs text-gray-400">AI-powered practice exams</span>
        </div>
        <button
          onClick={() => setModalTarget({})}
          disabled={generating !== null}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0033A0] text-white text-xs font-semibold rounded-lg hover:bg-[#002880] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {generating === 'general' ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <FlaskConical className="size-3.5" />
          )}
          Quick Practice
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Upcoming Assessments */}
      {assignments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
            <BookOpen className="size-4" />
            Upcoming Assessments
          </h3>
          <div className="space-y-2">
            {assignments.map((a) => (
              <ExamCard
                key={a.id}
                assignment={a}
                courseId={courseId}
                generating={generating === a.id}
                onGenerate={(id) => setModalTarget({ assignmentId: id, title: a.title })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Past Practice Exams */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
          <Clock className="size-4" />
          Practice History
        </h3>
        {pastExams.length === 0 ? (
          <div className="border-2 border-gray-200 rounded-2xl p-5 bg-white text-center">
            <FlaskConical className="size-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No practice exams yet</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Generate your first practice exam to identify knowledge gaps
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {pastExams.slice(0, 5).map((exam) => (
              <button
                key={exam.id}
                onClick={() => router.push(`/exam-forge/${exam.id}`)}
                className="w-full border-2 border-gray-200 rounded-2xl p-3 bg-white hover:border-gray-300 hover:shadow-sm transition-all text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-gray-900 truncate">{exam.title}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {exam.questionCount} questions · {format(new Date(exam.createdAt), 'MMM d')}
                    </p>
                  </div>
                  {exam.score !== null ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <CheckCircle2
                        className={`size-4 ${
                          exam.score >= 0.8 ? 'text-green-500' : exam.score >= 0.6 ? 'text-amber-500' : 'text-red-500'
                        }`}
                      />
                      <span
                        className={`text-sm font-bold ${
                          exam.score >= 0.8 ? 'text-green-600' : exam.score >= 0.6 ? 'text-amber-600' : 'text-red-600'
                        }`}
                      >
                        {Math.round(exam.score * 100)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic shrink-0">In progress</span>
                  )}
                </div>
              </button>
            ))}
            {pastExams.length > 5 && (
              <button
                onClick={() => router.push(`/exam-forge?courseId=${courseId}`)}
                className="w-full text-center text-xs text-[#0033A0] font-semibold py-2 hover:underline"
              >
                View all {pastExams.length} practice exams
              </button>
            )}
          </div>
        )}
      </div>

      {/* Exam Config Modal */}
      {modalTarget && (
        <ExamConfigModal
          assignmentTitle={modalTarget.title}
          onGenerate={handleGenerate}
          onClose={() => { if (!generating) setModalTarget(null) }}
          generating={generating !== null}
        />
      )}
    </div>
  )
}

// ── Educator View ────────────────────────────────────────────────────────────

function EducatorExamForge({ courseId }: { courseId: string }) {
  const { currentUser } = useAuth()
  const [stats, setStats] = useState<ExamForgeStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    fetch(`/api/exam-forge/stats?courseId=${courseId}`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        if (data) setStats(data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [courseId, currentUser.email])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="size-5 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-5 text-[#0033A0]" />
          <h2 className="text-base font-extrabold text-gray-900">AI Assessment Builder</h2>
        </div>
        <div className="border-2 border-gray-200 rounded-2xl p-5 bg-white text-center">
          <FlaskConical className="size-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No student practice data yet</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Students can generate AI-powered practice exams from the Assignments tab
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <FlaskConical className="size-5 text-[#0033A0]" />
        <h2 className="text-base font-extrabold text-gray-900">Exam Forge Insights</h2>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border-2 border-gray-200 rounded-2xl p-4 bg-white text-center">
          <Users className="size-5 text-[#0033A0] mx-auto mb-1" />
          <div className="text-xl font-extrabold text-gray-900">{stats.totalGenerated}</div>
          <div className="text-xs text-gray-500">Exams Generated</div>
        </div>
        <div className="border-2 border-gray-200 rounded-2xl p-4 bg-white text-center">
          <CheckCircle2 className="size-5 text-green-500 mx-auto mb-1" />
          <div className="text-xl font-extrabold text-gray-900">{stats.totalCompleted}</div>
          <div className="text-xs text-gray-500">Completed</div>
        </div>
        <div className="border-2 border-gray-200 rounded-2xl p-4 bg-white text-center">
          <TrendingUp className="size-5 text-amber-500 mx-auto mb-1" />
          <div className="text-xl font-extrabold text-gray-900">
            {stats.avgScore !== null ? `${Math.round(stats.avgScore * 100)}%` : '—'}
          </div>
          <div className="text-xs text-gray-500">Avg Score</div>
        </div>
      </div>

      {/* Concept Weaknesses */}
      {stats.conceptWeaknesses.length > 0 && (
        <div className="border-2 border-gray-200 rounded-2xl p-5 bg-white space-y-3">
          <div className="flex items-center gap-2">
            <Brain className="size-4 text-[#0033A0]" />
            <h3 className="text-sm font-bold text-gray-900">Common Struggle Points</h3>
          </div>
          <p className="text-xs text-gray-500">
            Concepts where students score lowest across practice exams
          </p>
          <div className="space-y-2">
            {stats.conceptWeaknesses.slice(0, 8).map((cw) => {
              const pct = Math.round(cw.avgScore * 100)
              const barColor =
                pct >= 80
                  ? 'bg-green-500'
                  : pct >= 60
                    ? 'bg-amber-500'
                    : 'bg-red-500'
              return (
                <div key={cw.concept}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700 capitalize truncate mr-2">
                      {cw.concept.replace(/-/g, ' ')}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400">{cw.attempts} attempt{cw.attempts !== 1 ? 's' : ''}</span>
                      <span className="font-medium text-gray-900 w-8 text-right">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        Data from student-generated practice exams — FERPA protected
      </p>
    </div>
  )
}
