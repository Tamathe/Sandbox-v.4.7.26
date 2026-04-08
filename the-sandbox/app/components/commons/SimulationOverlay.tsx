'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Send, GitBranch, Users, Clock, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface SimulationOverlayProps {
  roomId: string
  onClose: () => void
}

interface PathTurn {
  turn: number
  choice: string
  narrative: string
}

interface ParticipantPath {
  userId: string
  name: string
  turns: PathTurn[]
}

export default function SimulationOverlay({ roomId, onClose }: SimulationOverlayProps) {
  const { currentUser } = useAuth()
  const headers = { 'x-demo-user-email': currentUser.email }

  // Room state
  const [phase, setPhase] = useState<'LOBBY' | 'SCENARIO' | 'BRANCHING' | 'DIVERGENCE' | 'COMPLETE'>('LOBBY')
  const [scenario, setScenario] = useState('')
  const [totalTurns, setTotalTurns] = useState(5)
  const [currentTurn, setCurrentTurn] = useState(0)
  const [submittedCount, setSubmittedCount] = useState(0)
  const [totalParticipants, setTotalParticipants] = useState(0)

  // Turn state
  const [privatePrompt, setPrivatePrompt] = useState('')
  const [choice, setChoice] = useState('')
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Divergence state
  const [paths, setPaths] = useState<ParticipantPath[]>([])
  const [analysis, setAnalysis] = useState('')
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())

  // Sandy messages
  const [sandyMessages, setSandyMessages] = useState<string[]>([])

  // Host state
  const [isHost, setIsHost] = useState(false)
  const [participants, setParticipants] = useState<Array<{ userId: string; name: string }>>([])

  // Initial room fetch
  useEffect(() => {
    fetch(`/api/commons/${roomId}`, { headers })
      .then(r => r.json())
      .then(room => {
        setIsHost(room.hostId === currentUser?.id)
        setParticipants(room.participants)
        setTotalParticipants(room.participants.length)
        const config = room.config || {}
        setTotalTurns(config.totalTurns || 5)

        // Map DB phase to display phase
        const phaseMap: Record<string, typeof phase> = {
          LOBBY: 'LOBBY', COUNTDOWN: 'SCENARIO', QUESTION: 'BRANCHING',
          REVEAL: 'DIVERGENCE', COMPLETE: 'COMPLETE'
        }
        setPhase(phaseMap[room.phase] || 'LOBBY')
      })
      .catch(() => {})
  }, [roomId])

  // SSE subscription
  useEffect(() => {
    const es = new EventSource(`/api/commons/${roomId}/stream`)

    es.addEventListener('scenario_presented', (e) => {
      const data = JSON.parse(e.data)
      setScenario(data.scenario)
      setTotalTurns(data.totalTurns)
      setPhase('SCENARIO')
      // Auto-transition after Sandy presents scenario
      setTimeout(() => setPhase('BRANCHING'), 5000)
    })

    es.addEventListener('private_prompt', (e) => {
      const data = JSON.parse(e.data)
      setPrivatePrompt(data.prompt)
      setCurrentTurn(data.turnNumber)
      setHasSubmitted(false)
      setChoice('')
    })

    es.addEventListener('turn_advanced', (e) => {
      const data = JSON.parse(e.data)
      setCurrentTurn(data.turnNumber)
      setSubmittedCount(0)
      setHasSubmitted(false)
      setPhase('BRANCHING')
    })

    es.addEventListener('choice_submitted', (e) => {
      const data = JSON.parse(e.data)
      setSubmittedCount(data.submittedCount)
      setTotalParticipants(data.totalParticipants)
    })

    es.addEventListener('divergence_reveal', (e) => {
      const data = JSON.parse(e.data)
      setPaths(data.paths)
      setAnalysis(data.analysis)
      setPhase('DIVERGENCE')
      // Auto-expand all paths
      setExpandedPaths(new Set(data.paths.map((p: ParticipantPath) => p.userId)))
    })

    es.addEventListener('sandy_says', (e) => {
      const data = JSON.parse(e.data)
      setSandyMessages(prev => [...prev, data.message])
    })

    es.addEventListener('player_joined', (e) => {
      const data = JSON.parse(e.data)
      setTotalParticipants(data.count)
    })

    es.addEventListener('phase_changed', (e) => {
      const data = JSON.parse(e.data)
      const phaseMap: Record<string, typeof phase> = {
        LOBBY: 'LOBBY', COUNTDOWN: 'SCENARIO', QUESTION: 'BRANCHING',
        REVEAL: 'DIVERGENCE', COMPLETE: 'COMPLETE'
      }
      if (phaseMap[data.phase]) setPhase(phaseMap[data.phase])
    })

    es.addEventListener('complete', () => {
      setPhase('COMPLETE')
    })

    return () => es.close()
  }, [roomId])

  // Handle start
  const handleStart = async () => {
    await fetch(`/api/commons/${roomId}/start`, { method: 'POST', headers })
  }

  // Handle submit choice
  const handleSubmit = async () => {
    if (!choice.trim() || hasSubmitted || submitting) return
    setSubmitting(true)
    try {
      await fetch(`/api/commons/${roomId}/respond`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice: choice.trim() }),
      })
      setHasSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  // Path colors for divergence view
  const PATH_COLORS = [
    'border-blue-400 bg-blue-50', 'border-emerald-400 bg-emerald-50',
    'border-amber-400 bg-amber-50', 'border-purple-400 bg-purple-50',
    'border-rose-400 bg-rose-50', 'border-cyan-400 bg-cyan-50',
    'border-orange-400 bg-orange-50', 'border-indigo-400 bg-indigo-50',
  ]

  const DOT_COLORS = [
    'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-orange-500', 'bg-indigo-500',
  ]

  const togglePath = (userId: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between bg-purple-900 px-6 py-4">
        <div className="flex items-center gap-3">
          <GitBranch className="size-6 text-purple-300" />
          <div>
            <h2 className="text-lg font-extrabold text-white">Simulation</h2>
            <p className="text-sm text-purple-300">
              {phase === 'LOBBY' && `${totalParticipants} joined`}
              {phase === 'SCENARIO' && 'Reading scenario...'}
              {phase === 'BRANCHING' && `Turn ${currentTurn}/${totalTurns} — ${submittedCount}/${totalParticipants} responded`}
              {phase === 'DIVERGENCE' && 'Comparing paths...'}
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
              <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-purple-900/50">
                <GitBranch className="size-10 text-purple-400" />
              </div>
              <h3 className="text-2xl font-black text-white">Simulation</h3>
              <p className="text-gray-400">Everyone starts with the same scenario. Make your own choices. See where everyone ends up.</p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Users className="size-4" />
                <span>{totalParticipants} participants</span>
                <span className="mx-2">·</span>
                <Clock className="size-4" />
                <span>{totalTurns} turns</span>
              </div>
              {isHost && (
                <button onClick={handleStart} className="rounded-xl bg-purple-600 px-8 py-3 font-bold text-white hover:bg-purple-500">
                  Start Simulation
                </button>
              )}
              {!isHost && (
                <p className="text-sm text-gray-500">Waiting for host to start...</p>
              )}
            </div>
          )}

          {/* SCENARIO — shared starting prompt */}
          {phase === 'SCENARIO' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-purple-500/30 bg-purple-950/50 p-6">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-purple-400">Starting Scenario</p>
                <div className="whitespace-pre-wrap text-lg leading-relaxed text-gray-200">{scenario}</div>
              </div>
              <p className="text-center text-sm text-gray-500">Sandy is preparing your first decision...</p>
            </div>
          )}

          {/* BRANCHING — private turns */}
          {phase === 'BRANCHING' && (
            <div className="space-y-6">
              {/* Turn indicator */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalTurns }, (_, i) => (
                    <div key={i} className={`size-3 rounded-full ${i + 1 < currentTurn ? 'bg-purple-500' : i + 1 === currentTurn ? 'bg-purple-400 ring-2 ring-purple-400/50' : 'bg-gray-700'}`} />
                  ))}
                </div>
                <span className="text-sm text-gray-500">{submittedCount}/{totalParticipants} responded</span>
              </div>

              {/* Sandy's scenario/narrative context */}
              {scenario && currentTurn === 1 && (
                <div className="rounded-2xl border border-gray-700 bg-gray-900 p-5">
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-purple-400">Scenario</p>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">{scenario}</div>
                </div>
              )}

              {/* Private prompt from Sandy */}
              {privatePrompt && (
                <div className="rounded-2xl border border-purple-500/30 bg-purple-950/50 p-5">
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-purple-400">
                    Sandy — Turn {currentTurn}
                  </p>
                  <div className="whitespace-pre-wrap leading-relaxed text-gray-200">{privatePrompt}</div>
                </div>
              )}

              {/* Choice input */}
              {!hasSubmitted ? (
                <div className="space-y-3">
                  <textarea
                    value={choice}
                    onChange={(e) => setChoice(e.target.value)}
                    placeholder="Type your response..."
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 p-4 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    rows={4}
                    disabled={submitting}
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleSubmit}
                      disabled={!choice.trim() || submitting}
                      className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 font-bold text-white hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600"
                    >
                      {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                      Submit Response
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-center text-emerald-400">
                  Response submitted. Waiting for others...
                </div>
              )}

              {/* Sandy commentary */}
              {sandyMessages.length > 0 && (
                <div className="space-y-2">
                  {sandyMessages.slice(-3).map((msg, i) => (
                    <div key={i} className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-gray-400 italic">
                      Sandy: {msg}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DIVERGENCE — comparison view */}
          {(phase === 'DIVERGENCE' || phase === 'COMPLETE') && paths.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-center text-xl font-black text-white">Where Everyone Ended Up</h3>

              {/* Scenario reminder */}
              <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">Starting Scenario</p>
                <p className="text-sm text-gray-400 line-clamp-3">{scenario}</p>
              </div>

              {/* Path cards */}
              {paths.map((path, idx) => (
                <div key={path.userId} className={`rounded-2xl border-l-4 p-5 ${PATH_COLORS[idx % PATH_COLORS.length]}`}>
                  <button
                    onClick={() => togglePath(path.userId)}
                    className="flex w-full items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`size-3 rounded-full ${DOT_COLORS[idx % DOT_COLORS.length]}`} />
                      <span className="font-bold text-gray-900">{path.name}</span>
                      <span className="text-sm text-gray-500">{path.turns.length} turns</span>
                    </div>
                    {expandedPaths.has(path.userId) ? <ChevronDown className="size-4 text-gray-500" /> : <ChevronRight className="size-4 text-gray-500" />}
                  </button>

                  {expandedPaths.has(path.userId) && (
                    <div className="mt-4 space-y-3 border-l-2 border-gray-300 pl-4">
                      {path.turns.map((turn) => (
                        <div key={turn.turn} className="space-y-1">
                          <p className="text-xs font-bold text-gray-500">Turn {turn.turn}</p>
                          <p className="text-sm font-medium text-gray-800">Choice: {turn.choice}</p>
                          <p className="text-sm text-gray-600">{turn.narrative}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Sandy analysis */}
              {analysis && (
                <div className="rounded-2xl border border-purple-500/30 bg-purple-950/50 p-6">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-purple-400">Sandy's Analysis</p>
                  <div className="whitespace-pre-wrap leading-relaxed text-gray-200">{analysis}</div>
                </div>
              )}

              {phase === 'COMPLETE' && (
                <div className="text-center">
                  <button onClick={onClose} className="rounded-xl bg-gray-800 px-6 py-3 font-bold text-white hover:bg-gray-700">
                    Close
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
