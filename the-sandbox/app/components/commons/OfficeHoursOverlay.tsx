'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, HelpCircle, Send, CheckCircle, AlertTriangle, Users, Clock, Loader2 } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface OfficeHoursOverlayProps {
  roomId: string
  onClose: () => void
}

interface Question {
  id: string
  authorId: string
  authorName: string
  text: string
  sandyAnswer: string | null
  isResolved: boolean
  needsHuman: boolean
  timestamp: number
}

export default function OfficeHoursOverlay({ roomId, onClose }: OfficeHoursOverlayProps) {
  const { currentUser } = useAuth()
  const headers = { 'x-demo-user-email': currentUser.email }

  // Room state
  const [phase, setPhase] = useState<'LOBBY' | 'ACTIVE' | 'COMPLETE'>('LOBBY')
  const [isHost, setIsHost] = useState(false)
  const [participantCount, setParticipantCount] = useState(0)

  // Questions
  const [questions, setQuestions] = useState<Question[]>([])
  const [questionText, setQuestionText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Sandy messages
  const [sandyMessages, setSandyMessages] = useState<string[]>([])

  // Stats for complete phase
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [resolvedCount, setResolvedCount] = useState(0)

  // Initial room fetch
  useEffect(() => {
    fetch(`/api/commons/${roomId}`, { headers })
      .then((r) => r.json())
      .then((room) => {
        setIsHost(room.hostId === currentUser?.id)
        setParticipantCount(room.participants?.length ?? 0)
        const phaseMap: Record<string, typeof phase> = {
          LOBBY: 'LOBBY',
          QUESTION: 'ACTIVE',
          COMPLETE: 'COMPLETE',
        }
        setPhase(phaseMap[room.phase] || 'LOBBY')
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId])

  // SSE subscription
  useEffect(() => {
    const es = new EventSource(`/api/commons/${roomId}/stream`)

    es.addEventListener('phase_changed', (e) => {
      const data = JSON.parse(e.data)
      const phaseMap: Record<string, typeof phase> = {
        LOBBY: 'LOBBY',
        ACTIVE: 'ACTIVE',
        COMPLETE: 'COMPLETE',
      }
      if (phaseMap[data.phase]) setPhase(phaseMap[data.phase])
    })

    es.addEventListener('question_added', (e) => {
      const data = JSON.parse(e.data)
      setQuestions((prev) => [...prev, data.question])
    })

    es.addEventListener('question_answered', (e) => {
      const data = JSON.parse(e.data)
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === data.questionId
            ? { ...q, sandyAnswer: data.sandyAnswer, needsHuman: data.needsHuman }
            : q,
        ),
      )
    })

    es.addEventListener('question_resolved', (e) => {
      const data = JSON.parse(e.data)
      setQuestions((prev) =>
        prev.map((q) => (q.id === data.questionId ? { ...q, isResolved: true } : q)),
      )
    })

    es.addEventListener('sandy_says', (e) => {
      const data = JSON.parse(e.data)
      setSandyMessages((prev) => [...prev.slice(-4), data.message])
    })

    es.addEventListener('player_joined', (e) => {
      const data = JSON.parse(e.data)
      setParticipantCount(data.count)
    })

    es.addEventListener('complete', (e) => {
      const data = JSON.parse(e.data)
      setPhase('COMPLETE')
      setTotalQuestions(data.totalQuestions ?? 0)
      setResolvedCount(data.resolvedCount ?? 0)
    })

    return () => es.close()
  }, [roomId])

  // Handlers
  const handleStart = useCallback(async () => {
    await fetch(`/api/commons/${roomId}/start`, { method: 'POST', headers })
  }, [roomId])

  const handleEnd = useCallback(async () => {
    await fetch(`/api/commons/${roomId}/end`, { method: 'POST', headers })
  }, [roomId])

  const handleSubmitQuestion = useCallback(async () => {
    if (!questionText.trim() || submitting) return
    setSubmitting(true)
    try {
      await fetch(`/api/commons/${roomId}/queue-question`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: questionText.trim() }),
      })
      setQuestionText('')
    } finally {
      setSubmitting(false)
    }
  }, [roomId, questionText, submitting])

  const handleResolve = useCallback(
    async (questionId: string) => {
      await fetch(`/api/commons/${roomId}/resolve`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId }),
      })
    },
    [roomId],
  )

  // Sort: unresolved first, then by timestamp
  const sortedQuestions = [...questions].sort((a, b) => {
    if (a.isResolved !== b.isResolved) return a.isResolved ? 1 : -1
    return a.timestamp - b.timestamp
  })

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between bg-sky-900 px-6 py-4">
        <div className="flex items-center gap-3">
          <HelpCircle className="size-6 text-sky-300" />
          <div>
            <h2 className="text-lg font-extrabold text-white">Office Hours</h2>
            <p className="text-sm text-sky-300">
              {phase === 'LOBBY' && `${participantCount} joined`}
              {phase === 'ACTIVE' &&
                `${questions.length} questions -- ${questions.filter((q) => !q.isResolved).length} open`}
              {phase === 'COMPLETE' && 'Complete'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isHost && phase === 'ACTIVE' && (
            <button
              onClick={() => void handleEnd()}
              className="rounded-lg bg-red-600/80 px-4 py-1.5 text-sm font-bold text-white hover:bg-red-500"
            >
              End Office Hours
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* LOBBY */}
          {phase === 'LOBBY' && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-sky-900/50">
                <HelpCircle className="size-10 text-sky-400" />
              </div>
              <h3 className="text-2xl font-black text-white">Office Hours</h3>
              <p className="text-gray-400">
                Ask questions, get answers from Sandy and your educator. No question is too
                small.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Users className="size-4" />
                <span>{participantCount} participants</span>
                <span className="mx-2">·</span>
                <Clock className="size-4" />
                <span>Open until host ends</span>
              </div>
              {isHost && (
                <button
                  onClick={() => void handleStart()}
                  className="rounded-xl bg-sky-600 px-8 py-3 font-bold text-white hover:bg-sky-500"
                >
                  Open Office Hours
                </button>
              )}
              {!isHost && (
                <p className="text-sm text-gray-500">Waiting for host to start...</p>
              )}
            </div>
          )}

          {/* ACTIVE */}
          {phase === 'ACTIVE' && (
            <div className="space-y-4">
              {/* Question queue */}
              {sortedQuestions.length === 0 && (
                <div className="rounded-2xl border border-dashed border-sky-500/30 bg-sky-950/30 p-8 text-center">
                  <HelpCircle className="mx-auto mb-3 size-10 text-sky-500/40" />
                  <p className="text-sm text-gray-400">
                    No questions yet. Be the first to ask!
                  </p>
                </div>
              )}

              {sortedQuestions.map((q) => (
                <div
                  key={q.id}
                  className={`rounded-2xl border p-5 ${
                    q.isResolved
                      ? 'border-gray-700 bg-gray-900/50 opacity-60'
                      : q.needsHuman
                        ? 'border-amber-500/30 bg-amber-950/20'
                        : 'border-sky-500/30 bg-sky-950/20'
                  }`}
                >
                  {/* Question header */}
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{q.authorName}</span>
                      {q.isResolved && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
                          <CheckCircle className="size-3" />
                          Resolved
                        </span>
                      )}
                      {!q.isResolved && q.needsHuman && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                          <AlertTriangle className="size-3" />
                          Needs Human
                        </span>
                      )}
                    </div>
                    {isHost && !q.isResolved && (
                      <button
                        onClick={() => void handleResolve(q.id)}
                        className="flex items-center gap-1 rounded-lg bg-emerald-600/80 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-500"
                      >
                        <CheckCircle className="size-3" />
                        Resolve
                      </button>
                    )}
                  </div>

                  {/* Question text */}
                  <p className="mb-3 text-sm leading-relaxed text-gray-200">{q.text}</p>

                  {/* Sandy's answer */}
                  {q.sandyAnswer && (
                    <div className="rounded-xl bg-gray-800/50 p-3">
                      <p className="mb-1 text-xs font-bold text-sky-400">Sandy</p>
                      <p className="text-sm leading-relaxed text-gray-300">{q.sandyAnswer}</p>
                    </div>
                  )}
                  {!q.sandyAnswer && !q.isResolved && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Loader2 className="size-3 animate-spin" />
                      Sandy is thinking...
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* COMPLETE */}
          {phase === 'COMPLETE' && (
            <div className="space-y-6 text-center">
              <HelpCircle className="mx-auto size-16 text-sky-400" />
              <h2 className="text-3xl font-black text-white">Office Hours Complete!</h2>
              <p className="text-gray-400">
                {totalQuestions} questions asked, {resolvedCount} resolved.
              </p>
              <button
                onClick={onClose}
                className="rounded-xl bg-gray-800 px-6 py-3 font-bold text-white hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          )}

          {/* Sandy messages */}
          {sandyMessages.length > 0 && phase !== 'COMPLETE' && (
            <div className="space-y-2">
              {sandyMessages.slice(-2).map((msg, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm italic text-gray-400"
                >
                  Sandy: {msg}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Question input (ACTIVE phase only) */}
      {phase === 'ACTIVE' && (
        <div className="border-t border-white/10 bg-gray-900 px-6 py-4">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <input
              type="text"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void handleSubmitQuestion()
                }
              }}
              placeholder="Ask a question..."
              className="flex-1 rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              disabled={submitting}
            />
            <button
              onClick={() => void handleSubmitQuestion()}
              disabled={!questionText.trim() || submitting}
              className="flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 font-bold text-white hover:bg-sky-500 disabled:opacity-40 disabled:hover:bg-sky-600"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Ask
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
