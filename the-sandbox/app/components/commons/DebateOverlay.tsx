'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Scale, Send, Users, Clock, Loader2, ThumbsUp, ChevronDown, ChevronRight, MessageSquare } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface DebateOverlayProps {
  roomId: string
  onClose: () => void
}

interface SideInfo {
  name: string
  participants: Array<{ userId: string; name: string }>
  voteCount?: number
}

interface StatementEntry {
  speakerUserId: string
  speakerName: string
  sideIndex: number
  phase: string
  text: string
}

type DebatePhase = 'LOBBY' | 'TOPIC' | 'OPENING' | 'REBUTTAL' | 'CLOSING' | 'VOTE' | 'RESULTS' | 'COMPLETE'

export default function DebateOverlay({ roomId, onClose }: DebateOverlayProps) {
  const { currentUser } = useAuth()
  const headers = { 'x-demo-user-email': currentUser.email }

  // Room state
  const [phase, setPhase] = useState<DebatePhase>('LOBBY')
  const [topic, setTopic] = useState('')
  const [sides, setSides] = useState<SideInfo[]>([])
  const [mySideIndex, setMySideIndex] = useState(-1)

  // Speaker state
  const [currentSpeaker, setCurrentSpeaker] = useState<{ userId: string; name: string; sideName: string; sideIndex: number } | null>(null)
  const [speakerPhase, setSpeakerPhase] = useState('')
  const [timeMs, setTimeMs] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [speakerIndex, setSpeakerIndex] = useState(0)
  const [totalSpeakers, setTotalSpeakers] = useState(0)

  // Input state
  const [statementText, setStatementText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  // Statements log
  const [statements, setStatements] = useState<StatementEntry[]>([])
  const [expandedStatements, setExpandedStatements] = useState(true)

  // Fact checks
  const [factChecks, setFactChecks] = useState<string[]>([])

  // Voting
  const [hasVoted, setHasVoted] = useState(false)
  const [voteCount, setVoteCount] = useState(0)
  const [totalParticipants, setTotalParticipants] = useState(0)

  // Results
  const [results, setResults] = useState<{
    topic: string
    sides: Array<SideInfo & { voteCount: number }>
    totalVotes: number
    winner: number
    analysis: string
    factChecks: string[]
  } | null>(null)

  // Host state
  const [isHost, setIsHost] = useState(false)
  const [participants, setParticipants] = useState<Array<{ userId: string; name: string }>>([])

  // Sandy messages
  const [sandyMessages, setSandyMessages] = useState<string[]>([])

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
  }, [timeMs, currentSpeaker])

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

    es.addEventListener('debate_topic', (e) => {
      const data = JSON.parse(e.data)
      setTopic(data.topic)
      setSides(data.sides)
      setPhase('TOPIC')
      // Determine which side I'm on
      const myIdx = data.sides.findIndex((s: SideInfo) =>
        s.participants.some((p: { userId: string }) => p.userId === currentUser?.id)
      )
      setMySideIndex(myIdx)
    })

    es.addEventListener('speaker_turn', (e) => {
      const data = JSON.parse(e.data)
      setCurrentSpeaker({
        userId: data.speakerUserId,
        name: data.speakerName,
        sideName: data.sideName,
        sideIndex: data.sideIndex,
      })
      setSpeakerPhase(data.phase)
      setTimeMs(data.timeMs)
      setSpeakerIndex(data.speakerIndex)
      setTotalSpeakers(data.totalSpeakers)
      setStatementText('')
      setHasSubmitted(false)
      setPhase(data.phase)
    })

    es.addEventListener('statement_submitted', (e) => {
      const data = JSON.parse(e.data)
      setStatements((prev) => [...prev, {
        speakerUserId: data.speakerUserId,
        speakerName: data.speakerName,
        sideIndex: data.sideIndex,
        phase: data.phase,
        text: data.text,
      }])
    })

    es.addEventListener('fact_check', (e) => {
      const data = JSON.parse(e.data)
      setFactChecks((prev) => [...prev, data.commentary])
    })

    es.addEventListener('voting_open', (e) => {
      const data = JSON.parse(e.data)
      setSides(data.sides)
      setTimeMs(data.timeMs)
      setHasVoted(false)
      setPhase('VOTE')
    })

    es.addEventListener('vote_cast', (e) => {
      const data = JSON.parse(e.data)
      setVoteCount(data.voteCount)
      setTotalParticipants(data.totalParticipants)
    })

    es.addEventListener('debate_results', (e) => {
      const data = JSON.parse(e.data)
      setResults(data)
      setPhase('RESULTS')
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
      const map: Record<string, DebatePhase> = {
        TOPIC: 'TOPIC', OPENING: 'OPENING', REBUTTAL: 'REBUTTAL',
        CLOSING: 'CLOSING', VOTE: 'VOTE', RESULTS: 'RESULTS', COMPLETE: 'COMPLETE',
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

  // Handle submit statement
  const handleSubmitStatement = useCallback(async () => {
    if (!statementText.trim() || hasSubmitted || submitting) return
    setSubmitting(true)
    try {
      await fetch(`/api/commons/${roomId}/statement`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: statementText.trim(), phase: speakerPhase.toLowerCase() }),
      })
      setHasSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }, [roomId, statementText, speakerPhase, hasSubmitted, submitting])

  // Handle vote
  const handleVote = useCallback(async (sideIndex: number) => {
    if (hasVoted) return
    setHasVoted(true)
    await fetch(`/api/commons/${roomId}/vote`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sideIndex }),
    })
  }, [roomId, hasVoted])

  const isMyTurn = currentSpeaker?.userId === currentUser?.id
  const SIDE_COLORS = ['bg-blue-900/50 border-blue-500/30', 'bg-red-900/50 border-red-500/30']
  const SIDE_TEXT = ['text-blue-400', 'text-red-400']
  const SIDE_BTN = ['bg-blue-600 hover:bg-blue-500', 'bg-red-600 hover:bg-red-500']

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between bg-red-900 px-6 py-4">
        <div className="flex items-center gap-3">
          <Scale className="size-6 text-red-300" />
          <div>
            <h2 className="text-lg font-extrabold text-white">Debate</h2>
            <p className="text-sm text-red-300">
              {phase === 'LOBBY' && `${totalParticipants} joined`}
              {phase === 'TOPIC' && 'Topic revealed...'}
              {(phase === 'OPENING' || phase === 'REBUTTAL' || phase === 'CLOSING') && `${phase} -- Speaker ${speakerIndex + 1}/${totalSpeakers}`}
              {phase === 'VOTE' && `Voting -- ${voteCount}/${totalParticipants}`}
              {phase === 'RESULTS' && 'Results'}
              {phase === 'COMPLETE' && 'Complete'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {timeRemaining > 0 && (phase === 'OPENING' || phase === 'REBUTTAL' || phase === 'CLOSING' || phase === 'VOTE') && (
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
              <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-red-900/50">
                <Scale className="size-10 text-red-400" />
              </div>
              <h3 className="text-2xl font-black text-white">Debate</h3>
              <p className="text-gray-400">Take opposing positions. Build arguments. Vote on who was most persuasive.</p>
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
              {isHost && participants.length >= 2 && (
                <button onClick={() => void handleStart()} className="rounded-xl bg-red-600 px-8 py-3 font-bold text-white hover:bg-red-500">
                  Start Debate
                </button>
              )}
              {isHost && participants.length < 2 && (
                <p className="text-sm text-gray-500">Need at least 2 participants</p>
              )}
              {!isHost && (
                <p className="text-sm text-gray-500">Waiting for host to start...</p>
              )}
            </div>
          )}

          {/* TOPIC REVEAL */}
          {phase === 'TOPIC' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-red-500/30 bg-red-950/50 p-6 text-center">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-red-400">Today's Debate</p>
                <h3 className="text-xl font-black text-white">{topic}</h3>
              </div>

              {/* Side cards */}
              <div className="grid grid-cols-2 gap-4">
                {sides.map((side, idx) => (
                  <div key={idx} className={`rounded-xl border p-4 ${SIDE_COLORS[idx]}`}>
                    <p className={`mb-2 text-sm font-bold ${SIDE_TEXT[idx]}`}>{side.name}</p>
                    <div className="space-y-1">
                      {side.participants.map((p) => (
                        <div key={p.userId} className={`text-sm text-gray-300 ${p.userId === currentUser?.id ? 'font-bold text-white' : ''}`}>
                          {p.name}{p.userId === currentUser?.id ? ' (you)' : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {mySideIndex >= 0 && (
                <p className="text-center text-sm text-gray-400">
                  You are on <span className={`font-bold ${SIDE_TEXT[mySideIndex]}`}>{sides[mySideIndex]?.name}</span>
                </p>
              )}
            </div>
          )}

          {/* SPEAKING PHASES (OPENING / REBUTTAL / CLOSING) */}
          {(phase === 'OPENING' || phase === 'REBUTTAL' || phase === 'CLOSING') && (
            <div className="space-y-6">
              {/* Phase + speaker indicator */}
              <div className="text-center">
                <span className="inline-block rounded-full bg-red-900/50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-red-400">
                  {phase} Statements
                </span>
              </div>

              {/* Current speaker */}
              {currentSpeaker && (
                <div className={`rounded-2xl border p-5 ${SIDE_COLORS[currentSpeaker.sideIndex]}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Now Speaking</p>
                      <p className="text-lg font-bold text-white">
                        {currentSpeaker.name}
                        {isMyTurn && ' (You)'}
                      </p>
                      <p className={`text-sm ${SIDE_TEXT[currentSpeaker.sideIndex]}`}>
                        {currentSpeaker.sideName}
                      </p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      Speaker {speakerIndex + 1} of {totalSpeakers}
                    </div>
                  </div>
                </div>
              )}

              {/* My turn: input */}
              {isMyTurn && !hasSubmitted && (
                <div className="space-y-3">
                  <textarea
                    value={statementText}
                    onChange={(e) => setStatementText(e.target.value)}
                    placeholder={`Write your ${phase.toLowerCase()} statement...`}
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 p-4 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    rows={5}
                    disabled={submitting}
                    autoFocus
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => void handleSubmitStatement()}
                      disabled={!statementText.trim() || submitting}
                      className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-500 disabled:opacity-40"
                    >
                      {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                      Submit {phase.charAt(0) + phase.slice(1).toLowerCase()}
                    </button>
                  </div>
                </div>
              )}

              {/* My turn: submitted */}
              {isMyTurn && hasSubmitted && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-center text-emerald-400">
                  Statement submitted! Sandy is analyzing...
                </div>
              )}

              {/* Not my turn: watching */}
              {!isMyTurn && (
                <div className="rounded-xl border border-gray-700 bg-gray-900 p-4 text-center text-gray-400">
                  <MessageSquare className="mx-auto mb-2 size-6 text-gray-600" />
                  Waiting for {currentSpeaker?.name} to submit their {phase.toLowerCase()} statement...
                </div>
              )}

              {/* Recent statements */}
              {statements.length > 0 && (
                <div className="space-y-2">
                  <button onClick={() => setExpandedStatements(!expandedStatements)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300">
                    {expandedStatements ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    Previous Statements ({statements.length})
                  </button>
                  {expandedStatements && statements.slice(-6).map((s, i) => (
                    <div key={i} className={`rounded-lg border-l-4 bg-gray-900 p-3 ${s.sideIndex === 0 ? 'border-blue-500' : 'border-red-500'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${SIDE_TEXT[s.sideIndex]}`}>{s.speakerName}</span>
                        <span className="text-xs text-gray-600">({s.phase})</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-300">{s.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Fact checks */}
              {factChecks.length > 0 && (
                <div className="rounded-xl bg-amber-950/30 p-3">
                  <p className="mb-1 text-xs font-bold text-amber-400">Sandy's Fact-Checks</p>
                  {factChecks.slice(-3).map((fc, i) => (
                    <p key={i} className="text-sm text-amber-200/70 italic">{fc}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VOTE */}
          {phase === 'VOTE' && (
            <div className="space-y-6">
              <div className="text-center">
                <ThumbsUp className="mx-auto mb-2 size-8 text-red-400" />
                <h3 className="text-xl font-black text-white">Cast Your Vote</h3>
                <p className="text-sm text-gray-400">Which side was most persuasive? (You cannot vote for your own side)</p>
              </div>

              {!hasVoted ? (
                <div className="grid grid-cols-2 gap-4">
                  {sides.map((side, idx) => {
                    const isOwnSide = idx === mySideIndex
                    return (
                      <button
                        key={idx}
                        onClick={() => !isOwnSide && void handleVote(idx)}
                        disabled={isOwnSide}
                        className={`rounded-xl border p-6 text-center transition-all ${
                          isOwnSide
                            ? 'cursor-not-allowed border-gray-700 bg-gray-900 opacity-40'
                            : `${SIDE_COLORS[idx]} cursor-pointer hover:scale-105`
                        }`}
                      >
                        <p className={`text-lg font-bold ${isOwnSide ? 'text-gray-500' : 'text-white'}`}>
                          {side.name}
                        </p>
                        <div className="mt-2 space-y-0.5">
                          {side.participants.map((p) => (
                            <p key={p.userId} className="text-xs text-gray-400">{p.name}</p>
                          ))}
                        </div>
                        {isOwnSide && <p className="mt-2 text-xs text-gray-600">Your side</p>}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-center text-emerald-400">
                  Vote cast! Waiting for others... ({voteCount}/{totalParticipants})
                </div>
              )}
            </div>
          )}

          {/* RESULTS */}
          {phase === 'RESULTS' && results && (
            <div className="space-y-6">
              <h3 className="text-center text-xl font-black text-white">Debate Results</h3>

              <div className="rounded-2xl border border-red-500/30 bg-red-950/30 p-4 text-center">
                <p className="text-sm text-gray-400">Topic</p>
                <p className="text-lg font-bold text-white">{results.topic}</p>
              </div>

              {/* Vote bars */}
              <div className="space-y-4">
                {results.sides.map((side, idx) => {
                  const pct = results.totalVotes > 0 ? Math.round((side.voteCount / results.totalVotes) * 100) : 0
                  const isWinner = results.winner === idx
                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`font-bold ${SIDE_TEXT[idx]}`}>
                          {side.name}
                          {isWinner && ' -- WINNER'}
                        </span>
                        <span className="text-sm text-gray-400">{side.voteCount} votes ({pct}%)</span>
                      </div>
                      <div className="h-4 overflow-hidden rounded-full bg-gray-800">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${idx === 0 ? 'bg-blue-500' : 'bg-red-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {side.participants.map((p) => (
                          <span key={p.userId} className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-gray-400">
                            {p.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
                {results.winner === -1 && (
                  <p className="text-center text-lg font-bold text-amber-400">It's a tie!</p>
                )}
              </div>

              {/* Sandy analysis */}
              {results.analysis && (
                <div className="rounded-2xl border border-red-500/30 bg-red-950/50 p-6">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-red-400">Sandy's Analysis</p>
                  <div className="whitespace-pre-wrap leading-relaxed text-gray-200">{results.analysis}</div>
                </div>
              )}

              {/* Fact checks summary */}
              {results.factChecks && results.factChecks.length > 0 && (
                <div className="rounded-xl bg-amber-950/30 p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-400">Fact-Checks During Debate</p>
                  {results.factChecks.map((fc, i) => (
                    <p key={i} className="mb-1 text-sm text-amber-200/70">{fc}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* COMPLETE */}
          {phase === 'COMPLETE' && (
            <div className="space-y-6 text-center">
              <Scale className="mx-auto size-16 text-red-400" />
              <h2 className="text-3xl font-black text-white">Debate Complete!</h2>
              <p className="text-gray-400">Great arguments from both sides. The real skill is understanding the other perspective.</p>
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
            <span className="mr-1.5 font-bold text-red-300">Sandy:</span>
            {sandyMessages[sandyMessages.length - 1]}
          </p>
        </div>
      )}
    </div>
  )
}
