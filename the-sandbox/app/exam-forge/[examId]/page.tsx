'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import PageHeader from '../../components/PageHeader'
import QuestionCard from '../../components/exam-forge/QuestionCard'
import ExamResults from '../../components/exam-forge/ExamResults'
import {
  ArrowLeft,
  Clock,
  Loader2,
  Send,
  AlertCircle,
  FlaskConical,
} from 'lucide-react'

interface ExamQuestion {
  id: string
  concept: string
  bloomLevel: string
  type: 'multiple_choice' | 'short_answer' | 'scenario' | 'explain'
  question: string
  options?: string[]
  correctAnswer?: string
  explanation?: string
  points: number
}

interface QuestionResult {
  questionId: string
  studentAnswer: string
  correct: boolean
  score: number
  feedback: string
}

interface ExamData {
  id: string
  title: string
  courseCode: string
  courseName: string
  courseId?: string
  questionCount: number
  estimatedMinutes: number
  bloomDistribution: Record<string, number>
  conceptsTargeted: string[]
  questions: ExamQuestion[]
  score: number | null
  questionResults: QuestionResult[] | null
  completedAt: string | null
  createdAt: string
}

interface SubmitResponse {
  examId: string
  score: number
  questionCount: number
  correctCount: number
  questionResults: QuestionResult[]
  weaknesses: string[]
}

// ── Elapsed Timer Hook ────────────────────────────────────────────────────────

function useElapsedTimer(running: boolean) {
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

// ── Question Navigation Bar ──────────────────────────────────────────────────

function QuestionNav({
  questions,
  answers,
  activeIndex,
  onNavigate,
}: {
  questions: ExamQuestion[]
  answers: Record<string, string>
  activeIndex: number | null
  onNavigate: (index: number) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5 mb-6">
      {questions.map((q, i) => {
        const answered = (answers[q.id] ?? '').trim().length > 0
        const isActive = activeIndex === i
        return (
          <button
            key={q.id}
            onClick={() => onNavigate(i)}
            className={`flex items-center justify-center size-8 rounded-lg text-xs font-bold transition-colors ${
              isActive
                ? 'bg-[#0033A0] text-white'
                : answered
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {i + 1}
          </button>
        )
      })}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ExamDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { currentUser } = useAuth()
  const examId = params.examId as string

  const [exam, setExam] = useState<ExamData | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<SubmitResponse | null>(null)
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number | null>(null)
  const questionRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  const timerRunning = !!exam && !results && !submitting
  const elapsedTime = useElapsedTimer(timerRunning)

  // Fetch exam
  useEffect(() => {
    if (!examId) return
    setLoading(true)
    apiFetch<ExamData>(currentUser.email, `/api/exam-forge/${examId}`)
      .then((data) => {
        setExam(data)
        // If already completed, set results from stored data
        if (data.completedAt && data.questionResults && data.score !== null) {
          const weaknesses: string[] = []
          const conceptScores = new Map<string, { total: number; count: number }>()
          for (const q of data.questions) {
            const r = data.questionResults.find((qr: QuestionResult) => qr.questionId === q.id)
            if (r) {
              const existing = conceptScores.get(q.concept) ?? { total: 0, count: 0 }
              existing.total += r.score
              existing.count += 1
              conceptScores.set(q.concept, existing)
            }
          }
          for (const [concept, scores] of conceptScores) {
            if (scores.total / scores.count < 0.6) weaknesses.push(concept)
          }

          setResults({
            examId: data.id,
            score: data.score,
            questionCount: data.questionCount,
            correctCount: data.questionResults.filter((r: QuestionResult) => r.correct).length,
            questionResults: data.questionResults,
            weaknesses,
          })
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load exam'))
      .finally(() => setLoading(false))
  }, [examId, currentUser.email])

  const handleAnswerChange = useCallback((questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }, [])

  const handleNavigate = useCallback((index: number) => {
    setActiveQuestionIndex(index)
    const el = questionRefs.current.get(index)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!exam) return
    setSubmitting(true)
    setError(null)

    try {
      const answerList = exam.questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] ?? '',
      }))

      const data = await apiFetch<SubmitResponse>(currentUser.email, `/api/exam-forge/${examId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: answerList }),
      })
      setResults(data)

      // Re-fetch exam to get full data with answers
      try {
        const updatedExam = await apiFetch<ExamData>(currentUser.email, `/api/exam-forge/${examId}`)
        setExam(updatedExam)
      } catch {
        // non-fatal — results already set
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit exam')
    } finally {
      setSubmitting(false)
    }
  }, [exam, answers, examId, currentUser.email])

  const answeredCount = exam
    ? exam.questions.filter((q) => (answers[q.id] ?? '').trim().length > 0).length
    : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader title="Exam Forge" subtitle="Loading…" />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (error && !exam) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader title="Exam Forge" subtitle="Error" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <div className="flex items-center justify-center gap-2 text-red-600 mb-4">
            <AlertCircle className="size-5" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => router.push('/exam-forge')}
            className="text-sm text-[#0033A0] hover:underline"
          >
            Back to Exam Forge
          </button>
        </div>
      </div>
    )
  }

  if (!exam) return null

  // Build courseId for retake navigation
  const retakeCourseId = exam.courseId ?? ''

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={exam.title}
        subtitle={`${exam.courseCode} — ${exam.courseName}`}
        action={
          <button
            onClick={() => router.push('/exam-forge')}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        {results ? (
          /* Results View */
          <ExamResults
            score={results.score}
            questionCount={results.questionCount}
            correctCount={results.correctCount}
            questionResults={results.questionResults}
            questions={exam.questions}
            weaknesses={results.weaknesses}
            courseId={exam.courseId}
            onRetake={() => router.push(`/exam-forge?courseId=${retakeCourseId}`)}
          />
        ) : (
          /* Exam Taking View */
          <>
            {/* Exam Info Bar */}
            <div className="flex items-center gap-4 mb-4 p-4 border-2 border-gray-200 rounded-2xl bg-white">
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <FlaskConical className="size-4 text-[#0033A0]" />
                <span className="font-medium">{exam.questionCount} questions</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <Clock className="size-4" />
                <span>~{exam.estimatedMinutes} min</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-mono text-[#0033A0] font-bold">
                <Clock className="size-4" />
                {elapsedTime}
              </div>
              <div className="flex-1" />
              <span className="text-sm text-gray-500">
                {answeredCount}/{exam.questionCount} answered
              </span>
            </div>

            {/* Question Navigation */}
            <QuestionNav
              questions={exam.questions}
              answers={answers}
              activeIndex={activeQuestionIndex}
              onNavigate={handleNavigate}
            />

            {/* Questions */}
            <div className="space-y-4 mb-8">
              {exam.questions.map((q, i) => (
                <div
                  key={q.id}
                  ref={(el) => {
                    if (el) questionRefs.current.set(i, el)
                    else questionRefs.current.delete(i)
                  }}
                  onClick={() => setActiveQuestionIndex(i)}
                >
                  <QuestionCard
                    index={i}
                    question={q}
                    answer={answers[q.id] ?? ''}
                    onChange={handleAnswerChange}
                    disabled={submitting}
                  />
                </div>
              ))}
            </div>

            {/* Submit */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 py-4">
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {answeredCount}/{exam.questionCount} answered
                </span>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || answeredCount === 0}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#0033A0] text-white font-semibold rounded-lg hover:bg-[#002880] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  {submitting ? 'Grading…' : 'Submit Exam'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
