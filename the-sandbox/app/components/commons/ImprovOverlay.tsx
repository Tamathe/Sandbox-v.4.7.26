'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Mic, Send, Users, Clock, Loader2, Star } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface ImprovOverlayProps {
  roomId: string
  onClose: () => void
}

interface PerformerInfo {
  userId: string
  name: string
}

interface ImprovResult {
  userId: string
  name: string
  performance: string
  empathy: number
  accuracy: number
  professionalism: number
  overall: number
  coaching: string
}

type ImprovPhase = 'LOBBY' | 'SCENARIO' | 'PERFORM' | 'RATE' | 'DEBRIEF' | 'COMPLETE'

export default function ImprovOverlay({ roomId, onClose }: ImprovOverlayProps) {
  const { currentUser } = useAuth()
  const headers = { 'x-demo-user-email': currentUser.email }

  // Room state
  const [phase, setPhase] = useState<ImprovPhase>('LOBBY')
  const [scenario, setScenario] = useState('')
  const [performOrder, setPerformOrder] = useState<PerformerInfo[]>([])

  // Performer state
  const [currentPerformer, setCurrentPerformer] = useState<PerformerInfo | null>(null)
  const [turnNumber, setTurnNumber] = useState(0)
  const [totalTurns, setTotalTurns] = useState(0)
  const [timeMs, setTimeMs] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(0)

  // Input state
  const [performanceText, setPerformanceText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [hasSubmittedPerformance, setHasSubmittedPerformance] = useState(false)
  const [submittedPerformanceText, setSubmittedPerformanceText] = useState<string | null>(null)

  // Rating state
  const [ratingPerformer, setRatingPerformer] = useState<PerformerInfo | null>(null)
  const [ratingPerformance, setRatingPerformance] = useState('')
  const [empathyRating, setEmpathyRating] = useState(0)
  const [accuracyRating, setAccuracyRating] = useState(0)
  const [professionalismRating, setProfessionalismRating] = useState(0)
  const [hasRated, setHasRated] = useState(false)
  const [raterCount, setRaterCount] = useState(0)
  const [totalRaters, setTotalRaters] = useState(0)

  // Debrief
  const [debriefResults, setDebriefResults] = useState<ImprovResult[]>([])

  // Host state
  const [isHost, setIsHost] = useState(false)
  const [participants, setParticipants] = useState<PerformerInfo[]>([])

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
  }, [timeMs, currentPerformer, phase])

  // Initial room fetch
  useEffect(() => {
    fetch(`/api/commons/${roomId}`, { headers })
      .then((r) => r.json())
      .then((room) => {
        setIsHost(room.hostId === currentUser?.id)
        setParticipants(room.participants)
      })
      .catch(() => {})
  }, [roomId])

  // SSE subscription
  useEffect(() => {
    const es = new EventSource(`/api/commons/${roomId}/stream`)

    es.addEventListener('improv_scenario', (e) => {
      const data = JSON.parse(e.data)
      setScenario(data.scenario)
      setPerformOrder(data.performOrder)
      setPhase('SCENARIO')
    })

    es.addEventListener('perform_turn', (e) => {
      const data = JSON.parse(e.data)
      setCurrentPerformer({ userId: data.performerUserId, name: data.performerName })
      setTurnNumber(data.turnNumber)
      setTotalTurns(data.totalTurns)
      setTimeMs(data.performTimeMs)
      setPerformanceText('')
      setHasSubmittedPerformance(false)
      setSubmittedPerformanceText(null)
      setPhase('PERFORM')
    })

    es.addEventListener('performance_submitted', (e) => {
      const data = JSON.parse(e.data)
      setSubmittedPerformanceText(data.text)
      if (data.performerUserId === currentUser?.id) {
        setHasSubmittedPerformance(true)
      }
    })

    es.addEventListener('rate_performance', (e) => {
      const data = JSON.parse(e.data)
      setRatingPerformer({ userId: data.performerUserId, name: data.performerName })
      setRatingPerformance(data.performance)
      setTimeMs(data.rateTimeMs)
      setEmpathyRating(0)
      setAccuracyRating(0)
      setProfessionalismRating(0)
      setHasRated(false)
      setRaterCount(0)
      setPhase('RATE')
    })

    es.addEventListener('improv_rating_received', (e) => {
      const data = JSON.parse(e.data)
      setRaterCount(data.raterCount)
      setTotalRaters(data.totalRaters)
    })

    es.addEventListener('improv_debrief', (e) => {
      const data = JSON.parse(e.data)
      setDebriefResults(data.results)
      setPhase('DEBRIEF')
    })

    es.addEventListener('sandy_says', (e) => {
      const data = JSON.parse(e.data)
      setSandyMessages((prev) => [...prev.slice(-4), data.message])
    })

    es.addEventListener('player_joined', (e) => {
      const data = JSON.parse(e.data)
      setParticipants((prev) =>
        prev.some((p) => p.userId === data.userId) ? prev : [...prev, { userId: data.userId, name: data.name }]
      )
    })

    es.addEventListener('phase_changed', (e) => {
      const data = JSON.parse(e.data)
      const map: Record<string, ImprovPhase> = {
        SCENARIO: 'SCENARIO', PERFORM: 'PERFORM', RATE: 'RATE',
        DEBRIEF: 'DEBRIEF', COMPLETE: 'COMPLETE',
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

  // Handle submit performance
  const handleSubmitPerformance = useCallback(async () => {
    if (!performanceText.trim() || hasSubmittedPerformance || submitting) return
    setSubmitting(true)
    try {
      await fetch(`/api/commons/${roomId}/perform`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: performanceText.trim() }),
      })
      setHasSubmittedPerformance(true)
    } finally {
      setSubmitting(false)
    }
  }, [roomId, performanceText, hasSubmittedPerformance, submitting])

  // Handle submit rating
  const handleSubmitRating = useCallback(async () => {
    if (!ratingPerformer || hasRated || empathyRating === 0 || accuracyRating === 0 || professionalismRating === 0) return
    setHasRated(true)
    await fetch(`/api/commons/${roomId}/improv-rate`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        performerId: ratingPerformer.userId,
        empathy: empathyRating,
        accuracy: accuracyRating,
        professionalism: professionalismRating,
      }),
    })
  }, [roomId, ratingPerformer, hasRated, empathyRating, accuracyRating, professionalismRating])

  const isMyTurn = currentPerformer?.userId === currentUser?.id
  const isRatingMyself = ratingPerformer?.userId === currentUser?.id

  // Star rating component
  const StarRating = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-gray-300">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star className={`size-6 ${n <= value ? 'fill-pink-400 text-pink-400' : 'text-gray-600'}`} />
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between bg-pink-900 px-6 py-4">
        <div className="flex items-center gap-3">
          <Mic className="size-6 text-pink-300" />
          <div>
            <h2 className="text-lg font-extrabold text-white">Improv</h2>
            <p className="text-sm text-pink-300">
              {phase === 'LOBBY' && `${participants.length} joined`}
              {phase === 'SCENARIO' && 'Reading scenario...'}
              {phase === 'PERFORM' && `Turn ${turnNumber}/${totalTurns} -- ${currentPerformer?.name ?? ''}`}
              {phase === 'RATE' && `Rating ${ratingPerformer?.name ?? ''}`}
              {phase === 'DEBRIEF' && 'Debrief'}
              {phase === 'COMPLETE' && 'Complete'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {timeRemaining > 0 && (phase === 'PERFORM' || phase === 'RATE') && (
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
              <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-pink-900/50">
                <Mic className="size-10 text-pink-400" />
              </div>
              <h3 className="text-2xl font-black text-white">Improv</h3>
              <p className="text-gray-400">Practice real-world scenarios. Respond in the moment. Get feedback on empathy, accuracy, and professionalism.</p>
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
                <button onClick={() => void handleStart()} className="rounded-xl bg-pink-600 px-8 py-3 font-bold text-white hover:bg-pink-500">
                  Start Improv
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

          {/* SCENARIO */}
          {phase === 'SCENARIO' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-pink-500/30 bg-pink-950/50 p-6">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-pink-400">The Scenario</p>
                <div className="whitespace-pre-wrap text-lg leading-relaxed text-gray-200">{scenario}</div>
              </div>

              {/* Perform order */}
              <div className="rounded-xl bg-gray-900 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Performance Order</p>
                <div className="flex flex-wrap gap-2">
                  {performOrder.map((p, i) => (
                    <div key={p.userId} className={`rounded-full px-3 py-1 text-xs font-medium ${p.userId === currentUser?.id ? 'bg-pink-600 text-white' : 'bg-white/10 text-gray-400'}`}>
                      {i + 1}. {p.name}{p.userId === currentUser?.id ? ' (you)' : ''}
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-center text-sm text-gray-500">Starting in a few seconds...</p>
            </div>
          )}

          {/* PERFORM -- My turn */}
          {phase === 'PERFORM' && isMyTurn && !hasSubmittedPerformance && (
            <div className="space-y-6">
              <div className="rounded-xl bg-pink-900/30 p-4 text-center">
                <p className="text-lg font-black text-pink-300">Your Turn!</p>
                <p className="text-sm text-gray-400">How would you handle this situation?</p>
              </div>

              {/* Scenario reminder */}
              <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">Scenario</p>
                <p className="text-sm leading-relaxed text-gray-400">{scenario}</p>
              </div>

              <div className="space-y-3">
                <textarea
                  value={performanceText}
                  onChange={(e) => setPerformanceText(e.target.value)}
                  placeholder="Respond as if you were actually in this situation..."
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 p-4 text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                  rows={6}
                  disabled={submitting}
                  autoFocus
                />
                <div className="flex justify-end">
                  <button
                    onClick={() => void handleSubmitPerformance()}
                    disabled={!performanceText.trim() || submitting}
                    className="flex items-center gap-2 rounded-xl bg-pink-600 px-6 py-3 font-bold text-white hover:bg-pink-500 disabled:opacity-40"
                  >
                    {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    Submit Performance
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PERFORM -- My turn, submitted */}
          {phase === 'PERFORM' && isMyTurn && hasSubmittedPerformance && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-900/50">
                <Mic className="size-8 text-emerald-400" />
              </div>
              <p className="text-lg font-bold text-white">Performance Submitted!</p>
              <p className="text-sm text-gray-400">Others will rate you shortly...</p>
            </div>
          )}

          {/* PERFORM -- Watching someone else */}
          {phase === 'PERFORM' && !isMyTurn && (
            <div className="space-y-6">
              <div className="rounded-xl bg-gray-900 p-4 text-center">
                <p className="text-sm text-gray-500">{currentPerformer?.name} is performing...</p>
                <p className="mt-1 text-xs text-gray-600">Turn {turnNumber} of {totalTurns}</p>
              </div>

              {/* Scenario reminder */}
              <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">Scenario</p>
                <p className="text-sm leading-relaxed text-gray-400">{scenario}</p>
              </div>

              {submittedPerformanceText ? (
                <div className="rounded-xl border border-pink-500/20 bg-pink-950/30 p-4">
                  <p className="mb-1 text-xs font-bold text-pink-400">{currentPerformer?.name}'s Response:</p>
                  <p className="whitespace-pre-wrap text-sm text-gray-300">{submittedPerformanceText}</p>
                </div>
              ) : (
                <p className="text-center text-sm text-gray-500">Waiting for their response...</p>
              )}
            </div>
          )}

          {/* RATE */}
          {phase === 'RATE' && !isRatingMyself && !hasRated && (
            <div className="space-y-6">
              <h3 className="text-center text-lg font-extrabold text-white">Rate {ratingPerformer?.name}'s Performance</h3>

              {/* Performance text */}
              <div className="rounded-xl border border-pink-500/20 bg-pink-950/30 p-4">
                <p className="mb-1 text-xs font-bold text-pink-400">{ratingPerformer?.name}'s Response:</p>
                <p className="whitespace-pre-wrap text-sm text-gray-300">{ratingPerformance}</p>
              </div>

              {/* Rating sliders */}
              <div className="space-y-4 rounded-xl bg-gray-900 p-4">
                <StarRating label="Empathy" value={empathyRating} onChange={setEmpathyRating} />
                <StarRating label="Accuracy" value={accuracyRating} onChange={setAccuracyRating} />
                <StarRating label="Professionalism" value={professionalismRating} onChange={setProfessionalismRating} />
              </div>

              <button
                onClick={() => void handleSubmitRating()}
                disabled={empathyRating === 0 || accuracyRating === 0 || professionalismRating === 0}
                className="w-full rounded-xl bg-pink-600 py-3 font-bold text-white hover:bg-pink-500 disabled:opacity-40"
              >
                Submit Rating
              </button>
            </div>
          )}

          {/* RATE -- waiting (rated or own performance) */}
          {phase === 'RATE' && (isRatingMyself || hasRated) && (
            <div className="text-center">
              <p className="text-lg font-bold text-white">
                {isRatingMyself ? 'Others are rating your performance...' : 'Rating submitted!'}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {raterCount > 0 && `${raterCount}/${totalRaters} ratings in`}
              </p>
            </div>
          )}

          {/* DEBRIEF */}
          {phase === 'DEBRIEF' && debriefResults.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-center text-xl font-black text-white">Debrief</h3>

              {/* Scenario reminder */}
              <div className="rounded-xl border border-gray-700 bg-gray-900 p-3">
                <p className="text-xs text-gray-500 line-clamp-2">{scenario}</p>
              </div>

              {/* Results cards */}
              {[...debriefResults].sort((a, b) => b.overall - a.overall).map((r, i) => (
                <div
                  key={r.userId}
                  className={`rounded-xl border p-4 ${r.userId === currentUser?.id ? 'border-pink-500/50 bg-pink-950/30' : 'border-gray-700 bg-gray-900'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{['1st', '2nd', '3rd'][i] ?? `${i + 1}th`}</span>
                      <span className="font-bold text-white">{r.name}</span>
                      {r.userId === currentUser?.id && <span className="text-xs text-pink-400">(you)</span>}
                    </div>
                    <div className="flex items-center gap-1 text-pink-400">
                      <Star className="size-4 fill-pink-400" />
                      <span className="font-bold">{r.overall}/5</span>
                    </div>
                  </div>

                  {/* Dimension scores */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[
                      { label: 'Empathy', value: r.empathy },
                      { label: 'Accuracy', value: r.accuracy },
                      { label: 'Professionalism', value: r.professionalism },
                    ].map((d) => (
                      <div key={d.label} className="rounded-lg bg-black/30 p-2 text-center">
                        <p className="text-xs text-gray-500">{d.label}</p>
                        <p className="text-sm font-bold text-white">{d.value}/5</p>
                      </div>
                    ))}
                  </div>

                  {/* Sandy coaching */}
                  {r.coaching && (
                    <div className="mt-3 rounded-lg bg-pink-900/20 p-2">
                      <p className="text-xs text-pink-300 italic">Sandy: {r.coaching}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* COMPLETE */}
          {phase === 'COMPLETE' && (
            <div className="space-y-6 text-center">
              <Mic className="mx-auto size-16 text-pink-400" />
              <h2 className="text-3xl font-black text-white">Improv Complete!</h2>
              <p className="text-gray-400">Practice makes progress -- every performance builds confidence for the real thing.</p>
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
            <span className="mr-1.5 font-bold text-pink-300">Sandy:</span>
            {sandyMessages[sandyMessages.length - 1]}
          </p>
        </div>
      )}
    </div>
  )
}
