'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X,
  FileCheck,
  Send,
  Users,
  Clock,
  Loader2,
  Star,
  MessageSquare,
  CheckCircle,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface PeerReviewOverlayProps {
  roomId: string
  onClose: () => void
}

interface ReviewAssignment {
  submissionId: string
  anonymousAlias: string
  content: string
  rubric: string[]
}

interface PeerReviewResult {
  userId: string
  name: string
  alias: string
  peerScores: Record<string, number> | null
  peerFeedback: string | null
  sandyScores: Record<string, number> | null
  sandyFeedback: string | null
  combinedAvg: number
  content: string
}

type PRPhase = 'LOBBY' | 'SUBMIT' | 'DISTRIBUTE' | 'REVIEW' | 'COACHING' | 'RESULTS' | 'COMPLETE'

export default function PeerReviewOverlay({ roomId, onClose }: PeerReviewOverlayProps) {
  const { currentUser } = useAuth()
  const headers = { 'x-demo-user-email': currentUser.email }

  // Room state
  const [phase, setPhase] = useState<PRPhase>('LOBBY')
  const [isHost, setIsHost] = useState(false)
  const [participantCount, setParticipantCount] = useState(0)

  // Config
  const [prompt, setPrompt] = useState('')
  const [rubric, setRubric] = useState<string[]>([])

  // Submit phase
  const [workContent, setWorkContent] = useState('')
  const [hasSubmittedWork, setHasSubmittedWork] = useState(false)
  const [submittedWorkCount, setSubmittedWorkCount] = useState(0)
  const [submittingWork, setSubmittingWork] = useState(false)

  // Review phase
  const [assignment, setAssignment] = useState<ReviewAssignment | null>(null)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [feedback, setFeedback] = useState('')
  const [hasSubmittedReview, setHasSubmittedReview] = useState(false)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewedCount, setReviewedCount] = useState(0)
  const [totalToReview, setTotalToReview] = useState(0)

  // Coaching
  const [coachingTip, setCoachingTip] = useState<string | null>(null)

  // Results
  const [results, setResults] = useState<PeerReviewResult[]>([])
  const [resultRubric, setResultRubric] = useState<string[]>([])

  // Sandy messages
  const [sandyMessages, setSandyMessages] = useState<string[]>([])

  // Initial fetch
  useEffect(() => {
    fetch(`/api/commons/${roomId}`, { headers })
      .then((r) => r.json())
      .then((room) => {
        setIsHost(room.hostId === currentUser?.id)
        setParticipantCount(room.participants?.length ?? 0)
        const config = room.config || {}
        setPrompt(config.prompt || '')
        setRubric(config.rubric || ['Clarity', 'Depth', 'Originality'])

        const phaseMap: Record<string, PRPhase> = {
          LOBBY: 'LOBBY',
          COUNTDOWN: 'SUBMIT',
          QUESTION: 'REVIEW',
          REVEAL: 'COACHING',
          SCOREBOARD: 'RESULTS',
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
      const phaseMap: Record<string, PRPhase> = {
        LOBBY: 'LOBBY',
        SUBMIT: 'SUBMIT',
        DISTRIBUTE: 'DISTRIBUTE',
        REVIEW: 'REVIEW',
        COACHING: 'COACHING',
        RESULTS: 'RESULTS',
        COMPLETE: 'COMPLETE',
      }
      if (phaseMap[data.phase]) setPhase(phaseMap[data.phase])
    })

    es.addEventListener('peer_review_started', (e) => {
      const data = JSON.parse(e.data)
      setPrompt(data.prompt)
      setRubric(data.rubric)
      setPhase('SUBMIT')
    })

    es.addEventListener('work_submitted', (e) => {
      const data = JSON.parse(e.data)
      setSubmittedWorkCount(data.submittedCount)
      setParticipantCount(data.totalParticipants)
    })

    es.addEventListener('review_assignment', (e) => {
      const data = JSON.parse(e.data)
      setAssignment(data)
      setPhase('REVIEW')
      // Initialize scores for each rubric dimension
      const initialScores: Record<string, number> = {}
      for (const dim of data.rubric) {
        initialScores[dim] = 3
      }
      setScores(initialScores)
    })

    es.addEventListener('review_submitted', (e) => {
      const data = JSON.parse(e.data)
      setReviewedCount(data.reviewedCount)
      setTotalToReview(data.totalToReview)
    })

    es.addEventListener('sandy_coaching', (e) => {
      const data = JSON.parse(e.data)
      setCoachingTip(data.tip)
      setTimeout(() => setCoachingTip(null), 8000)
    })

    es.addEventListener('peer_review_results', (e) => {
      const data = JSON.parse(e.data)
      setResults(data.results)
      setResultRubric(data.rubric)
      setPhase('RESULTS')
    })

    es.addEventListener('sandy_says', (e) => {
      const data = JSON.parse(e.data)
      setSandyMessages((prev) => [...prev.slice(-4), data.message])
    })

    es.addEventListener('player_joined', (e) => {
      const data = JSON.parse(e.data)
      setParticipantCount(data.count)
    })

    es.addEventListener('complete', () => {
      setPhase('COMPLETE')
    })

    return () => es.close()
  }, [roomId])

  // Handlers
  const handleStart = useCallback(async () => {
    await fetch(`/api/commons/${roomId}/start`, { method: 'POST', headers })
  }, [roomId])

  const handleSubmitWork = useCallback(async () => {
    if (!workContent.trim() || submittingWork) return
    setSubmittingWork(true)
    try {
      await fetch(`/api/commons/${roomId}/submit-work`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: workContent.trim() }),
      })
      setHasSubmittedWork(true)
    } finally {
      setSubmittingWork(false)
    }
  }, [roomId, workContent, submittingWork])

  const handleSubmitReview = useCallback(async () => {
    if (!assignment || submittingReview || hasSubmittedReview) return
    setSubmittingReview(true)
    try {
      await fetch(`/api/commons/${roomId}/submit-review`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: assignment.submissionId,
          scores,
          feedback: feedback.trim(),
        }),
      })
      setHasSubmittedReview(true)
    } finally {
      setSubmittingReview(false)
    }
  }, [roomId, assignment, scores, feedback, submittingReview, hasSubmittedReview])

  // Find my result
  const myResult = results.find((r) => r.userId === currentUser?.id)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between bg-emerald-900 px-6 py-4">
        <div className="flex items-center gap-3">
          <FileCheck className="size-6 text-emerald-300" />
          <div>
            <h2 className="text-lg font-extrabold text-white">Peer Review</h2>
            <p className="text-sm text-emerald-300">
              {phase === 'LOBBY' && `${participantCount} joined`}
              {phase === 'SUBMIT' &&
                `Submit phase -- ${submittedWorkCount}/${participantCount} submitted`}
              {phase === 'DISTRIBUTE' && 'Distributing work...'}
              {phase === 'REVIEW' &&
                `Review phase -- ${reviewedCount}/${totalToReview} reviewed`}
              {phase === 'COACHING' && 'Calculating results...'}
              {phase === 'RESULTS' && 'Results'}
              {phase === 'COMPLETE' && 'Complete'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* LOBBY */}
          {phase === 'LOBBY' && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-emerald-900/50">
                <FileCheck className="size-10 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-black text-white">Peer Review</h3>
              <p className="text-gray-400">
                Submit your work, review someone else's anonymously, and get feedback from
                peers and Sandy.
              </p>
              {prompt && (
                <div className="mx-auto max-w-md rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4">
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Assignment
                  </p>
                  <p className="text-sm text-gray-300">{prompt}</p>
                </div>
              )}
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Users className="size-4" />
                <span>{participantCount} participants</span>
                <span className="mx-2">·</span>
                <Clock className="size-4" />
                <span>{rubric.length} rubric dimensions</span>
              </div>
              {isHost && participantCount >= 2 && (
                <button
                  onClick={() => void handleStart()}
                  className="rounded-xl bg-emerald-600 px-8 py-3 font-bold text-white hover:bg-emerald-500"
                >
                  Start Peer Review
                </button>
              )}
              {isHost && participantCount < 2 && (
                <p className="text-sm text-gray-500">Need at least 2 participants</p>
              )}
              {!isHost && (
                <p className="text-sm text-gray-500">Waiting for host to start...</p>
              )}
            </div>
          )}

          {/* SUBMIT PHASE */}
          {phase === 'SUBMIT' && !hasSubmittedWork && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-5">
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Assignment
                </p>
                <p className="leading-relaxed text-gray-200">{prompt}</p>
              </div>

              <textarea
                value={workContent}
                onChange={(e) => setWorkContent(e.target.value)}
                placeholder="Write your response here..."
                className="w-full rounded-xl border border-gray-700 bg-gray-900 p-4 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                rows={8}
                disabled={submittingWork}
              />

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {submittedWorkCount}/{participantCount} submitted
                </span>
                <button
                  onClick={() => void handleSubmitWork()}
                  disabled={!workContent.trim() || submittingWork}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600"
                >
                  {submittingWork ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Submit Work
                </button>
              </div>
            </div>
          )}

          {phase === 'SUBMIT' && hasSubmittedWork && (
            <div className="space-y-4 text-center">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-6">
                <CheckCircle className="mx-auto mb-3 size-10 text-emerald-400" />
                <p className="text-lg font-bold text-white">Work Submitted!</p>
                <p className="mt-1 text-sm text-gray-400">
                  Waiting for others... {submittedWorkCount}/{participantCount} submitted
                </p>
              </div>
            </div>
          )}

          {/* DISTRIBUTE (brief transition) */}
          {phase === 'DISTRIBUTE' && (
            <div className="space-y-4 text-center">
              <Loader2 className="mx-auto size-10 animate-spin text-emerald-400" />
              <p className="text-lg font-bold text-white">
                Sandy is anonymizing and distributing work...
              </p>
            </div>
          )}

          {/* REVIEW PHASE */}
          {phase === 'REVIEW' && assignment && !hasSubmittedReview && (
            <div className="space-y-5">
              {/* Submission to review */}
              <div className="rounded-2xl border border-gray-700 bg-gray-900 p-5">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Reviewing: {assignment.anonymousAlias}
                </p>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
                  {assignment.content}
                </div>
              </div>

              {/* Rubric sliders */}
              <div className="space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Score each dimension (1-5)
                </p>
                {rubric.map((dim) => (
                  <div key={dim}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-white">{dim}</span>
                      <span className="flex items-center gap-1 text-sm font-bold text-emerald-400">
                        <Star className="size-3.5 fill-emerald-400" />
                        {scores[dim] ?? 3}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => setScores((prev) => ({ ...prev, [dim]: n }))}
                          className={`flex-1 rounded-lg py-2 text-sm font-bold transition-all ${
                            (scores[dim] ?? 3) >= n
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Feedback textarea */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Written Feedback
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Write constructive feedback. Be specific about what works and what could improve..."
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 p-4 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  rows={4}
                  disabled={submittingReview}
                />
              </div>

              {/* Sandy coaching tip */}
              {coachingTip && (
                <div className="flex items-start gap-2 rounded-xl bg-amber-950/30 p-3">
                  <MessageSquare className="mt-0.5 size-4 shrink-0 text-amber-400" />
                  <p className="text-sm text-amber-200">{coachingTip}</p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {reviewedCount}/{totalToReview} reviews in
                </span>
                <button
                  onClick={() => void handleSubmitReview()}
                  disabled={!feedback.trim() || submittingReview}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600"
                >
                  {submittingReview ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Submit Review
                </button>
              </div>
            </div>
          )}

          {phase === 'REVIEW' && hasSubmittedReview && (
            <div className="space-y-4 text-center">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-6">
                <CheckCircle className="mx-auto mb-3 size-10 text-emerald-400" />
                <p className="text-lg font-bold text-white">Review Submitted!</p>
                <p className="mt-1 text-sm text-gray-400">
                  Waiting for others... {reviewedCount}/{totalToReview} reviewed
                </p>
              </div>
            </div>
          )}

          {/* COACHING (brief transition) */}
          {phase === 'COACHING' && (
            <div className="space-y-4 text-center">
              <Loader2 className="mx-auto size-10 animate-spin text-emerald-400" />
              <p className="text-lg font-bold text-white">
                Sandy is calculating combined scores...
              </p>
            </div>
          )}

          {/* RESULTS */}
          {(phase === 'RESULTS' || phase === 'COMPLETE') && results.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-center text-xl font-black text-white">Peer Review Results</h3>

              {/* My result (highlighted) */}
              {myResult && (
                <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-950/30 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-lg font-bold text-white">Your Results</span>
                    <div className="flex items-center gap-1 text-emerald-400">
                      <Star className="size-5 fill-emerald-400" />
                      <span className="text-xl font-black">{myResult.combinedAvg}/5</span>
                    </div>
                  </div>

                  {/* Rubric breakdown */}
                  <div className="mb-4 space-y-2">
                    {resultRubric.map((dim) => {
                      const peerScore = myResult.peerScores?.[dim]
                      const sandyScore = myResult.sandyScores?.[dim]
                      return (
                        <div key={dim} className="flex items-center justify-between text-sm">
                          <span className="text-gray-300">{dim}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-gray-400">
                              Peer: {peerScore != null ? `${peerScore}/5` : '--'}
                            </span>
                            <span className="text-gray-400">
                              Sandy: {sandyScore != null ? `${sandyScore}/5` : '--'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Feedback received */}
                  {myResult.peerFeedback && (
                    <div className="mb-3 rounded-xl bg-gray-800/50 p-3">
                      <p className="mb-1 text-xs font-bold text-gray-400">Peer Feedback</p>
                      <p className="text-sm text-gray-200">{myResult.peerFeedback}</p>
                    </div>
                  )}
                  {myResult.sandyFeedback && (
                    <div className="rounded-xl bg-gray-800/50 p-3">
                      <p className="mb-1 text-xs font-bold text-emerald-400">Sandy's Feedback</p>
                      <p className="text-sm text-gray-200">{myResult.sandyFeedback}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Everyone's results */}
              <div className="space-y-3">
                {[...results]
                  .sort((a, b) => b.combinedAvg - a.combinedAvg)
                  .map((r, i) => {
                    if (r.userId === currentUser?.id) return null
                    return (
                      <div
                        key={r.userId}
                        className="rounded-xl border border-gray-700 bg-gray-900 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="mr-2 text-lg">
                              {['1st', '2nd', '3rd'][i] ?? `${i + 1}th`}
                            </span>
                            <span className="font-bold text-white">{r.name}</span>
                          </div>
                          <div className="flex items-center gap-1 text-emerald-400">
                            <Star className="size-4 fill-emerald-400" />
                            <span className="font-bold">{r.combinedAvg}/5</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>

              {phase === 'COMPLETE' && (
                <div className="text-center">
                  <button
                    onClick={onClose}
                    className="rounded-xl bg-gray-800 px-6 py-3 font-bold text-white hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sandy messages bar */}
      {sandyMessages.length > 0 && phase !== 'COMPLETE' && phase !== 'RESULTS' && (
        <div className="border-t border-white/10 bg-white/5 px-6 py-3">
          <p className="text-center text-sm text-white/80">
            <span className="mr-1.5 font-bold text-emerald-300">Sandy:</span>
            {sandyMessages[sandyMessages.length - 1]}
          </p>
        </div>
      )}
    </div>
  )
}
