'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, Crown, Flame, Trophy, X, Zap } from 'lucide-react'
import ShareRoomButton from './ShareRoomButton'
import { useAuth } from '../../lib/auth-context'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PlayerScore {
  userId: string
  name: string
  score: number
  streak: number
}

interface ChallengeOverlayProps {
  roomId: string
  onClose: () => void
}

type Phase = 'LOBBY' | 'COUNTDOWN' | 'QUESTION' | 'REVEAL' | 'SCOREBOARD' | 'COMPLETE'

interface RoomState {
  phase: Phase
  participants: PlayerScore[]
  currentRound: number
  totalRounds: number
  title: string
  hostId: string
}

interface QuestionState {
  roundId: string
  roundNumber: number
  question: string
  options: string[]
  timeoutMs: number
}

interface RevealState {
  correctIndex: number
  explanation: string
  fastestName: string | null
  fastestTimeMs: number | null
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChallengeOverlay({ roomId, onClose }: ChallengeOverlayProps) {
  const { currentUser } = useAuth()
  const headers = { 'x-demo-user-email': currentUser.email }

  const [room, setRoom] = useState<RoomState | null>(null)
  const [question, setQuestion] = useState<QuestionState | null>(null)
  const [reveal, setReveal] = useState<RevealState | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [answerResult, setAnswerResult] = useState<{ isCorrect: boolean; responseTimeMs: number } | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [sandySays, setSandySays] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [connected, setConnected] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  // ── Load initial room state ──────────────────────────────────────────────

  useEffect(() => {
    fetch(`/api/commons/${roomId}`, { headers })
      .then((r) => r.json())
      .then((data) => {
        setRoom({
          phase: data.phase,
          participants: data.participants,
          currentRound: data.currentRound,
          totalRounds: data.totalRounds,
          title: data.title,
          hostId: data.hostId,
        })
      })
      .catch(console.error)
  }, [roomId, currentUser.email])

  // ── SSE stream ───────────────────────────────────────────────────────────

  useEffect(() => {
    const es = new EventSource(`/api/commons/${roomId}/stream`)
    eventSourceRef.current = es

    es.addEventListener('connected', (e) => {
      setConnected(true)
      const data = JSON.parse(e.data)
      setRoom({
        phase: data.phase,
        participants: data.participants,
        currentRound: data.currentRound,
        totalRounds: data.totalRounds,
        title: data.title,
        hostId: data.hostId,
      })
    })

    es.addEventListener('player_joined', (e) => {
      const data = JSON.parse(e.data)
      setRoom((prev) => {
        if (!prev) return prev
        const exists = prev.participants.some((p) => p.userId === data.userId)
        if (exists) return prev
        return {
          ...prev,
          participants: [...prev.participants, { userId: data.userId, name: data.name, score: 0, streak: 0 }],
        }
      })
    })

    es.addEventListener('countdown', (e) => {
      const data = JSON.parse(e.data)
      setCountdown(data.seconds)
      setRoom((prev) => prev ? { ...prev, phase: 'COUNTDOWN' } : prev)
    })

    es.addEventListener('phase_changed', (e) => {
      const data = JSON.parse(e.data)
      setRoom((prev) => prev ? { ...prev, phase: data.phase } : prev)
    })

    es.addEventListener('question_open', (e) => {
      const data = JSON.parse(e.data)
      setQuestion({
        roundId: data.roundId,
        roundNumber: data.roundNumber,
        question: data.question,
        options: data.options,
        timeoutMs: data.timeoutMs,
      })
      setSelectedAnswer(null)
      setAnswerResult(null)
      setReveal(null)
      setSandySays(null)
      setAnsweredCount(0)
      setTimeLeft(data.timeoutMs)
      setRoom((prev) => prev ? { ...prev, phase: 'QUESTION', currentRound: data.roundNumber, totalRounds: data.totalRounds } : prev)

      // Start countdown timer
      if (timerRef.current) clearInterval(timerRef.current)
      const startTime = Date.now()
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime
        const remaining = Math.max(0, data.timeoutMs - elapsed)
        setTimeLeft(remaining)
        if (remaining <= 0 && timerRef.current) {
          clearInterval(timerRef.current)
        }
      }, 100)
    })

    es.addEventListener('player_answered', (e) => {
      const data = JSON.parse(e.data)
      setAnsweredCount(data.answeredCount)
    })

    es.addEventListener('reveal', (e) => {
      const data = JSON.parse(e.data)
      if (timerRef.current) clearInterval(timerRef.current)
      setReveal({
        correctIndex: data.correctIndex,
        explanation: data.explanation,
        fastestName: data.fastestName,
        fastestTimeMs: data.fastestTimeMs,
      })
      setRoom((prev) => prev ? { ...prev, phase: 'REVEAL', participants: data.scores } : prev)
    })

    es.addEventListener('scoreboard', (e) => {
      const data = JSON.parse(e.data)
      setRoom((prev) => prev ? { ...prev, phase: 'SCOREBOARD', participants: data.standings } : prev)
    })

    es.addEventListener('sandy_says', (e) => {
      const data = JSON.parse(e.data)
      setSandySays(data.message)
    })

    es.addEventListener('complete', (e) => {
      const data = JSON.parse(e.data)
      setRoom((prev) => prev ? { ...prev, phase: 'COMPLETE', participants: data.finalStandings } : prev)
      setSandySays(data.summary)
    })

    es.onerror = () => {
      setConnected(false)
    }

    return () => {
      es.close()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [roomId])

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleStart = useCallback(async () => {
    await fetch(`/api/commons/${roomId}/start`, {
      method: 'POST',
      headers,
    })
  }, [roomId, currentUser.email])

  const handleAnswer = useCallback(async (index: number) => {
    if (selectedAnswer !== null || !question) return
    setSelectedAnswer(index)

    try {
      const res = await fetch(`/api/commons/${roomId}/answer`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId: question.roundId, selectedIndex: index }),
      })
      const result = await res.json()
      setAnswerResult(result)
    } catch {
      // Network error — answer was still submitted server-side if it got through
    }
  }, [roomId, question, selectedAnswer, currentUser.email])

  if (!room) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-[#001a52] to-[#0033A0]">
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
          <ShareRoomButton roomId={roomId} roomType="CHALLENGE" title={room.title} />
          {room.phase !== 'LOBBY' && room.phase !== 'COMPLETE' && (
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
              Round {room.currentRound}/{room.totalRounds}
            </span>
          )}
          {!connected && (
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-300">Reconnecting...</span>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Scoreboard panel */}
        <div className="hidden w-64 flex-shrink-0 border-r border-white/10 p-4 lg:block">
          <ScoreboardPanel participants={room.participants} currentUserId={currentUser?.id ?? ''} />
        </div>

        {/* Center area */}
        <div className="flex flex-1 flex-col items-center justify-center p-6">
          {/* LOBBY */}
          {room.phase === 'LOBBY' && (
            <LobbyView
              participants={room.participants}
              isHost={room.hostId === currentUser?.id}
              onStart={() => void handleStart()}
            />
          )}

          {/* COUNTDOWN */}
          {room.phase === 'COUNTDOWN' && countdown !== null && (
            <div className="text-center">
              <div className="animate-pulse text-9xl font-black text-white">{countdown}</div>
              <p className="mt-4 text-lg text-white/60">Get ready...</p>
            </div>
          )}

          {/* QUESTION */}
          {room.phase === 'QUESTION' && question && (
            <QuestionView
              question={question}
              timeLeft={timeLeft}
              selectedAnswer={selectedAnswer}
              answerResult={answerResult}
              answeredCount={answeredCount}
              totalPlayers={room.participants.length}
              onAnswer={(i) => void handleAnswer(i)}
            />
          )}

          {/* REVEAL */}
          {room.phase === 'REVEAL' && question && reveal && (
            <RevealView
              question={question}
              reveal={reveal}
              selectedAnswer={selectedAnswer}
              answerResult={answerResult}
            />
          )}

          {/* SCOREBOARD (between rounds) */}
          {room.phase === 'SCOREBOARD' && (
            <div className="w-full max-w-md">
              <h3 className="mb-4 text-center text-xl font-extrabold text-white">Standings</h3>
              <ScoreboardPanel participants={room.participants} currentUserId={currentUser?.id ?? ''} expanded />
              <p className="mt-4 text-center text-sm text-white/40">Next round starting soon...</p>
            </div>
          )}

          {/* COMPLETE */}
          {room.phase === 'COMPLETE' && (
            <CompleteView
              participants={room.participants}
              currentUserId={currentUser?.id ?? ''}
              onClose={onClose}
            />
          )}
        </div>
      </div>

      {/* Sandy commentary bar */}
      {sandySays && (
        <div className="border-t border-white/10 bg-white/5 px-6 py-3">
          <p className="text-center text-sm text-white/80">
            <span className="mr-1.5 font-bold text-amber-300">Sandy:</span>
            {sandySays}
          </p>
        </div>
      )}

      {/* Mobile scoreboard */}
      <div className="border-t border-white/10 bg-white/5 px-4 py-2 lg:hidden">
        <div className="flex items-center justify-center gap-4 overflow-x-auto">
          {room.participants
            .sort((a, b) => b.score - a.score)
            .slice(0, 4)
            .map((p, i) => (
              <div key={p.userId} className="flex items-center gap-1.5 text-xs text-white/70">
                <span>{['🥇', '🥈', '🥉', '4.'][i]}</span>
                <span className={p.userId === currentUser?.id ? 'font-bold text-white' : ''}>
                  {p.name.split(' ')[0]}
                </span>
                <span className="font-mono font-bold text-white">{p.score}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LobbyView({
  participants,
  isHost,
  onStart,
}: {
  participants: PlayerScore[]
  isHost: boolean
  onStart: () => void
}) {
  return (
    <div className="text-center">
      <Swords className="mx-auto mb-4 size-16 text-white/30" />
      <h3 className="mb-2 text-2xl font-black text-white">Waiting for players</h3>
      <p className="mb-6 text-white/50">{participants.length} player{participants.length !== 1 ? 's' : ''} ready</p>

      <div className="mb-8 flex flex-wrap justify-center gap-3">
        {participants.map((p) => (
          <div
            key={p.userId}
            className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2"
          >
            <div className="flex size-8 items-center justify-center rounded-full bg-[#0033A0] text-sm font-bold text-white">
              {p.name.charAt(0)}
            </div>
            <span className="text-sm font-semibold text-white">{p.name}</span>
          </div>
        ))}
      </div>

      {isHost && participants.length >= 1 && (
        <button
          type="button"
          onClick={onStart}
          className="rounded-xl bg-white px-8 py-3 text-sm font-extrabold text-[#0033A0] transition-transform hover:scale-105"
        >
          Start Challenge
        </button>
      )}

      {!isHost && (
        <p className="text-sm text-white/40">Waiting for the host to start...</p>
      )}
    </div>
  )
}

function Swords({ className }: { className?: string }) {
  return <Trophy className={className} />
}

function QuestionView({
  question,
  timeLeft,
  selectedAnswer,
  answerResult,
  answeredCount,
  totalPlayers,
  onAnswer,
}: {
  question: QuestionState
  timeLeft: number
  selectedAnswer: number | null
  answerResult: { isCorrect: boolean; responseTimeMs: number } | null
  answeredCount: number
  totalPlayers: number
  onAnswer: (index: number) => void
}) {
  const timeProgress = (timeLeft / question.timeoutMs) * 100
  const isUrgent = timeLeft < 5000
  const hasAnswered = selectedAnswer !== null

  return (
    <div className="w-full max-w-lg">
      {/* Timer bar */}
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full transition-all duration-100 ${isUrgent ? 'bg-red-500' : 'bg-green-400'}`}
          style={{ width: `${timeProgress}%` }}
        />
      </div>

      {/* Timer text */}
      <div className="mb-4 text-center">
        <span className={`text-3xl font-black ${isUrgent ? 'text-red-400' : 'text-white'}`}>
          {Math.ceil(timeLeft / 1000)}s
        </span>
      </div>

      {/* Question */}
      <div className="mb-6 rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
        <p className="text-center text-lg font-bold text-white">{question.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {question.options.map((option, i) => {
          const isSelected = selectedAnswer === i
          const showResult = answerResult && isSelected

          return (
            <button
              key={i}
              type="button"
              onClick={() => onAnswer(i)}
              disabled={hasAnswered}
              className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition-all ${
                isSelected
                  ? showResult
                    ? answerResult.isCorrect
                      ? 'border-green-400 bg-green-400/20 text-green-100'
                      : 'border-red-400 bg-red-400/20 text-red-100'
                    : 'border-white bg-white/20 text-white'
                  : hasAnswered
                    ? 'border-white/5 bg-white/5 text-white/30'
                    : 'border-white/10 bg-white/10 text-white hover:border-white/30 hover:bg-white/20'
              }`}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-black">
                {String.fromCharCode(65 + i)}
              </span>
              {option.replace(/^[A-D]\)\s*/, '')}
              {showResult && (
                <span className="ml-auto">
                  {answerResult.isCorrect ? (
                    <Check className="size-5 text-green-400" />
                  ) : (
                    <X className="size-5 text-red-400" />
                  )}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Answer count */}
      <div className="mt-4 text-center text-sm text-white/40">
        {answeredCount}/{totalPlayers} answered
      </div>
    </div>
  )
}

function RevealView({
  question,
  reveal,
  selectedAnswer,
  answerResult,
}: {
  question: QuestionState
  reveal: RevealState
  selectedAnswer: number | null
  answerResult: { isCorrect: boolean; responseTimeMs: number } | null
}) {
  return (
    <div className="w-full max-w-lg">
      {/* Result banner */}
      {answerResult ? (
        <div className={`mb-6 rounded-2xl p-4 text-center ${answerResult.isCorrect ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
          <p className="text-2xl font-black text-white">
            {answerResult.isCorrect ? 'Correct!' : 'Not quite!'}
          </p>
          {answerResult.isCorrect && (
            <p className="text-sm text-white/60">
              {(answerResult.responseTimeMs / 1000).toFixed(1)}s
            </p>
          )}
        </div>
      ) : (
        <div className="mb-6 rounded-2xl bg-white/10 p-4 text-center">
          <p className="text-xl font-bold text-white/60">Time's up!</p>
        </div>
      )}

      {/* Question with correct answer highlighted */}
      <div className="mb-4 rounded-2xl bg-white/10 p-4">
        <p className="mb-3 text-sm font-bold text-white">{question.question}</p>
        <div className="space-y-2">
          {question.options.map((option, i) => {
            const isCorrect = i === reveal.correctIndex
            const wasSelected = i === selectedAnswer
            return (
              <div
                key={i}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  isCorrect
                    ? 'bg-green-400/20 font-bold text-green-200'
                    : wasSelected
                      ? 'bg-red-400/10 text-red-200 line-through'
                      : 'text-white/30'
                }`}
              >
                {isCorrect && <Check className="size-4 text-green-400" />}
                {option.replace(/^[A-D]\)\s*/, '')}
              </div>
            )
          })}
        </div>
      </div>

      {/* Explanation */}
      <div className="rounded-2xl bg-amber-500/10 p-4">
        <p className="text-sm text-amber-100">{reveal.explanation}</p>
      </div>

      {/* Fastest */}
      {reveal.fastestName && (
        <div className="mt-3 flex items-center justify-center gap-2 text-sm text-white/50">
          <Zap className="size-4 text-amber-400" />
          <span>
            Fastest: <b className="text-white">{reveal.fastestName}</b>
            {reveal.fastestTimeMs && ` (${(reveal.fastestTimeMs / 1000).toFixed(1)}s)`}
          </span>
        </div>
      )}
    </div>
  )
}

function ScoreboardPanel({
  participants,
  currentUserId,
  expanded,
}: {
  participants: PlayerScore[]
  currentUserId: string
  expanded?: boolean
}) {
  const sorted = [...participants].sort((a, b) => b.score - a.score)
  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className={expanded ? '' : ''}>
      <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/40">Scoreboard</h4>
      <div className="space-y-2">
        {sorted.map((p, i) => {
          const isMe = p.userId === currentUserId
          return (
            <div
              key={p.userId}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
                isMe ? 'bg-white/10' : ''
              } ${expanded ? 'text-base' : 'text-sm'}`}
            >
              <span className="w-6 text-center">{medals[i] ?? `${i + 1}.`}</span>
              <div className="flex size-7 items-center justify-center rounded-full bg-[#0033A0] text-xs font-bold text-white">
                {p.name.charAt(0)}
              </div>
              <span className={`flex-1 truncate ${isMe ? 'font-bold text-white' : 'text-white/70'}`}>
                {p.name.split(' ')[0]}
                {isMe && ' (you)'}
              </span>
              <span className="font-mono font-bold text-white">{p.score}</span>
              {p.streak > 1 && (
                <span className="flex items-center gap-0.5 text-xs text-amber-400">
                  <Flame className="size-3" />
                  {p.streak}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CompleteView({
  participants,
  currentUserId,
  onClose,
}: {
  participants: PlayerScore[]
  currentUserId: string
  onClose: () => void
}) {
  const sorted = [...participants].sort((a, b) => b.score - a.score)
  const winner = sorted[0]

  return (
    <div className="text-center">
      <Crown className="mx-auto mb-4 size-16 text-amber-400" />
      <h2 className="mb-2 text-3xl font-black text-white">Game Over!</h2>
      {winner && (
        <p className="mb-8 text-lg text-white/60">
          <span className="font-bold text-amber-300">{winner.name}</span> wins with {winner.score} points!
        </p>
      )}

      <div className="mx-auto mb-8 w-full max-w-sm">
        <ScoreboardPanel participants={participants} currentUserId={currentUserId} expanded />
      </div>

      <button
        type="button"
        onClick={onClose}
        className="rounded-xl bg-white px-8 py-3 text-sm font-extrabold text-[#0033A0] transition-transform hover:scale-105"
      >
        Back to Chat
      </button>
    </div>
  )
}
