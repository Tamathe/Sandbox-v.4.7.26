'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '../../lib/auth-context'
import PageHeader from '../../components/PageHeader'
import MessageBubble from '../../components/teach-back/MessageBubble'
import TeachBackResults from '../../components/teach-back/TeachBackResults'
import {
  ArrowLeft,
  Send,
  Loader2,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'

interface TranscriptMessage {
  role: 'ai-student' | 'user'
  content: string
}

interface SessionData {
  id: string
  conceptSlug: string
  conceptLabel: string
  courseCode: string
  courseName: string
  bloomTarget: number
  transcript: TranscriptMessage[]
  turnCount: number
  completed: boolean
  evaluation?: {
    teachingScore: number
    accuracyScore: number
    clarityScore: number
    bloomAchieved: number
    misconceptionsCovered: string[]
    feedbackNarrative: string
    srBoosted: boolean
  }
}

export default function TeachBackPage() {
  const params = useParams()
  const router = useRouter()
  const { currentUser } = useAuth()
  const sessionId = params.sessionId as string

  const [session, setSession] = useState<SessionData | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allMisconceptions, setAllMisconceptions] = useState<string[]>([])

  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Load session from start response (stored in sessionStorage) or from existing session
  useEffect(() => {
    async function load() {
      try {
        // Check if this is a fresh session from the start endpoint
        const startData = sessionStorage.getItem(`teach-back-${sessionId}`)
        if (startData) {
          const parsed = JSON.parse(startData)
          sessionStorage.removeItem(`teach-back-${sessionId}`)
          setSession({
            id: sessionId,
            conceptSlug: parsed.conceptSlug,
            conceptLabel: parsed.conceptLabel,
            courseCode: parsed.courseCode,
            courseName: parsed.courseName,
            bloomTarget: parsed.bloomTarget,
            transcript: [{ role: 'ai-student', content: parsed.firstMessage }],
            turnCount: 1,
            completed: false,
          })
          setLoading(false)
          return
        }

        // Otherwise, load existing session from the list endpoint
        const res = await fetch(`/api/teach-back?courseId=`, {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (!res.ok) throw new Error('Failed to load session')
        // If we can't find session data, just show error
        setError('Session not found. Start a new Teach It Back session from your course page.')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load session')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sessionId, currentUser.email])

  useEffect(() => {
    scrollToBottom()
  }, [session?.transcript, scrollToBottom])

  async function handleSend() {
    if (!input.trim() || sending || !session || session.completed) return

    const userMessage = input.trim()
    setInput('')
    setSending(true)
    setError(null)

    // Optimistic: add user message to transcript
    setSession((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        transcript: [...prev.transcript, { role: 'user', content: userMessage }],
      }
    })

    try {
      const res = await fetch(`/api/teach-back/${sessionId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ message: userMessage }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send message')

      setSession((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          transcript: [
            ...prev.transcript,
            { role: 'ai-student', content: data.message },
          ],
          turnCount: data.turnCount,
        }
      })

      // Auto-complete if AI signals wrap-up
      if (data.isComplete) {
        handleComplete()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send')
      // Remove optimistic message on error
      setSession((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          transcript: prev.transcript.slice(0, -1),
        }
      })
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  async function handleComplete() {
    if (!session || session.completed || completing) return
    setCompleting(true)
    setError(null)

    try {
      const res = await fetch(`/api/teach-back/${sessionId}/complete`, {
        method: 'POST',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to evaluate')

      setSession((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          completed: true,
          evaluation: {
            teachingScore: data.teachingScore,
            accuracyScore: data.accuracyScore,
            clarityScore: data.clarityScore,
            bloomAchieved: data.bloomAchieved,
            misconceptionsCovered: data.misconceptionsCovered,
            feedbackNarrative: data.feedbackNarrative,
            srBoosted: data.srBoosted,
          },
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to evaluate')
    } finally {
      setCompleting(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#0033A0]" />
      </div>
    )
  }

  if (error && !session) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader title="Teach It Back" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="border-2 rounded-2xl p-8 bg-white text-center space-y-4">
            <AlertCircle className="size-8 text-gray-400 mx-auto" />
            <p className="text-gray-600">{error}</p>
            <button
              onClick={() => router.push('/courses')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#0033A0] hover:underline"
            >
              <ArrowLeft className="size-4" />
              Back to Courses
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!session) return null

  const canComplete = session.turnCount >= 6 && !session.completed && !completing

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/courses')}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="size-5 text-gray-500" />
              </button>
              <div className="size-10 rounded-full bg-amber-100 flex items-center justify-center">
                <GraduationCap className="size-5 text-amber-700" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-gray-900 capitalize">
                  {session.conceptLabel}
                </h1>
                <p className="text-xs text-gray-500">
                  {session.courseCode} — {session.courseName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                Turn {Math.ceil(session.turnCount / 2)} of ~8
              </span>
              {session.completed && (
                <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-3 py-1 rounded-full">
                  <CheckCircle2 className="size-3" />
                  Evaluated
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat + Results */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-full flex flex-col gap-6">
          {/* Chat area */}
          <div className="flex-1 overflow-y-auto space-y-4 pb-4">
            {session.transcript.map((msg, i) => (
              <MessageBubble key={i} role={msg.role} content={msg.content} />
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 rounded-2xl rounded-tl-sm">
                  <Loader2 className="size-4 animate-spin text-gray-400" />
                  <span className="text-sm text-gray-400">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Results panel (after completion) */}
          {session.completed && session.evaluation && (
            <TeachBackResults
              teachingScore={session.evaluation.teachingScore}
              accuracyScore={session.evaluation.accuracyScore}
              clarityScore={session.evaluation.clarityScore}
              bloomAchieved={session.evaluation.bloomAchieved}
              misconceptionsCovered={session.evaluation.misconceptionsCovered}
              allMisconceptions={allMisconceptions}
              feedbackNarrative={session.evaluation.feedbackNarrative}
              srBoosted={session.evaluation.srBoosted}
            />
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="size-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Input area */}
          {!session.completed && (
            <div className="border-t border-gray-200 pt-4 space-y-3">
              {canComplete && (
                <button
                  onClick={handleComplete}
                  disabled={completing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {completing ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Evaluating your teaching...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" />
                      Finish &amp; Get Evaluation
                    </>
                  )}
                </button>
              )}
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Explain the concept to your student..."
                  rows={2}
                  className="flex-1 px-4 py-3 border-2 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20 focus:border-[#0033A0] transition-colors"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  className="self-end px-4 py-3 bg-[#0033A0] text-white rounded-xl hover:bg-[#002880] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="size-4" />
                </button>
              </div>
            </div>
          )}

          {/* Back button after completion */}
          {session.completed && (
            <div className="border-t border-gray-200 pt-4">
              <button
                onClick={() => router.push('/courses')}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#0033A0] hover:underline"
              >
                <ArrowLeft className="size-4" />
                Back to Courses
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
