'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, GraduationCap, Send, Star, Users } from 'lucide-react'
import ShareRoomButton from './ShareRoomButton'
import { useAuth } from '../../lib/auth-context'

interface TeachBackOverlayProps {
  roomId: string
  onClose: () => void
}

interface Assignment {
  userId: string
  name: string
  concept: string
}

interface TeachBackResult {
  userId: string
  name: string
  concept: string
  peerScore: number
  aiScore: number
  aiFeedback: string
  combinedScore: number
  teaching: string
}

type TBPhase = 'LOBBY' | 'ASSIGN' | 'TEACH' | 'RATE' | 'RESULTS' | 'COMPLETE'

export default function TeachBackOverlay({ roomId, onClose }: TeachBackOverlayProps) {
  const { currentUser } = useAuth()
  const headers = { 'x-demo-user-email': currentUser.email }

  const [phase, setPhase] = useState<TBPhase>('LOBBY')
  const [title, setTitle] = useState('')
  const [hostId, setHostId] = useState('')
  const [assessmentMode, setAssessmentMode] = useState(false)
  const [participants, setParticipants] = useState<Array<{ userId: string; name: string }>>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [currentTeacher, setCurrentTeacher] = useState<{ userId: string; name: string; concept: string } | null>(null)
  const [turnNumber, setTurnNumber] = useState(0)
  const [totalTurns, setTotalTurns] = useState(0)
  const [teachingText, setTeachingText] = useState('')
  const [submittedTeaching, setSubmittedTeaching] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [hasRated, setHasRated] = useState(false)
  const [results, setResults] = useState<TeachBackResult[]>([])
  const [sandyMessages, setSandyMessages] = useState<string[]>([])
  const [connected, setConnected] = useState(false)

  // My concept
  const myAssignment = assignments.find((a) => a.userId === currentUser?.id)

  // Load initial state
  useEffect(() => {
    fetch(`/api/commons/${roomId}`, { headers })
      .then((r) => r.json())
      .then((data) => {
        setTitle(data.title)
        setHostId(data.hostId)
        setAssessmentMode(Boolean(data.assessmentMode))
        setParticipants(data.participants ?? [])
      })
      .catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId])

  // SSE stream
  useEffect(() => {
    const es = new EventSource(`/api/commons/${roomId}/stream`)
    es.addEventListener('connected', () => setConnected(true))

    es.addEventListener('player_joined', (e) => {
      const data = JSON.parse(e.data)
      setParticipants((prev) => prev.some((p) => p.userId === data.userId) ? prev : [...prev, { userId: data.userId, name: data.name }])
    })

    es.addEventListener('phase_changed', (e) => {
      const data = JSON.parse(e.data)
      setPhase(data.phase as TBPhase)
    })

    es.addEventListener('concepts_assigned', (e) => {
      const data = JSON.parse(e.data)
      setAssignments(data.assignments)
      setPhase('ASSIGN')
    })

    es.addEventListener('teach_turn', (e) => {
      const data = JSON.parse(e.data)
      setCurrentTeacher({ userId: data.teacherUserId, name: data.teacherName, concept: data.concept })
      setTurnNumber(data.turnNumber)
      setTotalTurns(data.totalTurns)
      setSubmittedTeaching(null)
      setTeachingText('')
      setRating(0)
      setHasRated(false)
      setPhase('TEACH')
    })

    es.addEventListener('teaching_submitted', (e) => {
      const data = JSON.parse(e.data)
      setSubmittedTeaching(data.explanation)
    })

    es.addEventListener('rate_turn', () => {
      setPhase('RATE')
    })

    es.addEventListener('teachback_results', (e) => {
      const data = JSON.parse(e.data)
      setResults(data.results)
      setPhase('RESULTS')
    })

    es.addEventListener('sandy_says', (e) => {
      const data = JSON.parse(e.data)
      setSandyMessages((prev) => [...prev.slice(-4), data.message])
    })

    es.addEventListener('complete', () => setPhase('COMPLETE'))
    es.onerror = () => setConnected(false)

    return () => es.close()
  }, [roomId])

  const handleStart = useCallback(async () => {
    await fetch(`/api/commons/${roomId}/start`, { method: 'POST', headers })
  }, [roomId, headers])

  const handleSubmitTeaching = useCallback(async () => {
    if (!teachingText.trim()) return
    await fetch(`/api/commons/${roomId}/teach`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ explanation: teachingText.trim() }),
    })
  }, [roomId, headers, teachingText])

  const handleSubmitRating = useCallback(async (score: number) => {
    setRating(score)
    setHasRated(true)
    await fetch(`/api/commons/${roomId}/rate`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ score }),
    })
  }, [roomId, headers])

  const isMyTurn = currentTeacher?.userId === currentUser?.id

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-indigo-950 to-indigo-900">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <button type="button" onClick={onClose} className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white">
          <ArrowLeft className="size-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-white">{title}</h2>
          {assessmentMode && (
            <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-200">
              Assessment Mode
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-white/50">
          <ShareRoomButton roomId={roomId} roomType="TEACHBACK" title={title} />
          {turnNumber > 0 && <span>Turn {turnNumber}/{totalTurns}</span>}
          {!connected && <span className="text-red-300">Reconnecting...</span>}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-6">
        {/* LOBBY */}
        {phase === 'LOBBY' && (
          <div className="text-center">
            <GraduationCap className="mx-auto mb-4 size-16 text-white/30" />
            <h3 className="mb-2 text-2xl font-black text-white">Teach-Back</h3>
            <p className="mb-2 text-white/50">"If you can teach it, you know it."</p>
            {assessmentMode && (
              <p className="mb-6 text-sm text-amber-200/80">
                This room is linked to a formal assignment and will generate teach-back evidence for grading.
              </p>
            )}
            <div className="mb-8 flex flex-wrap justify-center gap-2">
              {participants.map((p) => (
                <div key={p.userId} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white">{p.name}</div>
              ))}
            </div>
            {hostId === currentUser?.id && participants.length >= 2 && (
              <button type="button" onClick={() => void handleStart()} className="rounded-xl bg-white px-8 py-3 text-sm font-extrabold text-indigo-900 hover:scale-105">
                Start Teach-Back
              </button>
            )}
            {hostId === currentUser?.id && participants.length < 2 && (
              <p className="text-sm text-white/40">Need at least 2 people to start</p>
            )}
          </div>
        )}

        {/* ASSIGN */}
        {phase === 'ASSIGN' && (
          <div className="w-full max-w-md text-center">
            <h3 className="mb-4 text-xl font-extrabold text-white">Your Assignments</h3>
            <div className="space-y-3">
              {assignments.map((a) => (
                <div key={a.userId} className={`rounded-xl p-4 ${a.userId === currentUser?.id ? 'border-2 border-amber-400 bg-white/10' : 'bg-white/5'}`}>
                  <div className="text-xs text-white/50">{a.name}{a.userId === currentUser?.id && ' (you)'}</div>
                  <div className="mt-1 text-sm font-bold text-white">{a.concept}</div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-white/40">Starting soon — prepare your explanation!</p>
          </div>
        )}

        {/* TEACH — My turn */}
        {phase === 'TEACH' && isMyTurn && !submittedTeaching && (
          <div className="w-full max-w-lg">
            <div className="mb-4 rounded-xl bg-amber-500/20 p-4 text-center">
              <p className="text-lg font-black text-amber-300">Your Turn!</p>
              <p className="text-sm text-white/60">Explain: <span className="font-bold text-white">{currentTeacher?.concept}</span></p>
            </div>
            <textarea
              value={teachingText}
              onChange={(e) => setTeachingText(e.target.value)}
              placeholder="Type your explanation here... Pretend you're teaching this to someone who's never heard of it."
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-amber-400 focus:outline-none"
              rows={6}
              autoFocus
            />
            <button
              type="button"
              onClick={() => void handleSubmitTeaching()}
              disabled={!teachingText.trim()}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-white transition-opacity disabled:opacity-40"
            >
              <Send className="size-4" />
              Submit Explanation
            </button>
          </div>
        )}

        {/* TEACH — Watching someone else */}
        {phase === 'TEACH' && !isMyTurn && (
          <div className="w-full max-w-lg text-center">
            <div className="mb-4 rounded-xl bg-white/10 p-6">
              <p className="text-sm text-white/50">{currentTeacher?.name} is explaining:</p>
              <p className="mt-2 text-lg font-bold text-white">{currentTeacher?.concept}</p>
            </div>
            {submittedTeaching ? (
              <div className="rounded-xl bg-white/5 p-4 text-left">
                <p className="mb-1 text-xs font-bold text-white/50">{currentTeacher?.name}'s explanation:</p>
                <p className="whitespace-pre-wrap text-sm text-white/80">{submittedTeaching}</p>
              </div>
            ) : (
              <p className="text-sm text-white/40">Waiting for their explanation...</p>
            )}
            {myAssignment && (
              <div className="mt-4 rounded-lg bg-indigo-800/50 p-3 text-xs text-white/40">
                Your concept: <span className="font-semibold text-white/60">{myAssignment.concept}</span> — start preparing!
              </div>
            )}
          </div>
        )}

        {/* TEACH — Submitted */}
        {phase === 'TEACH' && isMyTurn && submittedTeaching && (
          <div className="text-center">
            <div className="mx-auto mb-4 text-5xl">✅</div>
            <p className="text-lg font-bold text-white">Submitted!</p>
            <p className="text-sm text-white/50">Waiting for the rating phase...</p>
          </div>
        )}

        {/* RATE */}
        {phase === 'RATE' && !isMyTurn && !hasRated && (
          <div className="w-full max-w-md text-center">
            <p className="mb-2 text-sm text-white/50">Rate {currentTeacher?.name}'s explanation of</p>
            <p className="mb-6 text-lg font-bold text-white">"{currentTeacher?.concept}"</p>
            <div className="flex justify-center gap-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => void handleSubmitRating(n)}
                  className="flex size-14 flex-col items-center justify-center rounded-xl bg-white/10 text-white transition-all hover:scale-110 hover:bg-amber-500/30"
                >
                  <Star className={`size-6 ${n <= rating ? 'fill-amber-400 text-amber-400' : ''}`} />
                  <span className="mt-0.5 text-[10px]">{n}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === 'RATE' && (isMyTurn || hasRated) && (
          <div className="text-center">
            <p className="text-lg font-bold text-white">{hasRated ? 'Rating submitted!' : 'Others are rating your explanation...'}</p>
            <p className="mt-1 text-sm text-white/50">Waiting for everyone to finish rating.</p>
          </div>
        )}

        {/* RESULTS */}
        {phase === 'RESULTS' && results.length > 0 && (
          <div className="w-full max-w-lg">
            <h3 className="mb-4 text-center text-xl font-extrabold text-white">Results</h3>
            <div className="space-y-3">
              {[...results].sort((a, b) => b.combinedScore - a.combinedScore).map((r, i) => (
                <div key={r.userId} className={`rounded-xl p-4 ${r.userId === currentUser?.id ? 'border-2 border-amber-400 bg-white/10' : 'bg-white/5'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="mr-2 text-lg">{['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`}</span>
                      <span className="font-bold text-white">{r.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-400">
                      <Star className="size-4 fill-amber-400" />
                      <span className="font-bold">{r.combinedScore.toFixed(1)}/5</span>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-white/50">Concept: {r.concept}</p>
                  {r.aiFeedback && (
                    <p className="mt-1 text-xs text-amber-200/70">Sandy: {r.aiFeedback}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* COMPLETE */}
        {phase === 'COMPLETE' && (
          <div className="text-center">
            <GraduationCap className="mx-auto mb-4 size-16 text-amber-400" />
            <h2 className="mb-2 text-3xl font-black text-white">Teach-Back Complete!</h2>
            <p className="mb-8 text-white/60">"If you can teach it, you know it."</p>
            <button type="button" onClick={onClose} className="rounded-xl bg-white px-8 py-3 text-sm font-extrabold text-indigo-900 hover:scale-105">
              Back to Chat
            </button>
          </div>
        )}
      </div>

      {/* Sandy */}
      {sandyMessages.length > 0 && (
        <div className="border-t border-white/10 bg-white/5 px-6 py-3">
          <p className="text-center text-sm text-white/80">
            <span className="mr-1.5 font-bold text-amber-300">Sandy:</span>
            {sandyMessages[sandyMessages.length - 1]}
          </p>
        </div>
      )}
    </div>
  )
}
