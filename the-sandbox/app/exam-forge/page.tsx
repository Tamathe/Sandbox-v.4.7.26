'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../lib/auth-context'
import { apiFetch } from '../lib/api-client'
import PageHeader from '../components/PageHeader'
import ExamCard from '../components/exam-forge/ExamCard'
import ExamConfigModal from '../components/exam-forge/ExamConfigModal'
import {
  FlaskConical,
  Loader2,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { format } from 'date-fns'

interface EnrolledCourse {
  courseId: string
  courseCode: string
  title: string
}

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

export default function ExamForgePage() {
  const { currentUser } = useAuth()
  const router = useRouter()

  const [courses, setCourses] = useState<EnrolledCourse[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [assignments, setAssignments] = useState<UpcomingAssignment[]>([])
  const [pastExams, setPastExams] = useState<PastExam[]>([])
  const [loading, setLoading] = useState(true)
  const [assignmentsLoading, setAssignmentsLoading] = useState(false)
  const [generating, setGenerating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [modalTarget, setModalTarget] = useState<{ assignmentId?: string; title?: string } | null>(null)

  // Fetch enrolled courses
  useEffect(() => {
    if (currentUser.role !== 'STUDENT' && currentUser.role !== 'ADMIN') return
    const controller = new AbortController()
    apiFetch<{ courses?: EnrolledCourse[] }>(currentUser.email, '/api/enrollment', {
      signal: controller.signal,
    })
      .then((data) => {
        if (Array.isArray(data.courses)) {
          const enrolled = data.courses.map((c: { courseId: string; courseCode: string; title: string }) => ({
            courseId: c.courseId,
            courseCode: c.courseCode,
            title: c.title,
          }))
          setCourses(enrolled)
          if (enrolled.length > 0) {
            // Check URL for courseId param
            const urlParams = new URLSearchParams(window.location.search)
            const urlCourseId = urlParams.get('courseId')
            if (urlCourseId && enrolled.some((c: EnrolledCourse) => c.courseId === urlCourseId)) {
              setSelectedCourseId(urlCourseId)
            } else {
              setSelectedCourseId(enrolled[0].courseId)
            }
            // Auto-open modal if targetAssignmentId is in URL
            const urlAssignmentId = urlParams.get('targetAssignmentId')
            if (urlAssignmentId) {
              setModalTarget({ assignmentId: urlAssignmentId })
            }
          }
        }
      })
      .catch((err) => {
        if (err instanceof Error && err.name === 'AbortError') return
        setError('Failed to load courses')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [currentUser])

  // Fetch upcoming assignments + past exams when course changes
  const fetchCourseData = useCallback(async (signal?: AbortSignal) => {
    if (!selectedCourseId) return
    setAssignmentsLoading(true)
    setError(null)

    try {
      const [assignmentsResult, examsResult] = await Promise.allSettled([
        apiFetch<UpcomingAssignment[] | { assignments?: UpcomingAssignment[] }>(currentUser.email, `/api/assignments?courseId=${selectedCourseId}`, {
          signal,
        }),
        apiFetch<PastExam[]>(currentUser.email, `/api/exam-forge?courseId=${selectedCourseId}`, {
          signal,
        }),
      ])

      if (assignmentsResult.status === 'fulfilled') {
        const data = assignmentsResult.value
        const all = Array.isArray(data) ? data : (data as { assignments?: UpcomingAssignment[] }).assignments ?? []
        const now = Date.now()
        const fourteenDays = 14 * 24 * 60 * 60 * 1000
        const upcoming = all.filter((a: UpcomingAssignment & { type?: string }) => {
          const isExamType = ['quiz', 'exam', 'midterm', 'final'].includes(a.category ?? '')
          const isDueSoon = a.dueAt && new Date(a.dueAt).getTime() > now && new Date(a.dueAt).getTime() - now < fourteenDays
          return isExamType && isDueSoon
        })
        setAssignments(upcoming)
      }

      if (examsResult.status === 'fulfilled') {
        const data = examsResult.value
        setPastExams(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError('Failed to load course data')
    } finally {
      setAssignmentsLoading(false)
    }
  }, [selectedCourseId, currentUser.email])

  useEffect(() => {
    const controller = new AbortController()
    fetchCourseData(controller.signal)
    return () => controller.abort()
  }, [fetchCourseData])

  // Open config modal
  const openModal = useCallback((assignmentId?: string, title?: string) => {
    setModalTarget({ assignmentId, title })
  }, [])

  // Generate practice exam (called from modal)
  const handleGenerate = useCallback(async (questionCount: number) => {
    if (!selectedCourseId) return
    const assignmentId = modalTarget?.assignmentId
    setGenerating(assignmentId ?? 'general')
    setError(null)

    try {
      const exam = await apiFetch<{ id: string }>(currentUser.email, '/api/exam-forge', {
        method: 'POST',
        body: JSON.stringify({
          courseId: selectedCourseId,
          targetAssignmentId: assignmentId,
          questionCount,
        }),
      })
      setModalTarget(null)
      router.push(`/exam-forge/${exam.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate exam')
    } finally {
      setGenerating(null)
    }
  }, [selectedCourseId, currentUser.email, router, modalTarget])

  if (currentUser.role !== 'STUDENT' && currentUser.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader title="Exam Forge" subtitle="Personalized practice exams" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center text-gray-500">
          Exam Forge is available to students.
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Exam Forge"
        subtitle="AI-generated practice exams personalized to your knowledge gaps"
        action={
          <button
            onClick={() => openModal()}
            disabled={!selectedCourseId || generating !== null}
            className="flex items-center gap-2 px-4 py-2 bg-[#0033A0] text-white text-sm font-semibold rounded-lg hover:bg-[#002880] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FlaskConical className="size-4" />
            Quick Practice Exam
          </button>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Course Selector */}
        <div>
          <label htmlFor="course-select" className="block text-sm font-medium text-gray-700 mb-1">
            Course
          </label>
          <select
            id="course-select"
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="w-full max-w-md px-3 py-2 border-2 border-gray-200 rounded-lg text-sm text-gray-900 focus:border-[#0033A0] focus:outline-none"
          >
            {loading ? (
              <option>Loading courses…</option>
            ) : courses.length === 0 ? (
              <option>No enrolled courses</option>
            ) : (
              courses.map((c) => (
                <option key={c.courseId} value={c.courseId}>
                  {c.courseCode} — {c.title}
                </option>
              ))
            )}
          </select>
        </div>

        {assignmentsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Upcoming Exams Panel */}
            <div className="space-y-4">
              <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <BookOpen className="size-5 text-[#0033A0]" />
                Upcoming Assessments
              </h2>
              {assignments.length === 0 ? (
                <div className="border-2 border-gray-200 rounded-2xl p-6 bg-white text-center text-sm text-gray-500">
                  No upcoming quizzes or exams in the next 14 days
                </div>
              ) : (
                <div className="space-y-3">
                  {assignments.map((a) => (
                    <ExamCard
                      key={a.id}
                      assignment={a}
                      courseId={selectedCourseId}
                      generating={generating === a.id}
                      onGenerate={(id) => openModal(id, a.title)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Past Practice Exams */}
            <div className="space-y-4">
              <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <Clock className="size-5 text-[#0033A0]" />
                Past Practice Exams
              </h2>
              {pastExams.length === 0 ? (
                <div className="border-2 border-gray-200 rounded-2xl p-6 bg-white text-center text-sm text-gray-500">
                  No practice exams yet — generate your first one!
                </div>
              ) : (
                <div className="space-y-3">
                  {pastExams.map((exam) => (
                    <button
                      key={exam.id}
                      onClick={() => router.push(`/exam-forge/${exam.id}`)}
                      className="w-full border-2 border-gray-200 rounded-2xl p-4 bg-white hover:border-gray-300 transition-colors text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-gray-900 truncate">{exam.title}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {exam.questionCount} questions · {format(new Date(exam.createdAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                        {exam.score !== null ? (
                          <div className="flex items-center gap-1.5 shrink-0">
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
                </div>
              )}
            </div>
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
