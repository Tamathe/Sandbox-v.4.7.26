'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Briefcase,
  Users,
  ThumbsUp,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { useAuth } from '../../lib/auth-context'

interface PitchAuthor {
  id: string
  name: string
}

interface PitchSubmission {
  id: string
  teamName: string
  summary: string
  recommendation: string
  rationale: string
  aiFeedback: string | null
  aiFeedbackAt: string | null
  voteCount: number
  iVoted: boolean
  author: PitchAuthor
  createdAt: string
}

interface PitchRoomDetail {
  id: string
  title: string
  casePrompt: string
  accessCode: string
  status: 'OPEN' | 'VOTING' | 'COMPLETE'
  hostId: string
  host: { id: string; name: string }
  pitches: PitchSubmission[]
  isHost: boolean
  myPitch: PitchSubmission | null
  createdAt: string
  closedAt: string | null
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Accepting Pitches',
  VOTING: 'Voting Open',
  COMPLETE: 'Complete',
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-700',
  VOTING: 'bg-amber-100 text-amber-700',
  COMPLETE: 'bg-blue-100 text-blue-700',
}

function FeedbackBlock({ feedback }: { feedback: string }) {
  return (
    <div className="mt-3 bg-purple-50 border border-purple-200 rounded-xl p-4 text-xs text-gray-700 leading-relaxed">
      <div className="flex items-center gap-1.5 text-purple-700 font-semibold mb-2">
        <Sparkles className="size-3.5" />
        AI Judge Feedback
      </div>
      <div className="whitespace-pre-wrap">{feedback}</div>
    </div>
  )
}

