'use client'

import { useState, useEffect } from 'react'
import { X, Users, Clock, Loader2, MessageCircle } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface SpeedMentoringOverlayProps {
  roomId: string
  onClose: () => void
}

interface PairInfo {
  userA: string
  nameA: string
  userB: string
  nameB: string
}

export default function SpeedMentoringOverlay({ roomId, onClose }: SpeedMentoringOverlayProps) {
  const { currentUser } = useAuth()
  const headers = { 'x-demo-user-email': currentUser.email }

  // Room state
  const [phase, setPhase] = useState<'LOBBY' | 'PAIR' | 'SESSION' | 'ROTATE' | 'DEBRIEF' | 'COMPLETE'>('LOBBY')
  const [currentRound, setCurrentRound] = useState(0)
  const [totalRounds, setTotalRounds] = useState(3)
  const [totalParticipants, setTotalParticipants] = useState(0)

  // Session state
  const [prompt, setPrompt] = useState('')
  const [myPartner, setMyPartner] = useState<{ userId: string; name: string } | null>(null)
  const [sessionTimeMs, setSessionTimeMs] = useState(600000)
  const [timeLeft, setTimeLeft] = useState(0)

  // Debrief
  const [debriefSummary, setDebriefSummary] = useState('')

  // Sandy messages
  const [sandyMessages, setSandyMessages] = useState<string[]>([])

  // Host state
  const [isHost, setIsHost] = useState(false)

  // Find partner from pairs list
  const findMyPartner = (pairs: PairInfo[]) => {
    for (const pair of pairs) {
      if (pair.userA === currentUser?.id) return { userId: pair.userB, name: pair.nameB }
      if (pair.userB === currentUser?.id) return { userId: pair.userA, name: pair.nameA }
    }
    return null
  }

  // Initial room fetch
  useEffect(() => {
    fetch(`/api/commons/${roomId}`, { headers })
      .then((r) => r.json())
      .then((room) => {
        setIsHost(room.hostId === currentUser?.id)
        setTotalParticipants(room.participants.length)
        const phaseMap: Record<string, typeof phase> = {
          LOBBY: 'LOBBY', COUNTDOWN: 'PAIR', QUESTION: 'SESSION',
          REVEAL: 'ROTATE', SCOREBOARD: 'DEBRIEF', COMPLETE: 'COMPLETE',
        }
        setPhase(phaseMap[room.phase] || 'LOBBY')
      })
      .catch(() => {})
  }, [roomId])

  // SSE subscription
  useEffect(() => {
    const es = new EventSource(`/api/commons/${roomId}/stream`)

    es.addEventListener('mentoring_paired', (e) => {
      const data = JSON.parse(e.data)
      setTotalRounds(data.totalRounds)
      setPhase('PAIR')
    })

    es.addEventListener('round_started', (e) => {
      const data = JSON.parse(e.data)
      setCurrentRound(data.round)
      setTotalRounds(data.totalRounds)
      setPrompt(data.prompt)
      setSessionTimeMs(data.sessionTimeMs)
      setTimeLeft(Math.round(data.sessionTimeMs / 1000))
      setMyPartner(findMyPartner(data.pairs))
      setPhase('SESSION')
    })

    es.addEventListener('debrief', (e) => {
      const data = JSON.parse(e.data)
      setDebriefSummary(data.summary)
      setPhase('DEBRIEF')
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
        LOBBY: 'LOBBY', PAIR: 'PAIR', SESSION: 'SESSION',
        ROTATE: 'ROTATE', DEBRIEF: 'DEBRIEF', COMPLETE: 'COMPLETE',
      }
      if (phaseMap[data.phase]) setPhase(phaseMap[data.phase])
    })

    es.addEventListener('complete', () => {
      setPhase('COMPLETE')
    })

    return () => es.close()
  }, [roomId])

  // Countdown timer for session phase
  useEffect(() => {
    if (phase !== 'SESSION' || timeLeft <= 0) return
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

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60)
    const secs = s % 60
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between bg-teal-900 px-6 py-4">
        <div className="flex items-center gap-3">
          <Users className="size-6 text-teal-300" />
          <div>
            <h2 className="text-lg font-extrabold text-white">Speed Mentoring</h2>
            <p className="text-sm text-teal-300">
              {phase === 'LOBBY' && `${totalParticipants} joined`}
              {phase === 'PAIR' && 'Pairing up...'}
              {phase === 'SESSION' && `Round ${currentRound}/${totalRounds} — ${formatTime(timeLeft)}`}
              {phase === 'ROTATE' && 'Rotating partners...'}
              {phase === 'DEBRIEF' && 'Session debrief'}
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
              <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-teal-900/50">
                <Users className="size-10 text-teal-400" />
              </div>
              <h3 className="text-2xl font-black text-white">Speed Mentoring</h3>
              <p className="text-gray-400">Sandy pairs you with different partners for focused conversations. Each round has a unique prompt to spark meaningful dialogue.</p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Users className="size-4" />
                <span>{totalParticipants} participants</span>
                <span className="mx-2">--</span>
                <Clock className="size-4" />
                <span>10 min per round</span>
              </div>
              {isHost && (
                <button onClick={handleStart} className="rounded-xl bg-teal-600 px-8 py-3 font-bold text-white hover:bg-teal-500">
                  Start Speed Mentoring
                </button>
              )}
              {!isHost && (
                <p className="text-sm text-gray-500">Waiting for host to start...</p>
              )}
            </div>
          )}

          {/* PAIR — showing pairings */}
          {phase === 'PAIR' && (
            <div className="space-y-4 text-center">
              <Loader2 className="mx-auto size-8 animate-spin text-teal-400" />
              <p className="text-lg text-gray-300">Sandy is pairing everyone up...</p>
              <p className="text-sm text-gray-500">{totalRounds} rounds of conversations coming up</p>
            </div>
          )}

          {/* SESSION — active conversation */}
          {phase === 'SESSION' && (
            <div className="space-y-6">
              {/* Round progress */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalRounds }, (_, i) => (
                    <div key={i} className={`size-3 rounded-full ${i + 1 < currentRound ? 'bg-teal-500' : i + 1 === currentRound ? 'bg-teal-400 ring-2 ring-teal-400/50' : 'bg-gray-700'}`} />
                  ))}
                </div>
                <div className="flex items-center gap-2 text-sm text-teal-400">
                  <Clock className="size-4" />
                  <span>{formatTime(timeLeft)}</span>
                </div>
              </div>

              {/* Partner card */}
              {myPartner ? (
                <div className="rounded-2xl border border-teal-500/30 bg-teal-950/50 p-6 text-center">
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-teal-400">Your Partner</p>
                  <div className="mx-auto mt-3 flex size-16 items-center justify-center rounded-full bg-teal-800">
                    <span className="text-2xl font-black text-teal-200">{myPartner.name.charAt(0)}</span>
                  </div>
                  <p className="mt-2 text-xl font-bold text-white">{myPartner.name}</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-gray-700 bg-gray-900 p-6 text-center">
                  <p className="text-gray-400">Sitting this round out -- you'll be paired next round!</p>
                </div>
              )}

              {/* Conversation prompt */}
              {prompt && (
                <div className="rounded-2xl border border-teal-500/30 bg-teal-950/30 p-5">
                  <div className="flex items-start gap-3">
                    <MessageCircle className="mt-0.5 size-5 shrink-0 text-teal-400" />
                    <div>
                      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-teal-400">Conversation Prompt</p>
                      <p className="text-lg leading-relaxed text-gray-200">{prompt}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Guidance */}
              <div className="rounded-xl bg-gray-900 p-4 text-center text-sm text-gray-500">
                Use the room chat or voice to have your conversation. Sandy will let you know when it's time to rotate.
              </div>
            </div>
          )}

          {/* ROTATE — transition between rounds */}
          {phase === 'ROTATE' && (
            <div className="space-y-4 text-center">
              <Loader2 className="mx-auto size-8 animate-spin text-teal-400" />
              <p className="text-lg text-gray-300">Rotating to your next partner...</p>
              <p className="text-sm text-gray-500">Round {currentRound} complete</p>
            </div>
          )}

          {/* DEBRIEF */}
          {(phase === 'DEBRIEF' || phase === 'COMPLETE') && debriefSummary && (
            <div className="space-y-6">
              <h3 className="text-center text-xl font-black text-white">Session Debrief</h3>
              <div className="rounded-2xl border border-teal-500/30 bg-teal-950/50 p-6">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-teal-400">Sandy's Summary</p>
                <div className="whitespace-pre-wrap leading-relaxed text-gray-200">{debriefSummary}</div>
              </div>
              <div className="rounded-xl bg-gray-900 p-4 text-center text-sm text-gray-400">
                {totalRounds} rounds completed with {totalParticipants} participants
              </div>
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
