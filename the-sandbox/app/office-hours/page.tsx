'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../lib/auth-context'
import {
  ArrowLeft,
  Send,
  Loader2,
  CheckCircle2,
  Clock,
  Users,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Calendar,
} from 'lucide-react'
import BookingPanel from '../components/office-hours/BookingPanel'
import { useRouter } from 'next/navigation'

interface Question {
  id: string
  question: string
  context: string | null
  triageResult: string
  aiAnswer: string | null
  facultyAnswer: string | null
  resolvedBy: string | null
  helpful: boolean | null
  createdAt: string
  course?: { courseCode: string }
}

interface TriageResult {
  id: string
  triageResult: string
  aiAnswer: string | null
  confidence: number | null
  message: string
}

export default function OfficeHoursPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [courses, setCourses] = useState<{ id: string; courseCode: string; title: string }[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState('')

  // Ask form
  const [question, setQuestion] = useState('')
  const [context, setContext] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null)

  // History
  const [questions, setQuestions] = useState<Question[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    if (!currentUser) return
    fetch('/api/courses', { headers: { 'x-demo-user-email': currentUser.email } })
      .then((r) => r.json())
      .then((data) => {
        const list = data.courses || data || []
        setCourses(list)
        if (list.length > 0 && !selectedCourseId) setSelectedCourseId(list[0].id)
      })
      .catch(() => {})
  }, [currentUser])

  const fetchHistory = useCallback(() => {
    if (!currentUser || !selectedCourseId) return
    setLoadingHistory(true)
    fetch(`/api/office-hours?courseId=${selectedCourseId}`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => r.json())
      .then((data) => setQuestions(data.questions || []))
      .catch(() => {})
      .finally(() => setLoadingHistory(false))
  }, [currentUser, selectedCourseId])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  async function handleSubmit() {
    if (!currentUser || !selectedCourseId || question.trim().length < 10) return
    setSubmitting(true)
    setTriageResult(null)

    try {
      const res = await fetch('/api/office-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({
          courseId: selectedCourseId,
          question: question.trim(),
          context: context.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setTriageResult(data)
        setQuestion('')
        setContext('')
        fetchHistory()
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false)
    }
  }

  async function handleFeedback(questionId: string, helpful: boolean) {
    if (!currentUser) return
    await fetch(`/api/office-hours/${questionId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
      body: JSON.stringify({ helpful }),
    })
    fetchHistory()
  }

  if (!currentUser) return null


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header — Pattern A */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button type="button" onClick={() => router.push('/hub')} className="flex items-center gap-1 text-gray-400 hover:text-[#0033A0] text-sm mb-3 cursor-pointer">
            <ArrowLeft className="size-4" /> Back to Hub
          </button>
          <h1 className="text-2xl font-extrabold text-gray-900">AI Office Hours</h1>
          <p className="text-sm text-gray-500 mt-1">Ask questions, get instant AI answers or have them routed to your professor</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Course selector */}
        <div className="mb-6">
          <select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)} className="w-full max-w-sm px-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm focus:outline-none focus:border-[#0033A0] bg-white">
            {courses.map((c) => (<option key={c.id} value={c.id}>{c.courseCode} — {c.title}</option>))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Ask + Result */}
          <div className="lg:col-span-3 space-y-6">
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-6">
              <h2 className="text-lg font-extrabold text-gray-900 mb-4">Ask a Question</h2>
              <div className="space-y-4">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What do you need help with?"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm resize-none focus:outline-none focus:border-[#0033A0] min-h-[100px]"
                  rows={4}
                />
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Optional: What have you tried so far?"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm resize-none focus:outline-none focus:border-[#0033A0]"
                  rows={2}
                />
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || question.trim().length < 10}
                  className="px-6 py-3 rounded-xl bg-[#0033A0] text-white font-bold text-sm hover:bg-[#002680] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-2"
                >
                  {submitting ? (<><Loader2 className="size-4 animate-spin" />Analyzing...</>) : (<><Send className="size-4" />Ask</>)}
                </button>
              </div>
            </div>

            {/* Triage Result */}
            {triageResult && (
              <div className={`rounded-2xl border-2 p-6 ${
                triageResult.triageResult === 'auto_answered' ? 'border-emerald-300 bg-emerald-50' :
                triageResult.triageResult === 'clustered' ? 'border-violet-300 bg-violet-50' :
                'border-blue-300 bg-blue-50'
              }`}>
                <div className="flex items-start gap-3">
                  {triageResult.triageResult === 'auto_answered' ? (
                    <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : triageResult.triageResult === 'clustered' ? (
                    <Users className="size-5 text-violet-600 shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="size-5 text-blue-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-bold">{triageResult.message}</p>
                    {triageResult.aiAnswer && (
                      <div className="mt-3 p-4 rounded-2xl bg-white border-2 border-gray-200">
                        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{triageResult.aiAnswer}</p>
                      </div>
                    )}
                    {triageResult.triageResult === 'auto_answered' && (
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-xs text-gray-500">Was this helpful?</span>
                        <button type="button" onClick={() => handleFeedback(triageResult.id, true)} className="p-1.5 rounded-lg hover:bg-emerald-100 cursor-pointer"><ThumbsUp className="size-4 text-emerald-600" /></button>
                        <button type="button" onClick={() => handleFeedback(triageResult.id, false)} className="p-1.5 rounded-lg hover:bg-red-100 cursor-pointer"><ThumbsDown className="size-4 text-red-500" /></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: History */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-extrabold text-gray-900 mb-3">Your Questions</h2>
            {loadingHistory ? (
              <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-gray-400" /></div>
            ) : questions.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
                <MessageCircle className="size-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No questions yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((q) => (
                  <div key={q.id} className="rounded-2xl border-2 border-gray-200 bg-white p-4">
                    <p className="text-sm font-semibold text-gray-900 line-clamp-2">{q.question}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        q.triageResult === 'auto_answered' ? 'bg-emerald-50 text-emerald-700' :
                        q.triageResult === 'clustered' ? 'bg-violet-50 text-violet-700' :
                        q.resolvedBy === 'faculty' ? 'bg-blue-50 text-blue-700' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {q.resolvedBy === 'faculty' ? 'Answered' : q.triageResult === 'auto_answered' ? 'AI Answered' : q.triageResult === 'clustered' ? 'Grouped' : 'Pending'}
                      </span>
                      <span className="text-xs text-gray-400">{new Date(q.createdAt).toLocaleDateString()}</span>
                    </div>
                    {q.facultyAnswer && (
                      <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-200">
                        <p className="text-xs font-bold text-blue-700 mb-1">Professor&apos;s Answer</p>
                        <p className="text-sm text-blue-900 leading-relaxed">{q.facultyAnswer}</p>
                      </div>
                    )}
                    {!q.facultyAnswer && q.aiAnswer && (
                      <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
                        <p className="text-xs font-bold text-gray-500 mb-1">AI Answer</p>
                        <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">{q.aiAnswer}</p>
                      </div>
                    )}
                    {q.resolvedBy && q.helpful === null && (
                      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-400">Helpful?</span>
                        <button type="button" onClick={() => handleFeedback(q.id, true)} className="p-1 rounded hover:bg-emerald-50 cursor-pointer"><ThumbsUp className="size-3.5 text-gray-400 hover:text-emerald-600" /></button>
                        <button type="button" onClick={() => handleFeedback(q.id, false)} className="p-1 rounded hover:bg-red-50 cursor-pointer"><ThumbsDown className="size-3.5 text-gray-400 hover:text-red-500" /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Booking Section */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="size-5 text-[#0033A0]" />
            <h2 className="text-lg font-extrabold text-gray-900">Book an Appointment</h2>
          </div>
          <BookingPanel mode="student" courseId={selectedCourseId} />
        </div>
      </div>
    </div>
  )
}
