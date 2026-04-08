'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2, RefreshCw, Trophy, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../lib/auth-context'
import PageHeader from '../components/PageHeader'

type Question = {
  question: string
  choices: string[]
  correctIndex: number
}

type AttemptRecord = {
  id: string
  score: number
  passed: boolean
  createdAt: string
}

type QuizResult = {
  score: number
  passed: boolean
  answers: Array<{
    question: string
    selectedAnswer: string
    correctAnswer: string
    correct: boolean
  }>
}

export default function FerpaTrainingPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [selectedIndices, setSelectedIndices] = useState<(number | null)[]>([null, null, null, null, null])
  const [generating, setGenerating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<QuizResult | null>(null)
  const [history, setHistory] = useState<AttemptRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  useEffect(() => {
    if (currentUser.role !== 'EDUCATOR' && currentUser.role !== 'ADMIN') {
      router.replace('/')
    }
  }, [currentUser.role, router])

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/ferpa-training/history', {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        setHistory(data.attempts)
      }
    } finally {
      setHistoryLoading(false)
    }
  }, [currentUser.email])

  useEffect(() => {
    void fetchHistory()
  }, [fetchHistory])

  async function handleGenerate() {
    setGenerating(true)
    setResult(null)
    setSelectedIndices([null, null, null, null, null])
    try {
      const res = await fetch('/api/ferpa-training/generate', {
        method: 'POST',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        setQuestions(data.questions)
      }
    } finally {
      setGenerating(false)
    }
  }

  async function handleSubmit() {
    if (selectedIndices.some((i) => i === null)) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/ferpa-training/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ questions, selectedIndices }),
      })
      if (res.ok) {
        const data = await res.json()
        setResult(data)
        await fetchHistory()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const allAnswered = selectedIndices.every((i) => i !== null)

  if (currentUser.role !== 'EDUCATOR' && currentUser.role !== 'ADMIN') return null

  return (
    <div>
      <PageHeader
        title="FERPA Training"
        subtitle="Complete this quiz to acknowledge your understanding of FERPA regulations. Score 4/5 or higher to pass."
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Generate or retake */}
        {questions.length === 0 && !result && (
          <section className="rounded-2xl border-2 border-gray-200 bg-white p-8 text-center">
            <AlertTriangle className="mx-auto size-10 text-amber-500 mb-4" />
            <h2 className="text-lg font-extrabold text-gray-900 mb-2">FERPA Compliance Quiz</h2>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
              This AI-generated quiz covers FERPA basics for university educators. You need 4 out of 5 correct answers to pass. Passing automatically records your FERPA acknowledgement.
            </p>
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: '#0033A0' }}
            >
              {generating ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              {generating ? 'Generating Quiz...' : 'Start Quiz'}
            </button>
          </section>
        )}

        {/* Quiz */}
        {questions.length > 0 && !result && (
          <section className="space-y-4">
            {questions.map((q, qi) => (
              <div key={qi} className="rounded-2xl border-2 border-gray-200 bg-white p-6">
                <p className="text-sm font-bold text-gray-900 mb-3">
                  <span className="text-[#0033A0] mr-1">Q{qi + 1}.</span> {q.question}
                </p>
                <div className="space-y-2">
                  {q.choices.map((choice, ci) => (
                    <label
                      key={ci}
                      className={`flex items-start gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer transition-colors ${
                        selectedIndices[qi] === ci
                          ? 'border-[#0033A0] bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${qi}`}
                        checked={selectedIndices[qi] === ci}
                        onChange={() => {
                          setSelectedIndices((prev) => {
                            const next = [...prev]
                            next[qi] = ci
                            return next
                          })
                        }}
                        className="mt-0.5 accent-[#0033A0]"
                      />
                      <span className="text-sm text-gray-700">{choice}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!allAnswered || submitting}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white disabled:opacity-40"
                style={{ backgroundColor: '#0033A0' }}
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                Submit Answers
              </button>
            </div>
          </section>
        )}

        {/* Result */}
        {result && (
          <section className="space-y-4">
            <div
              className={`rounded-2xl border-2 p-6 ${
                result.passed
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                {result.passed ? (
                  <Trophy className="size-6 text-emerald-600" />
                ) : (
                  <XCircle className="size-6 text-red-500" />
                )}
                <h2 className="text-lg font-extrabold">
                  {result.passed ? 'You Passed!' : 'Not Quite — Try Again'}
                </h2>
              </div>
              <p className="text-sm text-gray-700">
                You scored <span className="font-bold">{result.score}/5</span>.
                {result.passed
                  ? ' Your FERPA acknowledgement has been recorded.'
                  : ' You need at least 4/5 to pass.'}
              </p>
            </div>

            {result.answers.map((a, i) => (
              <div
                key={i}
                className={`rounded-2xl border-2 bg-white p-5 ${
                  a.correct ? 'border-emerald-200' : 'border-red-200'
                }`}
              >
                <div className="flex items-start gap-2 mb-1">
                  {a.correct ? (
                    <CheckCircle2 className="size-4 mt-0.5 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="size-4 mt-0.5 text-red-500 shrink-0" />
                  )}
                  <p className="text-sm font-medium text-gray-900">{a.question}</p>
                </div>
                <p className="text-xs text-gray-500 ml-6">
                  Your answer: <span className={a.correct ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>{a.selectedAnswer}</span>
                </p>
                {!a.correct && (
                  <p className="text-xs text-gray-500 ml-6">
                    Correct: <span className="text-emerald-600 font-medium">{a.correctAnswer}</span>
                  </p>
                )}
              </div>
            ))}

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setQuestions([])
                  setResult(null)
                  setSelectedIndices([null, null, null, null, null])
                  void handleGenerate()
                }}
                disabled={generating}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw className="size-4" />
                Retake Quiz
              </button>
            </div>
          </section>
        )}

        {/* Attempt History */}
        <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
          <h2 className="text-base font-extrabold text-gray-900 mb-4">Attempt History</h2>
          {historyLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="size-5 animate-spin text-gray-400" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-500">No attempts yet. Start the quiz above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="pb-2 pr-4 font-semibold">Date</th>
                    <th className="pb-2 pr-4 font-semibold text-center">Score</th>
                    <th className="pb-2 font-semibold text-center">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((a) => (
                    <tr key={a.id} className="border-b border-gray-50">
                      <td className="py-2.5 pr-4 text-gray-700">
                        {format(new Date(a.createdAt), 'MMM d, yyyy h:mm a')}
                      </td>
                      <td className="py-2.5 pr-4 text-center font-medium">{a.score}/5</td>
                      <td className="py-2.5 text-center">
                        {a.passed ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Passed</span>
                        ) : (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Failed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
