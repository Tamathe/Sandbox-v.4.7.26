'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, FileSearch, Send, Users, Clock, Loader2, ChevronDown, ChevronRight, Lightbulb } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface CaseStudyOverlayProps {
  roomId: string
  onClose: () => void
}

interface ParticipantEvolution {
  userId: string
  name: string
  hypotheses: string[]
  changedMind: boolean
}

type CaseStudyPhase = 'LOBBY' | 'READ' | 'HYPOTHESIZE' | 'EVIDENCE' | 'CONCLUSION' | 'COMPLETE'

export default function CaseStudyOverlay({ roomId, onClose }: CaseStudyOverlayProps) {
  const { currentUser } = useAuth()
  const headers = { 'x-demo-user-email': currentUser.email }

  // Room state
  const [phase, setPhase] = useState<CaseStudyPhase>('LOBBY')
  const [caseText, setCaseText] = useState('')
  const [totalPhases, setTotalPhases] = useState(3)

  // Evidence state
  const [evidenceDrops, setEvidenceDrops] = useState<string[]>([])
  const [expandedEvidence, setExpandedEvidence] = useState<Set<number>>(new Set())

  // Hypothesis state
  const [currentPhaseNumber, setCurrentPhaseNumber] = useState(0)
  const [hypothesisText, setHypothesisText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [submittedCount, setSubmittedCount] = useState(0)
  const [totalParticipants, setTotalParticipants] = useState(0)
  const [myHypotheses, setMyHypotheses] = useState<string[]>([])
  const [timeMs, setTimeMs] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(0)

  // Conclusion
  const [revealText, setRevealText] = useState('')
  const [participantEvolutions, setParticipantEvolutions] = useState<ParticipantEvolution[]>([])
  const [analysisText, setAnalysisText] = useState('')

  // Host state
  const [isHost, setIsHost] = useState(false)
  const [participants, setParticipants] = useState<Array<{ userId: string; name: string }>>([])

  // Sandy messages
  const [sandyMessages, setSandyMessages] = useState<string[]>([])

  // Expanded evolutions
  const [expandedEvolutions, setExpandedEvolutions] = useState<Set<string>>(new Set())

  // Timer countdown
  useEffect(() => {
    if (timeMs <= 0) return
    setTimeRemaining(timeMs)
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1000) {
          clearInterval(interval)
          return 0
        }
        return prev - 1000
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [timeMs, currentPhaseNumber, phase])

  // Initial room fetch
  useEffect(() => {
    fetch(`/api/commons/${roomId}`, { headers })
      .then((r) => r.json())
      .then((room) => {
        setIsHost(room.hostId === currentUser?.id)
        setParticipants(room.participants)
        setTotalParticipants(room.participants.length)
      })
      .catch(() => {})
  }, [roomId])

  // SSE subscription
  useEffect(() => {
    const es = new EventSource(`/api/commons/${roomId}/stream`)

    es.addEventListener('case_presented', (e) => {
      const data = JSON.parse(e.data)
      setCaseText(data.caseText)
      setTotalPhases(data.totalPhases)
      setTimeMs(data.readTimeMs)
      setPhase('READ')
    })

    es.addEventListener('hypothesis_prompt', (e) => {
      const data = JSON.parse(e.data)
      setCurrentPhaseNumber(data.phaseNumber)
      setTimeMs(data.hypothesizeTimeMs)
      setHypothesisText('')
      setHasSubmitted(false)
      setSubmittedCount(0)
      setPhase('HYPOTHESIZE')
    })

    es.addEventListener('hypothesis_submitted', (e) => {
      const data = JSON.parse(e.data)
      setSubmittedCount(data.submittedCount)
      setTotalParticipants(data.totalParticipants)
    })

    es.addEventListener('evidence_drop', (e) => {
      const data = JSON.parse(e.data)
      setEvidenceDrops((prev) => {
        const next = [...prev]
        next[data.evidenceIndex] = data.evidence
        return next
      })
      setExpandedEvidence((prev) => new Set([...prev, data.evidenceIndex]))
      setPhase('EVIDENCE')
    })

    es.addEventListener('case_conclusion', (e) => {
      const data = JSON.parse(e.data)
      setRevealText(data.revealText)
      setParticipantEvolutions(data.participantEvolutions)
      setAnalysisText(data.analysis)
      setTotalPhases(data.totalPhases)
      // Auto-expand all evolutions
      setExpandedEvolutions(new Set(data.participantEvolutions.map((p: ParticipantEvolution) => p.userId)))
      setPhase('CONCLUSION')
    })

    es.addEventListener('sandy_says', (e) => {
      const data = JSON.parse(e.data)
      setSandyMessages((prev) => [...prev.slice(-4), data.message])
    })

    es.addEventListener('player_joined', (e) => {
      const data = JSON.parse(e.data)
      setTotalParticipants(data.count)
    })

    es.addEventListener('phase_changed', (e) => {
      const data = JSON.parse(e.data)
      const map: Record<string, CaseStudyPhase> = {
        READ: 'READ', HYPOTHESIZE: 'HYPOTHESIZE', EVIDENCE: 'EVIDENCE',
        CONCLUSION: 'CONCLUSION', COMPLETE: 'COMPLETE',
      }
      if (map[data.phase]) setPhase(map[data.phase]!)
    })

    es.addEventListener('complete', () => setPhase('COMPLETE'))

    return () => es.close()
  }, [roomId])

  // Handle start
  const handleStart = useCallback(async () => {
    await fetch(`/api/commons/${roomId}/start`, { method: 'POST', headers })
  }, [roomId])

  // Handle submit hypothesis
  const handleSubmitHypothesis = useCallback(async () => {
    if (!hypothesisText.trim() || hasSubmitted || submitting) return
    setSubmitting(true)
    try {
      await fetch(`/api/commons/${roomId}/hypothesis`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: hypothesisText.trim() }),
      })
      setMyHypotheses((prev) => [...prev, hypothesisText.trim()])
      setHasSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }, [roomId, hypothesisText, hasSubmitted, submitting])

  const toggleEvidence = (idx: number) => {
    setExpandedEvidence((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const toggleEvolution = (userId: string) => {
    setExpandedEvolutions((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const PHASE_COLORS = [
    'border-orange-500/30 bg-orange-950/30',
    'border-amber-500/30 bg-amber-950/30',
    'border-yellow-500/30 bg-yellow-950/30',
    'border-lime-500/30 bg-lime-950/30',
  ]

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between bg-orange-900 px-6 py-4">
        <div className="flex items-center gap-3">
          <FileSearch className="size-6 text-orange-300" />
          <div>
            <h2 className="text-lg font-extrabold text-white">Case Study</h2>
            <p className="text-sm text-orange-300">
              {phase === 'LOBBY' && `${participants.length} joined`}
              {phase === 'READ' && 'Reading case...'}
              {phase === 'HYPOTHESIZE' && `Hypothesis Round ${currentPhaseNumber + 1} -- ${submittedCount}/${totalParticipants}`}
              {phase === 'EVIDENCE' && `Evidence Drop ${evidenceDrops.length}/${totalPhases}`}
              {phase === 'CONCLUSION' && 'Conclusion'}
              {phase === 'COMPLETE' && 'Complete'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {timeRemaining > 0 && (phase === 'READ' || phase === 'HYPOTHESIZE') && (
            <div className="flex items-center gap-1.5 rounded-lg bg-black/30 px-3 py-1.5 text-sm font-bold text-white">
              <Clock className="size-4" />
              {Math.ceil(timeRemaining / 1000)}s
            </div>
          )}
          <button onClick={onClose} className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white">
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
              <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-orange-900/50">
                <FileSearch className="size-10 text-orange-400" />
              </div>
              <h3 className="text-2xl font-black text-white">Case Study</h3>
              <p className="text-gray-400">Read a real-world case. Form hypotheses. Revise as new evidence emerges. See who cracked it first.</p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Users className="size-4" />
                <span>{participants.length} participants</span>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {participants.map((p) => (
                  <div key={p.userId} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white">
                    {p.name}
                  </div>
                ))}
              </div>
              {isHost && (
                <button onClick={() => void handleStart()} className="rounded-xl bg-orange-600 px-8 py-3 font-bold text-white hover:bg-orange-500">
                  Start Case Study
                </button>
              )}
              {!isHost && (
                <p className="text-sm text-gray-500">Waiting for host to start...</p>
              )}
            </div>
          )}

          {/* READ */}
          {phase === 'READ' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-orange-500/30 bg-orange-950/50 p-6">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-orange-400">The Case</p>
                <div className="whitespace-pre-wrap text-lg leading-relaxed text-gray-200">{caseText}</div>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Lightbulb className="size-4 text-orange-400" />
                <span>Read carefully -- you'll be asked for your hypothesis soon</span>
              </div>
            </div>
          )}

          {/* HYPOTHESIZE */}
          {phase === 'HYPOTHESIZE' && (
            <div className="space-y-6">
              {/* Case text (collapsed reminder) */}
              <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">The Case</p>
                <p className="text-sm text-gray-400 line-clamp-3">{caseText}</p>
              </div>

              {/* Previous evidence drops */}
              {evidenceDrops.map((evidence, idx) => (
                <div key={idx} className={`rounded-xl border p-4 ${PHASE_COLORS[idx % PHASE_COLORS.length]}`}>
                  <button onClick={() => toggleEvidence(idx)} className="flex w-full items-center gap-2 text-left">
                    {expandedEvidence.has(idx) ? <ChevronDown className="size-4 text-orange-400" /> : <ChevronRight className="size-4 text-orange-400" />}
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-400">Evidence Drop {idx + 1}</span>
                  </button>
                  {expandedEvidence.has(idx) && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-300">{evidence}</p>
                  )}
                </div>
              ))}

              {/* Hypothesis input */}
              <div className="rounded-2xl border border-orange-500/30 bg-orange-950/30 p-5">
                <p className="mb-3 text-sm font-bold text-orange-400">
                  {currentPhaseNumber === 0
                    ? 'What do you think is happening? Submit your initial hypothesis.'
                    : 'New evidence has arrived. Has your thinking changed? Submit your updated hypothesis.'}
                </p>

                {!hasSubmitted ? (
                  <div className="space-y-3">
                    <textarea
                      value={hypothesisText}
                      onChange={(e) => setHypothesisText(e.target.value)}
                      placeholder={currentPhaseNumber === 0 ? 'Your initial hypothesis...' : 'Your revised hypothesis...'}
                      className="w-full rounded-xl border border-gray-700 bg-gray-900 p-4 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      rows={4}
                      disabled={submitting}
                      autoFocus
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={() => void handleSubmitHypothesis()}
                        disabled={!hypothesisText.trim() || submitting}
                        className="flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-3 font-bold text-white hover:bg-orange-500 disabled:opacity-40"
                      >
                        {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                        Submit Hypothesis
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-center text-emerald-400">
                    Hypothesis submitted! Waiting for others... ({submittedCount}/{totalParticipants})
                  </div>
                )}
              </div>

              {/* My hypothesis timeline */}
              {myHypotheses.length > 0 && (
                <div className="rounded-xl bg-gray-900 p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Your Hypothesis Evolution</p>
                  <div className="space-y-3 border-l-2 border-orange-500/30 pl-4">
                    {myHypotheses.map((hyp, i) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-[1.35rem] top-1 size-2.5 rounded-full bg-orange-500" />
                        <p className="text-xs font-bold text-orange-400">Round {i + 1}</p>
                        <p className="text-sm text-gray-300">{hyp}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* EVIDENCE DROP */}
          {phase === 'EVIDENCE' && (
            <div className="space-y-6">
              <div className="text-center">
                <span className="inline-block rounded-full bg-orange-900/50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-orange-400">
                  New Evidence
                </span>
              </div>

              {/* Case reminder */}
              <div className="rounded-xl border border-gray-700 bg-gray-900 p-3">
                <p className="text-xs text-gray-500 line-clamp-2">{caseText}</p>
              </div>

              {/* Evidence cards */}
              {evidenceDrops.map((evidence, idx) => (
                <div key={idx} className={`rounded-xl border p-4 ${idx === evidenceDrops.length - 1 ? 'border-orange-500 bg-orange-950/50 ring-2 ring-orange-500/20' : PHASE_COLORS[idx % PHASE_COLORS.length]}`}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-orange-400">
                    Evidence Drop {idx + 1}
                    {idx === evidenceDrops.length - 1 && ' (NEW)'}
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-gray-300">{evidence}</p>
                </div>
              ))}

              <p className="text-center text-sm text-gray-500">
                Processing evidence... You'll be asked for your updated hypothesis shortly.
              </p>
            </div>
          )}

          {/* CONCLUSION */}
          {(phase === 'CONCLUSION' || (phase === 'COMPLETE' && revealText)) && (
            <div className="space-y-6">
              <h3 className="text-center text-xl font-black text-white">What Actually Happened</h3>

              {/* The reveal */}
              <div className="rounded-2xl border border-orange-500/30 bg-orange-950/50 p-6">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-orange-400">The Full Story</p>
                <div className="whitespace-pre-wrap leading-relaxed text-gray-200">{revealText}</div>
              </div>

              {/* Participant evolutions */}
              {participantEvolutions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-gray-500">Hypothesis Evolution</h4>
                  {participantEvolutions.map((pe) => (
                    <div key={pe.userId} className={`rounded-xl border p-4 ${pe.userId === currentUser?.id ? 'border-orange-500/50 bg-orange-950/20' : 'border-gray-700 bg-gray-900'}`}>
                      <button onClick={() => toggleEvolution(pe.userId)} className="flex w-full items-center justify-between">
                        <div className="flex items-center gap-2">
                          {expandedEvolutions.has(pe.userId) ? <ChevronDown className="size-4 text-gray-500" /> : <ChevronRight className="size-4 text-gray-500" />}
                          <span className="font-bold text-white">
                            {pe.name}
                            {pe.userId === currentUser?.id && ' (you)'}
                          </span>
                          {pe.changedMind && (
                            <span className="rounded-full bg-amber-900/50 px-2 py-0.5 text-xs text-amber-400">
                              Revised thinking
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">{pe.hypotheses.length} hypotheses</span>
                      </button>

                      {expandedEvolutions.has(pe.userId) && (
                        <div className="mt-3 space-y-2 border-l-2 border-orange-500/30 pl-4">
                          {pe.hypotheses.map((hyp, i) => (
                            <div key={i} className="relative">
                              <div className="absolute -left-[1.35rem] top-1 size-2.5 rounded-full bg-orange-500" />
                              <p className="text-xs font-bold text-orange-400">
                                {i === 0 ? 'Initial' : `After Evidence ${i}`}
                              </p>
                              <p className="text-sm text-gray-300">{hyp}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Sandy analysis */}
              {analysisText && (
                <div className="rounded-2xl border border-orange-500/30 bg-orange-950/50 p-6">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-orange-400">Sandy's Analysis</p>
                  <div className="whitespace-pre-wrap leading-relaxed text-gray-200">{analysisText}</div>
                </div>
              )}

              {phase === 'COMPLETE' && (
                <div className="text-center">
                  <button onClick={onClose} className="rounded-xl bg-gray-800 px-8 py-3 font-bold text-white hover:bg-gray-700">
                    Back to Chat
                  </button>
                </div>
              )}
            </div>
          )}

          {/* COMPLETE (no conclusion data) */}
          {phase === 'COMPLETE' && !revealText && (
            <div className="space-y-6 text-center">
              <FileSearch className="mx-auto size-16 text-orange-400" />
              <h2 className="text-3xl font-black text-white">Case Study Complete!</h2>
              <p className="text-gray-400">The best analysts revise their thinking when new evidence demands it.</p>
              <button onClick={onClose} className="rounded-xl bg-gray-800 px-8 py-3 font-bold text-white hover:bg-gray-700">
                Back to Chat
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Sandy footer */}
      {sandyMessages.length > 0 && (
        <div className="border-t border-white/10 bg-white/5 px-6 py-3">
          <p className="text-center text-sm text-white/80">
            <span className="mr-1.5 font-bold text-orange-300">Sandy:</span>
            {sandyMessages[sandyMessages.length - 1]}
          </p>
        </div>
      )}
    </div>
  )
}
