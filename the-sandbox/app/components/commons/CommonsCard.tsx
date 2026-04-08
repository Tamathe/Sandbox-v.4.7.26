'use client'

import { useState } from 'react'
import { BookOpen, Check, CircleDot, Clock, FileCheck, FileSearch, GitBranch, GraduationCap, HelpCircle, Loader2, Mic, MonitorPlay, Play, Puzzle, RefreshCw, Scale, Swords, Trophy, Users, X } from 'lucide-react'
import ShareRoomButton from './ShareRoomButton'
import { useAuth } from '../../lib/auth-context'

interface Participant {
  userId: string
  name: string
  score: number
  streak: number
}

interface LiveRoomData {
  id: string
  type: string
  title: string
  phase: string
  hostId: string
  hostName: string
  participants: Participant[]
  totalRounds: number
  currentRound: number
  assignmentId?: string | null
  assessmentMode?: boolean
  config: { rounds?: number; topic?: string }
}

interface CommonsCardProps {
  room: LiveRoomData
  onJoin: (roomId: string) => void
  onOpen: (roomId: string) => void
  onPlayAgain?: (topic: string) => void
}

export default function CommonsCard({ room, onJoin, onOpen, onPlayAgain }: CommonsCardProps) {
  const { currentUser } = useAuth()
  const [joining, setJoining] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [reviewData, setReviewData] = useState<ReviewRound[] | null>(null)
  const [reviewLoading, setReviewLoading] = useState(false)

  const isParticipant = room.participants.some((p) => p.userId === currentUser?.id)
  const isHost = room.hostId === currentUser?.id

  const handleJoin = async () => {
    setJoining(true)
    try {
      await onJoin(room.id)
    } finally {
      setJoining(false)
    }
  }

  const handleReviewAnswers = async () => {
    if (showReview) {
      setShowReview(false)
      return
    }
    if (reviewData) {
      setShowReview(true)
      return
    }
    setReviewLoading(true)
    try {
      const res = await fetch(`/api/commons/${room.id}`, {
        headers: { 'x-demo-user-email': currentUser?.email ?? '' },
      })
      if (res.ok) {
        const data = await res.json()
        if (data.rounds) {
          setReviewData(data.rounds)
        }
      }
    } catch { /* silent */ }
    setReviewLoading(false)
    setShowReview(true)
  }

  const handlePlayAgain = () => {
    if (onPlayAgain) {
      onPlayAgain(room.config.topic ?? room.title)
    }
  }

  const phaseLabel = getPhaseLabel(room.phase, room.currentRound, room.totalRounds)
  const phaseColor = getPhaseColor(room.phase)

  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border-2 border-[#0033A0]/20 bg-gradient-to-br from-[#0033A0]/5 to-white">
      {/* Header */}
      <div className={`flex items-center gap-2 px-4 py-2.5 ${
        room.type === 'STUDY' ? 'bg-slate-800'
        : room.type === 'WATCH' ? 'bg-gray-900'
        : room.type === 'TEACHBACK' ? 'bg-indigo-900'
        : room.type === 'SIMULATION' ? 'bg-purple-600'
        : room.type === 'DEBATE' ? 'bg-red-600'
        : room.type === 'PROBLEM_LAB' ? 'bg-amber-600'
        : room.type === 'SPEED_MENTORING' ? 'bg-teal-600'
        : room.type === 'PEER_REVIEW' ? 'bg-emerald-600'
        : room.type === 'OFFICE_HOURS' ? 'bg-sky-600'
        : room.type === 'CASE_STUDY' ? 'bg-orange-600'
        : room.type === 'IMPROV' ? 'bg-pink-600'
        : room.type === 'FISHBOWL' ? 'bg-violet-600'
        : 'bg-[#0033A0]'
      }`}>
        {room.type === 'STUDY' ? <BookOpen className="size-4 text-white" />
          : room.type === 'WATCH' ? <MonitorPlay className="size-4 text-white" />
          : room.type === 'TEACHBACK' ? <GraduationCap className="size-4 text-white" />
          : room.type === 'SIMULATION' ? <GitBranch className="size-4 text-white" />
          : room.type === 'DEBATE' ? <Scale className="size-4 text-white" />
          : room.type === 'PROBLEM_LAB' ? <Puzzle className="size-4 text-white" />
          : room.type === 'SPEED_MENTORING' ? <Users className="size-4 text-white" />
          : room.type === 'PEER_REVIEW' ? <FileCheck className="size-4 text-white" />
          : room.type === 'OFFICE_HOURS' ? <HelpCircle className="size-4 text-white" />
          : room.type === 'CASE_STUDY' ? <FileSearch className="size-4 text-white" />
          : room.type === 'IMPROV' ? <Mic className="size-4 text-white" />
          : room.type === 'FISHBOWL' ? <CircleDot className="size-4 text-white" />
          : <Swords className="size-4 text-white" />}
        <span className="text-sm font-bold text-white">{
          room.type === 'STUDY' ? 'Study Session'
          : room.type === 'WATCH' ? 'Watch Party'
          : room.type === 'TEACHBACK' ? 'Teach-Back'
          : room.type === 'SIMULATION' ? 'Simulation'
          : room.type === 'DEBATE' ? 'Debate'
          : room.type === 'PROBLEM_LAB' ? 'Problem Lab'
          : room.type === 'SPEED_MENTORING' ? 'Speed Mentoring'
          : room.type === 'PEER_REVIEW' ? 'Peer Review'
          : room.type === 'OFFICE_HOURS' ? 'Office Hours'
          : room.type === 'CASE_STUDY' ? 'Case Study'
          : room.type === 'IMPROV' ? 'Improv'
          : room.type === 'FISHBOWL' ? 'Fishbowl'
          : 'Challenge'
        }</span>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${phaseColor}`}>
          {phaseLabel}
        </span>
      </div>

      {/* Body */}
      <div className="space-y-3 p-4">
        <h3 className="text-base font-extrabold text-gray-900">{room.title}</h3>
        {room.assessmentMode && (
          <div className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
            Assessment Mode
          </div>
        )}

        {room.config.topic && room.phase !== 'COMPLETE' && (
          <p className="text-xs text-gray-500">Topic: {room.config.topic}</p>
        )}

        {/* Participants */}
        <div className="flex items-center gap-2">
          <Users className="size-4 text-gray-400" />
          <div className="flex -space-x-1">
            {room.participants.slice(0, 6).map((p) => (
              <div
                key={p.userId}
                className="flex size-7 items-center justify-center rounded-full border-2 border-white bg-[#0033A0] text-xs font-bold text-white"
                title={p.name}
              >
                {p.name.charAt(0)}
              </div>
            ))}
          </div>
          <span className="text-sm text-gray-600">
            {room.participants.length} player{room.participants.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Completed: show winners + post-game hooks */}
        {room.phase === 'COMPLETE' && room.type === 'STUDY' && (
          <div className="rounded-xl bg-emerald-50 p-3">
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-700">
              <Clock className="size-3.5" />
              Session Complete
            </div>
            <p className="mt-1 text-sm text-emerald-600">
              {room.config.rounds ?? 4} cycles · {(room.config.rounds ?? 4) * ((room.config as Record<string, unknown>).focusMinutes as number ?? 25)} min of focus
            </p>
          </div>
        )}

        {room.phase === 'COMPLETE' && room.type !== 'STUDY' && (
          <>
            <div className="space-y-1 rounded-xl bg-amber-50 p-3">
              <div className="flex items-center gap-1 text-xs font-bold text-amber-700">
                <Trophy className="size-3.5" />
                Final Results
              </div>
              {[...room.participants]
                .sort((a, b) => b.score - a.score)
                .slice(0, 3)
                .map((p, i) => (
                  <div key={p.userId} className="flex items-center justify-between text-sm">
                    <span>
                      {['🥇', '🥈', '🥉'][i]} {p.name}
                    </span>
                    <span className="font-bold text-gray-700">{p.score} pts</span>
                  </div>
                ))}
            </div>

            {/* Post-game action buttons */}
            <div className="flex gap-2">
              {onPlayAgain && (
                <button
                  type="button"
                  onClick={handlePlayAgain}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0033A0] px-3 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
                >
                  <RefreshCw className="size-3.5" />
                  Play Again
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleReviewAnswers()}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-[#0033A0]/20 bg-white px-3 py-2 text-xs font-bold text-[#0033A0] transition-colors hover:bg-[#0033A0]/5"
              >
                {reviewLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <BookOpen className="size-3.5" />
                )}
                {showReview ? 'Hide Answers' : 'Review Answers'}
              </button>
            </div>

            {/* Review Answers expandable */}
            {showReview && reviewData && (
              <div className="space-y-2 rounded-xl bg-gray-50 p-3">
                <h4 className="text-xs font-bold text-gray-600">Answer Review</h4>
                {reviewData.map((round, i) => (
                  <div key={round.roundNumber} className="rounded-lg bg-white p-2.5 text-xs">
                    <div className="mb-1 font-semibold text-gray-800">
                      Q{round.roundNumber}: {round.question}
                    </div>
                    <div className="space-y-0.5">
                      {round.options.map((opt, j) => (
                        <div
                          key={j}
                          className={`flex items-center gap-1.5 rounded px-2 py-0.5 ${
                            j === round.correctIndex
                              ? 'bg-green-50 font-semibold text-green-700'
                              : 'text-gray-500'
                          }`}
                        >
                          {j === round.correctIndex ? (
                            <Check className="size-3 text-green-500" />
                          ) : (
                            <X className="size-3 text-gray-300" />
                          )}
                          {opt.replace(/^[A-D]\)\s*/, '')}
                        </div>
                      ))}
                    </div>
                    <p className="mt-1 text-[10px] text-gray-400">{round.explanation}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Review fallback if no data loaded */}
            {showReview && !reviewData && !reviewLoading && (
              <div className="rounded-xl bg-gray-50 p-3 text-center text-xs text-gray-400">
                Answer review not available for this game.
              </div>
            )}
          </>
        )}

        {/* Actions — active game states */}
        {room.phase === 'LOBBY' && !isParticipant && (
          <button
            type="button"
            onClick={() => void handleJoin()}
            disabled={joining}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {joining ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Swords className="size-4" />
            )}
            Join Challenge
          </button>
        )}

        {room.phase === 'LOBBY' && isHost && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onOpen(room.id)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#0033A0] bg-white px-4 py-2.5 text-sm font-bold text-[#0033A0] transition-colors hover:bg-[#0033A0]/5"
            >
              <Play className="size-4" />
              Start Game
            </button>
            <ShareRoomButton roomId={room.id} roomType={room.type as 'CHALLENGE' | 'STUDY' | 'WATCH' | 'TEACHBACK' | 'SIMULATION' | 'DEBATE' | 'PROBLEM_LAB' | 'SPEED_MENTORING' | 'PEER_REVIEW' | 'OFFICE_HOURS' | 'CASE_STUDY' | 'IMPROV' | 'FISHBOWL'} title={room.title} variant="card" />
          </div>
        )}

        {room.phase === 'LOBBY' && isParticipant && !isHost && (
          <ShareRoomButton roomId={room.id} roomType={room.type as 'CHALLENGE' | 'STUDY' | 'WATCH' | 'TEACHBACK' | 'SIMULATION' | 'DEBATE' | 'PROBLEM_LAB' | 'SPEED_MENTORING' | 'PEER_REVIEW' | 'OFFICE_HOURS' | 'CASE_STUDY' | 'IMPROV' | 'FISHBOWL'} title={room.title} variant="card" />
        )}

        {room.phase !== 'LOBBY' && room.phase !== 'COMPLETE' && isParticipant && (
          <button
            type="button"
            onClick={() => onOpen(room.id)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            <Play className="size-4" />
            Return to Game
          </button>
        )}

        {room.phase !== 'LOBBY' && room.phase !== 'COMPLETE' && !isParticipant && (
          <div className="text-center text-xs text-gray-400">Game in progress</div>
        )}
      </div>
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReviewRound {
  roundNumber: number
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPhaseLabel(phase: string, currentRound: number, totalRounds: number): string {
  switch (phase) {
    case 'LOBBY': return 'Waiting for players'
    case 'COUNTDOWN': return 'Starting...'
    case 'QUESTION': return `Round ${currentRound}/${totalRounds}`
    case 'REVEAL': return `Round ${currentRound}/${totalRounds} — Reveal`
    case 'SCOREBOARD': return `Round ${currentRound}/${totalRounds}`
    case 'COMPLETE': return 'Complete'
    default: return phase
  }
}

function getPhaseColor(phase: string): string {
  switch (phase) {
    case 'LOBBY': return 'bg-white/20 text-white'
    case 'COUNTDOWN': return 'bg-amber-400 text-amber-900'
    case 'QUESTION':
    case 'REVEAL':
    case 'SCOREBOARD': return 'bg-green-400 text-green-900'
    case 'COMPLETE': return 'bg-white/30 text-white'
    default: return 'bg-white/20 text-white'
  }
}
