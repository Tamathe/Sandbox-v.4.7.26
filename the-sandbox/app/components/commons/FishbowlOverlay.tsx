'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Send, CircleDot, Users, Clock, Loader2, Hand, MessageSquare, ArrowRightLeft } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface FishbowlOverlayProps {
  roomId: string
  onClose: () => void
}

interface CircleMember {
  userId: string
  name: string
}

interface Annotation {
  authorId: string
  authorName: string
  text: string
  timestamp: number
}

interface Swap {
  taggedIn: string
  taggedInName: string
  taggedOut: string
  taggedOutName: string
}

export default function FishbowlOverlay({ roomId, onClose }: FishbowlOverlayProps) {
  const { currentUser } = useAuth()
  const headers = { 'x-demo-user-email': currentUser.email }
  const annotationEndRef = useRef<HTMLDivElement>(null)

  // Room state
  const [phase, setPhase] = useState<'LOBBY' | 'ASSIGN' | 'DISCUSS' | 'ROTATE' | 'SYNTHESIS' | 'COMPLETE'>('LOBBY')
  const [currentRound, setCurrentRound] = useState(0)
  const [totalRounds, setTotalRounds] = useState(3)
  const [totalParticipants, setTotalParticipants] = useState(0)

  // Circle state
  const [innerCircle, setInnerCircle] = useState<CircleMember[]>([])
  const [outerCircle, setOuterCircle] = useState<CircleMember[]>([])
  const [isInnerCircle, setIsInnerCircle] = useState(false)

  // Discussion state
  const [discussPrompt, setDiscussPrompt] = useState('')
  const [discussTimeMs, setDiscussTimeMs] = useState(300000)
  const [timeLeft, setTimeLeft] = useState(0)

  // Annotation state
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [annotationText, setAnnotationText] = useState('')
  const [submittingAnnotation, setSubmittingAnnotation] = useState(false)

  // Tag-in state
  const [hasRequestedTagIn, setHasRequestedTagIn] = useState(false)
  const [tagInQueueLength, setTagInQueueLength] = useState(0)

  // Rotation state
  const [swaps, setSwaps] = useState<Swap[]>([])

  // Synthesis
  const [synthesis, setSynthesis] = useState('')
  const [totalAnnotations, setTotalAnnotations] = useState(0)

  // Sandy messages
  const [sandyMessages, setSandyMessages] = useState<string[]>([])

  // Host state
  const [isHost, setIsHost] = useState(false)

  // Initial room fetch
  useEffect(() => {
    fetch(`/api/commons/${roomId}`, { headers })
      .then((r) => r.json())
      .then((room) => {
        setIsHost(room.hostId === currentUser?.id)
        setTotalParticipants(room.participants.length)
        const phaseMap: Record<string, typeof phase> = {
          LOBBY: 'LOBBY', COUNTDOWN: 'ASSIGN', QUESTION: 'DISCUSS',
          REVEAL: 'ROTATE', SCOREBOARD: 'SYNTHESIS', COMPLETE: 'COMPLETE',
        }
        setPhase(phaseMap[room.phase] || 'LOBBY')
      })
      .catch(() => {})
  }, [roomId])

  // SSE subscription
  useEffect(() => {
    const es = new EventSource(`/api/commons/${roomId}/stream`)

    es.addEventListener('fishbowl_assigned', (e) => {
      const data = JSON.parse(e.data)
      setInnerCircle(data.innerCircle)
      setOuterCircle(data.outerCircle)
      setTotalRounds(data.totalRounds)
      setIsInnerCircle(data.innerCircle.some((m: CircleMember) => m.userId === currentUser?.id))
      setPhase('ASSIGN')
    })

    es.addEventListener('discussion_round', (e) => {
      const data = JSON.parse(e.data)
      setCurrentRound(data.round)
      setTotalRounds(data.totalRounds)
      setDiscussPrompt(data.prompt)
      setDiscussTimeMs(data.discussTimeMs)
      setTimeLeft(Math.round(data.discussTimeMs / 1000))
      setInnerCircle(data.innerCircle)
      setOuterCircle(data.outerCircle)
      setIsInnerCircle(data.innerCircle.some((m: CircleMember) => m.userId === currentUser?.id))
      setHasRequestedTagIn(false)
      setTagInQueueLength(0)
      setPhase('DISCUSS')
    })

    es.addEventListener('annotation_added', (e) => {
      const data = JSON.parse(e.data)
      setAnnotations((prev) => [...prev, data])
    })

    es.addEventListener('tag_in_requested', (e) => {
      const data = JSON.parse(e.data)
      setTagInQueueLength(data.queueLength)
    })

    es.addEventListener('rotation', (e) => {
      const data = JSON.parse(e.data)
      setSwaps(data.swaps)
      setInnerCircle(data.innerCircle)
      setOuterCircle(data.outerCircle)
      setIsInnerCircle(data.innerCircle.some((m: CircleMember) => m.userId === currentUser?.id))
      setPhase('ROTATE')
    })

    es.addEventListener('synthesis', (e) => {
      const data = JSON.parse(e.data)
      setSynthesis(data.synthesis)
      setTotalAnnotations(data.totalAnnotations)
      setPhase('SYNTHESIS')
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
        LOBBY: 'LOBBY', ASSIGN: 'ASSIGN', DISCUSS: 'DISCUSS',
        ROTATE: 'ROTATE', SYNTHESIS: 'SYNTHESIS', COMPLETE: 'COMPLETE',
      }
      if (phaseMap[data.phase]) setPhase(phaseMap[data.phase])
    })

    es.addEventListener('complete', () => {
      setPhase('COMPLETE')
    })

    return () => es.close()
  }, [roomId])

  // Auto-scroll annotations
  useEffect(() => {
    annotationEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [annotations])

  // Countdown timer
  useEffect(() => {
    if (phase !== 'DISCUSS' || timeLeft <= 0) return
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

  // Handle submit annotation
  const handleAnnotation = async () => {
    if (!annotationText.trim() || submittingAnnotation) return
    setSubmittingAnnotation(true)
    try {
      await fetch(`/api/commons/${roomId}/annotate`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: annotationText.trim() }),
      })
      setAnnotationText('')
    } finally {
      setSubmittingAnnotation(false)
    }
  }

  // Handle tag-in request
  const handleTagIn = async () => {
    if (hasRequestedTagIn) return
    try {
      await fetch(`/api/commons/${roomId}/tag-in`, {
        method: 'POST',
        headers,
      })
      setHasRequestedTagIn(true)
    } catch { /* ignore */ }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between bg-violet-900 px-6 py-4">
        <div className="flex items-center gap-3">
          <CircleDot className="size-6 text-violet-300" />
          <div>
            <h2 className="text-lg font-extrabold text-white">Fishbowl</h2>
            <p className="text-sm text-violet-300">
              {phase === 'LOBBY' && `${totalParticipants} joined`}
              {phase === 'ASSIGN' && 'Assigning circles...'}
              {phase === 'DISCUSS' && `Round ${currentRound}/${totalRounds} — ${formatTime(timeLeft)}`}
              {phase === 'ROTATE' && 'Rotating...'}
              {phase === 'SYNTHESIS' && 'Sandy\'s synthesis'}
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
              <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-violet-900/50">
                <CircleDot className="size-10 text-violet-400" />
              </div>
              <h3 className="text-2xl font-black text-white">Fishbowl Discussion</h3>
              <p className="text-gray-400">An inner circle discusses while the outer circle observes and annotates. Members can "tag in" to swap into the inner circle. Sandy synthesizes everything at the end.</p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Users className="size-4" />
                <span>{totalParticipants} participants</span>
                <span className="mx-2">--</span>
                <Clock className="size-4" />
                <span>5 min per round</span>
              </div>
              {isHost && (
                <button onClick={handleStart} className="rounded-xl bg-violet-600 px-8 py-3 font-bold text-white hover:bg-violet-500">
                  Start Fishbowl
                </button>
              )}
              {!isHost && (
                <p className="text-sm text-gray-500">Waiting for host to start...</p>
              )}
            </div>
          )}

          {/* ASSIGN — showing circle assignments */}
          {phase === 'ASSIGN' && (
            <div className="space-y-6">
              <h3 className="text-center text-xl font-black text-white">Circle Assignments</h3>

              {/* Your role */}
              <div className={`rounded-2xl border p-4 text-center ${isInnerCircle ? 'border-violet-400 bg-violet-950/60' : 'border-gray-600 bg-gray-900'}`}>
                <p className="text-lg font-bold text-white">
                  You are in the {isInnerCircle ? 'Inner Circle' : 'Outer Circle'}
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  {isInnerCircle ? 'You will discuss Sandy\'s prompts with the group.' : 'Observe, annotate, and request to tag in.'}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Inner circle */}
                <div className="rounded-xl border border-violet-500/30 bg-violet-950/30 p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-violet-400">Inner Circle</p>
                  {innerCircle.map((m) => (
                    <div key={m.userId} className="flex items-center gap-2 py-1">
                      <div className="size-2 rounded-full bg-violet-400" />
                      <span className={`text-sm ${m.userId === currentUser?.id ? 'font-bold text-white' : 'text-gray-300'}`}>{m.name}</span>
                    </div>
                  ))}
                </div>

                {/* Outer circle */}
                <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Outer Circle</p>
                  {outerCircle.map((m) => (
                    <div key={m.userId} className="flex items-center gap-2 py-1">
                      <div className="size-2 rounded-full bg-gray-500" />
                      <span className={`text-sm ${m.userId === currentUser?.id ? 'font-bold text-white' : 'text-gray-300'}`}>{m.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-center text-sm text-gray-500">First discussion round starting shortly...</p>
            </div>
          )}

          {/* DISCUSS — active discussion */}
          {phase === 'DISCUSS' && (
            <div className="space-y-6">
              {/* Round progress + timer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalRounds }, (_, i) => (
                    <div key={i} className={`size-3 rounded-full ${i + 1 < currentRound ? 'bg-violet-500' : i + 1 === currentRound ? 'bg-violet-400 ring-2 ring-violet-400/50' : 'bg-gray-700'}`} />
                  ))}
                </div>
                <div className="flex items-center gap-2 text-sm text-violet-400">
                  <Clock className="size-4" />
                  <span>{formatTime(timeLeft)}</span>
                </div>
              </div>

              {/* Your role indicator */}
              <div className={`rounded-lg px-4 py-2 text-center text-sm font-bold ${isInnerCircle ? 'bg-violet-900/50 text-violet-300' : 'bg-gray-800 text-gray-400'}`}>
                {isInnerCircle ? 'You are in the Inner Circle -- discuss!' : 'You are in the Outer Circle -- observe & annotate'}
              </div>

              {/* Discussion prompt */}
              <div className="rounded-2xl border border-violet-500/30 bg-violet-950/50 p-5">
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-violet-400">Discussion Prompt</p>
                <p className="text-lg leading-relaxed text-gray-200">{discussPrompt}</p>
              </div>

              {/* Circle members side by side */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-violet-500/20 bg-violet-950/20 p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-violet-400">Inner Circle</p>
                  {innerCircle.map((m) => (
                    <div key={m.userId} className="flex items-center gap-2 py-0.5">
                      <div className="size-2 rounded-full bg-violet-400" />
                      <span className={`text-xs ${m.userId === currentUser?.id ? 'font-bold text-white' : 'text-gray-400'}`}>{m.name}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-gray-700 bg-gray-900 p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Outer Circle</p>
                  {outerCircle.map((m) => (
                    <div key={m.userId} className="flex items-center gap-2 py-0.5">
                      <div className="size-2 rounded-full bg-gray-500" />
                      <span className={`text-xs ${m.userId === currentUser?.id ? 'font-bold text-white' : 'text-gray-400'}`}>{m.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tag-in button (outer circle only) */}
              {!isInnerCircle && (
                <button
                  onClick={handleTagIn}
                  disabled={hasRequestedTagIn}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-500/30 bg-violet-950/30 px-4 py-3 font-bold text-violet-300 hover:bg-violet-950/50 disabled:opacity-40"
                >
                  <Hand className="size-4" />
                  {hasRequestedTagIn ? 'Tag-in requested -- you\'ll swap next rotation' : 'Request to Tag In'}
                  {tagInQueueLength > 0 && (
                    <span className="ml-1 rounded-full bg-violet-600 px-2 py-0.5 text-xs text-white">{tagInQueueLength} in queue</span>
                  )}
                </button>
              )}

              {/* Annotations feed */}
              <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                  <MessageSquare className="mr-1 inline size-3" />
                  Annotations ({annotations.length})
                </p>
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {annotations.length === 0 && (
                    <p className="text-sm text-gray-600">No annotations yet...</p>
                  )}
                  {annotations.map((a, i) => (
                    <div key={i} className="rounded-lg bg-gray-800 px-3 py-2">
                      <span className="text-xs font-bold text-violet-400">{a.authorName}</span>
                      <p className="text-sm text-gray-300">{a.text}</p>
                    </div>
                  ))}
                  <div ref={annotationEndRef} />
                </div>

                {/* Annotation input (outer circle only) */}
                {!isInnerCircle && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={annotationText}
                      onChange={(e) => setAnnotationText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAnnotation() }}
                      placeholder="Add an annotation..."
                      className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
                      disabled={submittingAnnotation}
                    />
                    <button
                      onClick={handleAnnotation}
                      disabled={!annotationText.trim() || submittingAnnotation}
                      className="rounded-lg bg-violet-600 px-3 py-2 text-white hover:bg-violet-500 disabled:opacity-40"
                    >
                      {submittingAnnotation ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ROTATE — transition */}
          {phase === 'ROTATE' && (
            <div className="space-y-6 text-center">
              <ArrowRightLeft className="mx-auto size-8 text-violet-400" />
              <p className="text-lg text-gray-300">Rotating circles...</p>
              {swaps.length > 0 && (
                <div className="space-y-2">
                  {swaps.map((s, i) => (
                    <div key={i} className="rounded-xl bg-violet-950/30 px-4 py-2 text-sm text-violet-300">
                      {s.taggedInName} swaps in for {s.taggedOutName}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-sm text-gray-500">Next round starting shortly...</p>
            </div>
          )}

          {/* SYNTHESIS */}
          {(phase === 'SYNTHESIS' || phase === 'COMPLETE') && synthesis && (
            <div className="space-y-6">
              <h3 className="text-center text-xl font-black text-white">Fishbowl Synthesis</h3>

              <div className="rounded-2xl border border-violet-500/30 bg-violet-950/50 p-6">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-violet-400">Sandy's Synthesis</p>
                <div className="whitespace-pre-wrap leading-relaxed text-gray-200">{synthesis}</div>
              </div>

              <div className="rounded-xl bg-gray-900 p-4 text-center text-sm text-gray-400">
                {totalRounds} rounds -- {totalAnnotations} annotations from observers
              </div>

              {/* Show all annotations at the end */}
              {annotations.length > 0 && (
                <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">All Annotations</p>
                  <div className="max-h-60 space-y-2 overflow-y-auto">
                    {annotations.map((a, i) => (
                      <div key={i} className="rounded-lg bg-gray-800 px-3 py-2">
                        <span className="text-xs font-bold text-violet-400">{a.authorName}</span>
                        <p className="text-sm text-gray-300">{a.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* COMPLETE close button */}
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
