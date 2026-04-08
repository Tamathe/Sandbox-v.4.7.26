'use client'

import { useState, useEffect } from 'react'
import { X, Send, Puzzle, Users, Clock, Loader2, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface ProblemLabOverlayProps {
  roomId: string
  onClose: () => void
}

interface SubProblem {
  piece: string
  assigneeId: string
  assigneeName: string
}

interface SolutionPiece {
  piece: string
  assigneeName: string
  solution: string
}

export default function ProblemLabOverlay({ roomId, onClose }: ProblemLabOverlayProps) {
  const { currentUser } = useAuth()
  const headers = { 'x-demo-user-email': currentUser.email }

  // Room state
  const [phase, setPhase] = useState<'LOBBY' | 'PRESENT' | 'SOLVE' | 'COMBINE' | 'GAP_ANALYSIS' | 'COMPLETE'>('LOBBY')
  const [problem, setProblem] = useState('')
  const [subProblems, setSubProblems] = useState<SubProblem[]>([])
  const [myPiece, setMyPiece] = useState<SubProblem | null>(null)

  // Solve state
  const [solution, setSolution] = useState('')
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submittedCount, setSubmittedCount] = useState(0)
  const [totalParticipants, setTotalParticipants] = useState(0)
  const [solveTimeMs, setSolveTimeMs] = useState(180000)

  // Results state
  const [pieces, setPieces] = useState<SolutionPiece[]>([])
  const [combinedSolution, setCombinedSolution] = useState('')
  const [gapAnalysis, setGapAnalysis] = useState('')

  // Sandy messages
  const [sandyMessages, setSandyMessages] = useState<string[]>([])

  // Host state
  const [isHost, setIsHost] = useState(false)

  // Timer
  const [timeLeft, setTimeLeft] = useState(0)

  // Initial room fetch
  useEffect(() => {
    fetch(`/api/commons/${roomId}`, { headers })
      .then((r) => r.json())
      .then((room) => {
        setIsHost(room.hostId === currentUser?.id)
        setTotalParticipants(room.participants.length)
        const phaseMap: Record<string, typeof phase> = {
          LOBBY: 'LOBBY', COUNTDOWN: 'PRESENT', QUESTION: 'SOLVE',
          REVEAL: 'COMBINE', SCOREBOARD: 'GAP_ANALYSIS', COMPLETE: 'COMPLETE',
        }
        setPhase(phaseMap[room.phase] || 'LOBBY')
      })
      .catch(() => {})
  }, [roomId])

  // SSE subscription
  useEffect(() => {
    const es = new EventSource(`/api/commons/${roomId}/stream`)

    es.addEventListener('problem_presented', (e) => {
      const data = JSON.parse(e.data)
      setProblem(data.problem)
      setPhase('PRESENT')
    })

    es.addEventListener('problem_decomposed', (e) => {
      const data = JSON.parse(e.data)
      setSubProblems(data.subProblems)
      const mine = data.subProblems.find((sp: SubProblem) => sp.assigneeId === currentUser?.id)
      setMyPiece(mine || null)
    })

    es.addEventListener('solve_started', (e) => {
      const data = JSON.parse(e.data)
      setSolveTimeMs(data.solveTimeMs)
      setTimeLeft(Math.round(data.solveTimeMs / 1000))
      setPhase('SOLVE')
    })

    es.addEventListener('solution_submitted', (e) => {
      const data = JSON.parse(e.data)
      setSubmittedCount(data.submittedCount)
      setTotalParticipants(data.totalParticipants)
    })

    es.addEventListener('solutions_combined', (e) => {
      const data = JSON.parse(e.data)
      setPieces(data.pieces)
      setCombinedSolution(data.combinedSolution)
      setPhase('COMBINE')
    })

    es.addEventListener('gap_analysis', (e) => {
      const data = JSON.parse(e.data)
      setGapAnalysis(data.gapAnalysis)
      setPhase('GAP_ANALYSIS')
    })

    es.addEventListener('sandy_says', (e) => {
      const data = JSON.parse(e.data)
      setSandyMessages((prev) => [...prev, data.message])
    })

    es.addEventListener('player_joined', (e) => {
      const data = JSON.parse(e.data)
      setTotalParticipants(data.count)
    })

    es.addEventListener('phase_changed', (e) => {
      const data = JSON.parse(e.data)
      const phaseMap: Record<string, typeof phase> = {
        LOBBY: 'LOBBY', PRESENT: 'PRESENT', SOLVE: 'SOLVE',
        COMBINE: 'COMBINE', GAP_ANALYSIS: 'GAP_ANALYSIS', COMPLETE: 'COMPLETE',
      }
      if (phaseMap[data.phase]) setPhase(phaseMap[data.phase])
    })

    es.addEventListener('complete', () => {
      setPhase('COMPLETE')
    })

    return () => es.close()
  }, [roomId])

  // Countdown timer for solve phase
  useEffect(() => {
    if (phase !== 'SOLVE' || timeLeft <= 0) return
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [phase, timeLeft])

  // Handle start
  const handleStart = async () => {
    await fetch(`/api/commons/${roomId}/start`, { method: 'POST', headers })
  }

  // Handle submit solution
  const handleSubmit = async () => {
    if (!solution.trim() || hasSubmitted || submitting) return
    setSubmitting(true)
    try {
      await fetch(`/api/commons/${roomId}/solution`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: solution.trim() }),
      })
      setHasSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between bg-amber-900 px-6 py-4">
        <div className="flex items-center gap-3">
          <Puzzle className="size-6 text-amber-300" />
          <div>
            <h2 className="text-lg font-extrabold text-white">Problem Lab</h2>
            <p className="text-sm text-amber-300">
              {phase === 'LOBBY' && `${totalParticipants} joined`}
              {phase === 'PRESENT' && 'Reading problem...'}
              {phase === 'SOLVE' && `${submittedCount}/${totalParticipants} solutions — ${formatTime(timeLeft)}`}
              {phase === 'COMBINE' && 'Combining solutions...'}
              {phase === 'GAP_ANALYSIS' && 'Analyzing gaps...'}
              {phase === 'COMPLETE' && 'Complete'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white">
          <X className="size-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">

          {/* LOBBY */}
          {phase === 'LOBBY' && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-amber-900/50">
                <Puzzle className="size-10 text-amber-400" />
              </div>
              <h3 className="text-2xl font-black text-white">Problem Lab</h3>
              <p className="text-gray-400">Sandy generates a complex problem, breaks it into pieces, and assigns each person a sub-problem to solve. Then we combine and find the gaps.</p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Users className="size-4" />
                <span>{totalParticipants} participants</span>
                <span className="mx-2">--</span>
                <Clock className="size-4" />
                <span>3 min solve time</span>
              </div>
              {isHost && (
                <button onClick={handleStart} className="rounded-xl bg-amber-600 px-8 py-3 font-bold text-white hover:bg-amber-500">
                  Start Problem Lab
                </button>
              )}
              {!isHost && (
                <p className="text-sm text-gray-500">Waiting for host to start...</p>
              )}
            </div>
          )}

          {/* PRESENT — problem display */}
          {phase === 'PRESENT' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-amber-500/30 bg-amber-950/50 p-6">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-400">The Problem</p>
                <div className="whitespace-pre-wrap text-lg leading-relaxed text-gray-200">{problem}</div>
              </div>
              {subProblems.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Decomposed into {subProblems.length} pieces</p>
                  {subProblems.map((sp, i) => (
                    <div
                      key={i}
                      className={`rounded-xl border p-4 ${sp.assigneeId === currentUser?.id ? 'border-amber-400 bg-amber-950/60' : 'border-gray-700 bg-gray-900'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-amber-300">{sp.assigneeName}</span>
                        {sp.assigneeId === currentUser?.id && (
                          <span className="rounded-full bg-amber-600 px-2 py-0.5 text-xs font-bold text-white">Your piece</span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-300">{sp.piece}</p>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-center text-sm text-gray-500">Sandy is decomposing the problem...</p>
            </div>
          )}

          {/* SOLVE — individual solution input */}
          {phase === 'SOLVE' && (
            <div className="space-y-6">
              {/* Timer bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-amber-400">
                  <Clock className="size-4" />
                  <span>{formatTime(timeLeft)} remaining</span>
                </div>
                <span className="text-sm text-gray-500">{submittedCount}/{totalParticipants} solutions in</span>
              </div>

              {/* Problem reminder */}
              <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">The Problem</p>
                <p className="text-sm text-gray-400 line-clamp-3">{problem}</p>
              </div>

              {/* Your assigned piece */}
              {myPiece && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-950/50 p-5">
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-amber-400">Your Sub-Problem</p>
                  <div className="text-lg leading-relaxed text-gray-200">{myPiece.piece}</div>
                </div>
              )}

              {/* Solution input */}
              {!hasSubmitted ? (
                <div className="space-y-3">
                  <textarea
                    value={solution}
                    onChange={(e) => setSolution(e.target.value)}
                    placeholder="Type your solution to this piece..."
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 p-4 text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    rows={6}
                    disabled={submitting}
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleSubmit}
                      disabled={!solution.trim() || submitting}
                      className="flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-3 font-bold text-white hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-600"
                    >
                      {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                      Submit Solution
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-emerald-400">
                  <CheckCircle2 className="size-5" />
                  Solution submitted. Waiting for others...
                </div>
              )}
            </div>
          )}

          {/* COMBINE — combined solutions view */}
          {(phase === 'COMBINE' || phase === 'GAP_ANALYSIS' || phase === 'COMPLETE') && pieces.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-center text-xl font-black text-white">Solutions Combined</h3>

              {/* Individual pieces */}
              {pieces.map((p, i) => (
                <div key={i} className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-amber-400" />
                    <span className="text-sm font-bold text-amber-300">{p.assigneeName}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{p.piece}</p>
                  <p className="mt-2 text-sm text-gray-300">{p.solution}</p>
                </div>
              ))}

              {/* Combined solution from Sandy */}
              {combinedSolution && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-950/50 p-6">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-400">Sandy's Combined Solution</p>
                  <div className="whitespace-pre-wrap leading-relaxed text-gray-200">{combinedSolution}</div>
                </div>
              )}
            </div>
          )}

          {/* GAP_ANALYSIS */}
          {(phase === 'GAP_ANALYSIS' || phase === 'COMPLETE') && gapAnalysis && (
            <div className="rounded-2xl border border-red-500/30 bg-red-950/30 p-6">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-red-400">Gap Analysis</p>
              <div className="whitespace-pre-wrap leading-relaxed text-gray-200">{gapAnalysis}</div>
            </div>
          )}

          {/* COMPLETE */}
          {phase === 'COMPLETE' && (
            <div className="text-center">
              <button onClick={onClose} className="rounded-xl bg-gray-800 px-6 py-3 font-bold text-white hover:bg-gray-700">
                Close
              </button>
            </div>
          )}

          {/* Sandy messages */}
          {sandyMessages.length > 0 && (
            <div className="space-y-2">
              {sandyMessages.slice(-3).map((msg, i) => (
                <div key={i} className="rounded-lg bg-gray-900 px-4 py-2 text-sm italic text-gray-400">
                  Sandy: {msg}
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
