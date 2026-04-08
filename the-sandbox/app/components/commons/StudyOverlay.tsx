'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, BookOpen, Coffee, Hand, Play, Users } from 'lucide-react'
import ShareRoomButton from './ShareRoomButton'
import { useAuth } from '../../lib/auth-context'

interface StudyOverlayProps {
  roomId: string
  onClose: () => void
}

type StudyPhase = 'LOBBY' | 'FOCUS' | 'BREAK' | 'COMPLETE'

interface RoomState {
  phase: StudyPhase
  participants: Array<{ userId: string; name: string }>
  title: string
  hostId: string
  currentRound: number
  config: { focusMinutes: number; breakMinutes: number; totalCycles: number; topic?: string }
}

export default function StudyOverlay({ roomId, onClose }: StudyOverlayProps) {
  const { currentUser } = useAuth()
  const headers = { 'x-demo-user-email': currentUser.email }

  const [room, setRoom] = useState<RoomState | null>(null)
  const [phase, setPhase] = useState<StudyPhase>('LOBBY')
  const [timeLeft, setTimeLeft] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [cycle, setCycle] = useState(1)
  const [totalCycles, setTotalCycles] = useState(4)
  const [sandyMessages, setSandyMessages] = useState<string[]>([])
  const [stuckOpen, setStuckOpen] = useState(false)
  const [stuckQuestion, setStuckQuestion] = useState('')
  const [connected, setConnected] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const endsAtRef = useRef<number>(0)

  // ── Load initial state ───────────────────────────────────────────────────

  useEffect(() => {
    fetch(`/api/commons/${roomId}`, { headers })
      .then((r) => r.json())
      .then((data) => {
        const config = data.config ?? {}
        setRoom({
          phase: mapPhase(data.phase),
          participants: data.participants ?? [],
          title: data.title,
          hostId: data.hostId,
          currentRound: data.currentRound,
          config: {
            focusMinutes: config.focusMinutes ?? 25,
            breakMinutes: config.breakMinutes ?? 5,
            totalCycles: config.totalCycles ?? 4,
            topic: config.topic,
          },
        })
        setPhase(mapPhase(data.phase))
        setTotalCycles(config.totalCycles ?? 4)
      })
      .catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId])

  // ── SSE stream ───────────────────────────────────────────────────────────

  useEffect(() => {
    const es = new EventSource(`/api/commons/${roomId}/stream`)

    es.addEventListener('connected', () => setConnected(true))

    es.addEventListener('player_joined', (e) => {
      const data = JSON.parse(e.data)
      setRoom((prev) => {
        if (!prev) return prev
        const exists = prev.participants.some((p) => p.userId === data.userId)
        if (exists) return prev
        return { ...prev, participants: [...prev.participants, { userId: data.userId, name: data.name }] }
      })
    })

    es.addEventListener('phase_changed', (e) => {
      const data = JSON.parse(e.data)
      setPhase(data.phase as StudyPhase)
    })

    es.addEventListener('timer_started', (e) => {
      const data = JSON.parse(e.data)
      const durationMs = data.durationMs as number
      const endsAt = new Date(data.endsAt as string).getTime()
      endsAtRef.current = endsAt
      setPhase(data.phase as StudyPhase)
      setCycle(data.cycle as number)
      setTotalCycles(data.totalCycles as number)
      setTotalDuration(durationMs)
      setTimeLeft(durationMs)

      // Start local countdown
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        const remaining = Math.max(0, endsAtRef.current - Date.now())
        setTimeLeft(remaining)
        if (remaining <= 0 && timerRef.current) clearInterval(timerRef.current)
      }, 200)
    })

    es.addEventListener('sandy_says', (e) => {
      const data = JSON.parse(e.data)
      setSandyMessages((prev) => [...prev.slice(-4), data.message])
    })

    es.addEventListener('stuck_request', (e) => {
      const data = JSON.parse(e.data)
      setSandyMessages((prev) => [...prev.slice(-4), `🙋 ${data.name}: ${data.question}`])
    })

    es.addEventListener('complete', () => {
      setPhase('COMPLETE')
      if (timerRef.current) clearInterval(timerRef.current)
    })

    es.onerror = () => setConnected(false)

    return () => {
      es.close()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [roomId])

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleStart = useCallback(async () => {
    await fetch(`/api/commons/${roomId}/start`, { method: 'POST', headers })
  }, [roomId, headers])

  const handleStuck = useCallback(async () => {
    await fetch(`/api/commons/${roomId}/stuck`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: stuckQuestion }),
    })
    setStuckOpen(false)
    setStuckQuestion('')
  }, [roomId, headers, stuckQuestion])

  if (!room) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  // ── Timer formatting ─────────────────────────────────────────────────────

  const minutes = Math.floor(timeLeft / 60000)
  const seconds = Math.floor((timeLeft % 60000) / 1000)
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`
  const progress = totalDuration > 0 ? ((totalDuration - timeLeft) / totalDuration) * 100 : 0

  const isFocus = phase === 'FOCUS'
  const isBreak = phase === 'BREAK'
  const bgGradient = isFocus
    ? 'from-slate-900 to-slate-800'
    : isBreak
      ? 'from-emerald-900 to-emerald-800'
      : 'from-[#001a52] to-[#0033A0]'

  return (
    <div className={`fixed inset-0 z-50 flex flex-col bg-gradient-to-b ${bgGradient}`}>
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Back to Chat
        </button>
        <h2 className="text-sm font-bold text-white">{room.title}</h2>
        <div className="flex items-center gap-2">
          <ShareRoomButton roomId={roomId} roomType="STUDY" title={room?.title ?? ''} />
          <span className="text-xs text-white/50">
            Cycle {cycle}/{totalCycles}
          </span>
          {!connected && (
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-300">Reconnecting...</span>
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        {/* LOBBY */}
        {phase === 'LOBBY' && (
          <div className="text-center">
            <BookOpen className="mx-auto mb-4 size-16 text-white/30" />
            <h3 className="mb-2 text-2xl font-black text-white">Study Session</h3>
            <p className="mb-1 text-white/60">{room.config.focusMinutes}min focus · {room.config.breakMinutes}min break · {room.config.totalCycles} cycles</p>
            {room.config.topic && <p className="mb-4 text-sm text-white/40">Topic: {room.config.topic}</p>}

            {/* Participants */}
            <div className="mb-8 flex flex-wrap justify-center gap-2">
              {room.participants.map((p) => (
                <div key={p.userId} className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
                  <div className="flex size-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">
                    {p.name.charAt(0)}
                  </div>
                  <span className="text-xs font-medium text-white">{p.name}</span>
                </div>
              ))}
            </div>

            {room.hostId === currentUser?.id && (
              <button
                type="button"
                onClick={() => void handleStart()}
                className="rounded-xl bg-white px-8 py-3 text-sm font-extrabold text-slate-900 transition-transform hover:scale-105"
              >
                Start Session
              </button>
            )}
            {room.hostId !== currentUser?.id && (
              <p className="text-sm text-white/40">Waiting for the host to start...</p>
            )}
          </div>
        )}

        {/* FOCUS / BREAK — Timer */}
        {(isFocus || isBreak) && (
          <div className="text-center">
            {/* Phase label */}
            <div className={`mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold ${
              isFocus ? 'bg-white/10 text-white' : 'bg-emerald-400/20 text-emerald-300'
            }`}>
              {isFocus ? <BookOpen className="size-4" /> : <Coffee className="size-4" />}
              {isFocus ? 'Focus Time' : 'Break Time'}
            </div>

            {/* Big timer */}
            <div className="relative mx-auto mb-8 flex size-64 items-center justify-center">
              {/* Progress ring */}
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 256 256">
                <circle
                  cx="128" cy="128" r="120"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="8"
                />
                <circle
                  cx="128" cy="128" r="120"
                  fill="none"
                  stroke={isFocus ? 'rgba(255,255,255,0.6)' : 'rgba(52,211,153,0.6)'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 120}`}
                  strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress / 100)}`}
                  className="transition-all duration-200"
                />
              </svg>
              <span className="text-6xl font-black tabular-nums text-white">{timeStr}</span>
            </div>

            {/* Presence */}
            <div className="mb-6 flex items-center justify-center gap-2">
              <Users className="size-4 text-white/40" />
              <div className="flex -space-x-1">
                {room.participants.slice(0, 8).map((p) => (
                  <div
                    key={p.userId}
                    className="flex size-7 items-center justify-center rounded-full border-2 border-transparent bg-white/20 text-xs font-bold text-white"
                    title={p.name}
                  >
                    {p.name.charAt(0)}
                  </div>
                ))}
              </div>
              <span className="text-sm text-white/50">
                {room.participants.length} studying together
              </span>
            </div>

            {/* Stuck? button (only during focus) */}
            {isFocus && (
              <div>
                {!stuckOpen ? (
                  <button
                    type="button"
                    onClick={() => setStuckOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Hand className="size-4" />
                    Stuck? Ask for help
                  </button>
                ) : (
                  <div className="mx-auto flex max-w-sm gap-2">
                    <input
                      type="text"
                      value={stuckQuestion}
                      onChange={(e) => setStuckQuestion(e.target.value)}
                      placeholder="What are you stuck on?"
                      className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') void handleStuck() }}
                    />
                    <button
                      type="button"
                      onClick={() => void handleStuck()}
                      className="rounded-xl bg-white/20 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/30"
                    >
                      Send
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* COMPLETE */}
        {phase === 'COMPLETE' && (
          <div className="text-center">
            <div className="mx-auto mb-4 text-6xl">🎉</div>
            <h2 className="mb-2 text-3xl font-black text-white">Session Complete!</h2>
            <p className="mb-2 text-lg text-white/60">
              {room.config.totalCycles} cycles · {room.config.totalCycles * room.config.focusMinutes} minutes of focus
            </p>
            <p className="mb-8 text-sm text-white/40">
              {room.participants.length} people studied together
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white px-8 py-3 text-sm font-extrabold text-slate-900 transition-transform hover:scale-105"
            >
              Back to Chat
            </button>
          </div>
        )}
      </div>

      {/* Sandy messages */}
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

function mapPhase(dbPhase: string): StudyPhase {
  // Map DB phases to study phases
  switch (dbPhase) {
    case 'LOBBY': return 'LOBBY'
    case 'QUESTION': return 'FOCUS'   // We reuse QUESTION phase for FOCUS
    case 'REVEAL': return 'BREAK'     // We reuse REVEAL phase for BREAK
    case 'COMPLETE': return 'COMPLETE'
    case 'FOCUS': return 'FOCUS'      // Direct mapping from SSE events
    case 'BREAK': return 'BREAK'
    default: return 'LOBBY'
  }
}