function PitchCard({
  pitch,
  canVote,
  votingOpen,
  onVote,
  isOwnPitch,
}: {
  pitch: PitchSubmission
  canVote: boolean
  votingOpen: boolean
  onVote: (pitchId: string) => void
  isOwnPitch: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [voting, setVoting] = useState(false)

  async function handleVote() {
    if (!canVote || isOwnPitch || voting) return
    setVoting(true)
    await onVote(pitch.id)
    setVoting(false)
  }

  return (
    <div className="border-2 border-gray-200 rounded-2xl bg-white p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-extrabold text-gray-900">{pitch.teamName}</p>
          <p className="text-xs text-gray-400 mt-0.5">by {pitch.author.name}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {votingOpen && !isOwnPitch && (
            <button
              onClick={handleVote}
              disabled={voting}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-colors disabled:opacity-50 ${
                pitch.iVoted
                  ? 'border-[#0033A0] bg-[#0033A0] text-white'
                  : 'border-gray-200 text-gray-600 hover:border-[#0033A0] hover:text-[#0033A0]'
              }`}
            >
              {voting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <ThumbsUp className="size-3.5" />
              )}
              {pitch.voteCount}
            </button>
          )}
          {(!votingOpen || isOwnPitch) && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <ThumbsUp className="size-3.5" />
              {pitch.voteCount}
            </span>
          )}
          {isOwnPitch && (
            <span className="text-xs font-semibold text-[#0033A0] bg-blue-50 px-2 py-0.5 rounded-full">
              Your pitch
            </span>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Recommendation
        </p>
        <p className="text-sm text-gray-800 font-medium">{pitch.recommendation}</p>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Executive Summary
        </p>
        <p className="text-sm text-gray-600 line-clamp-3">{pitch.summary}</p>
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
      >
        {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        {expanded ? 'Hide rationale' : 'Read full rationale'}
      </button>

      {expanded && (
        <div className="text-sm text-gray-600 pt-1 border-t border-gray-100">{pitch.rationale}</div>
      )}

      {pitch.aiFeedback ? (
        <FeedbackBlock feedback={pitch.aiFeedback} />
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
          <Loader2 className="size-3 animate-spin" />
          AI feedback generating…
        </div>
      )}
    </div>
  )
}

export default function PitchRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params)
  const { currentUser } = useAuth()
  const [room, setRoom] = useState<PitchRoomDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [copied, setCopied] = useState(false)

  const fetchRoom = useCallback(async () => {
    const res = await fetch(`/api/pitch/rooms/${roomId}`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
    if (res.ok) {
      const data = await res.json()
      setRoom(data.room)
    }
    setLoading(false)
  }, [roomId, currentUser.email])

  useEffect(() => {
    fetchRoom()
  }, [fetchRoom])

  // Poll for AI feedback if any pitch is missing it
  useEffect(() => {
    if (!room) return
    const hasPending = room.pitches.some((p) => !p.aiFeedback)
    if (!hasPending) return
    const t = setTimeout(fetchRoom, 5000)
    return () => clearTimeout(t)
  }, [room, fetchRoom])

  async function handleVote(pitchId: string) {
    const res = await fetch(`/api/pitch/rooms/${roomId}/pitches/${pitchId}/vote`, {
      method: 'POST',
      headers: { 'x-demo-user-email': currentUser.email },
    })
    if (res.ok) fetchRoom()
  }

  async function handleStatusChange(action: 'open_voting' | 'close') {
    setStatusUpdating(true)
    const res = await fetch(`/api/pitch/rooms/${roomId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-email': currentUser.email,
      },
      body: JSON.stringify({ action }),
    })
    if (res.ok) await fetchRoom()
    setStatusUpdating(false)
  }

  function copyCode() {
    if (!room) return
    navigator.clipboard.writeText(room.accessCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="size-6 animate-spin" />
          Loading competition…
        </div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Competition not found.</p>
          <Link href="/pitch" className="text-[#0033A0] font-semibold hover:underline">
            Back to Case Pitch
          </Link>
        </div>
      </div>
    )
  }

  const votingOpen = room.status === 'VOTING'
  const sortedPitches =
    room.status !== 'OPEN'
      ? [...room.pitches].sort((a, b) => b.voteCount - a.voteCount)
      : room.pitches

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={room.title}
        subtitle={`Hosted by ${room.host.name}`}
        action={
          <Link
            href="/pitch"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="size-4" />
            All Competitions
          </Link>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Room header strip */}
        <div className="border-2 border-gray-200 rounded-2xl bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`text-sm font-semibold px-3 py-1 rounded-full ${STATUS_COLORS[room.status]}`}
              >
                {STATUS_LABELS[room.status]}
              </span>
              <button
                onClick={copyCode}
                className="flex items-center gap-1.5 text-sm font-mono font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-lg transition-colors"
              >
                {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
                {room.accessCode}
              </button>
              <span className="flex items-center gap-1.5 text-sm text-gray-500">
                <Users className="size-4" />
                {room.pitches.length} pitch{room.pitches.length !== 1 ? 'es' : ''}
              </span>
            </div>

            {/* Host controls */}
            {room.isHost && room.status !== 'COMPLETE' && (
              <div className="flex items-center gap-2">
                {room.status === 'OPEN' && room.pitches.length > 0 && (
                  <button
                    onClick={() => handleStatusChange('open_voting')}
                    disabled={statusUpdating}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
                  >
                    {statusUpdating ? <Loader2 className="size-4 animate-spin" /> : <ThumbsUp className="size-4" />}
                    Open Voting
                  </button>
                )}
                {room.status === 'VOTING' && (
                  <button
                    onClick={() => handleStatusChange('close')}
                    disabled={statusUpdating}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
                  >
                    {statusUpdating ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
                    Close Competition
                  </button>
                )}
              </div>
            )}

            {/* Participant submit button */}
            {!room.isHost && room.status === 'OPEN' && !room.myPitch && (
              <Link
                href={`/pitch/${room.id}/submit`}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0033A0] text-white rounded-lg font-semibold text-sm hover:bg-blue-800 transition-colors"
              >
                <Briefcase className="size-4" />
                Submit Pitch
              </Link>
            )}
          </div>
        </div>

        {/* Case brief */}
        <div className="border-2 border-blue-200 rounded-2xl bg-white p-6">
          <p className="text-xs font-semibold text-[#0033A0] uppercase tracking-wide mb-2">
            The Case
          </p>
          <p className="text-sm text-gray-800 leading-relaxed">{room.casePrompt}</p>
        </div>

        {/* Pitches */}
        {sortedPitches.length === 0 ? (
          <div className="border-2 border-gray-200 rounded-2xl bg-white p-10 text-center">
            <Briefcase className="size-10 text-gray-300 mx-auto mb-3" />
            <p className="font-bold text-gray-900 mb-1">No pitches yet</p>
            {room.status === 'OPEN' && !room.isHost && (
              <p className="text-sm text-gray-500 mb-4">Be the first to submit your recommendation.</p>
            )}
            {room.status === 'OPEN' && !room.isHost && !room.myPitch && (
              <Link
                href={`/pitch/${room.id}/submit`}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0033A0] text-white rounded-lg font-semibold text-sm hover:bg-blue-800 transition-colors"
              >
                Submit Your Pitch
              </Link>
            )}
            {room.isHost && (
              <p className="text-sm text-gray-500">
                Share the code <span className="font-mono font-semibold">{room.accessCode}</span> with participants.
              </p>
            )}
          </div>
        ) : (
          <div>
            <h2 className="font-extrabold text-gray-900 text-lg mb-4">
              {room.status === 'OPEN' ? 'Submitted Pitches' : 'Pitches — Ranked by Votes'}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {sortedPitches.map((pitch) => (
                <PitchCard
                  key={pitch.id}
                  pitch={pitch}
                  canVote={!room.isHost}
                  votingOpen={votingOpen}
                  onVote={handleVote}
                  isOwnPitch={pitch.author.id === currentUser.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Winner callout for COMPLETE status */}
        {room.status === 'COMPLETE' && sortedPitches.length > 0 && (
          <div className="border-2 border-amber-200 rounded-2xl bg-amber-50 p-6 flex items-center gap-4">
            <CheckCircle className="size-8 text-amber-500 flex-shrink-0" />
            <div>
              <p className="font-extrabold text-gray-900">Competition complete</p>
              <p className="text-sm text-gray-600 mt-0.5">
                Top pitch: <span className="font-bold">{sortedPitches[0].teamName}</span> with{' '}
                {sortedPitches[0].voteCount} vote{sortedPitches[0].voteCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
