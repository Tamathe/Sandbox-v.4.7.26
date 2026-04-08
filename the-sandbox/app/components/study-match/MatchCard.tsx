'use client'

import { useState } from 'react'
import { Check, X, Loader2, MessageCircle, Users } from 'lucide-react'
import TopicOverlap from './TopicOverlap'

interface StudyMatchMember {
  userId: string
  name: string
  strengths: string[]
  canHelpWith: string[]
  needsHelpWith: string[]
  accepted?: boolean
}

export interface StudyMatchSuggestion {
  id: string
  courseId: string
  courseCode: string
  members: StudyMatchMember[]
  complementarityScore: number
  matchReason: string
  expiresAt: string
  status: string
}

interface MatchCardProps {
  match: StudyMatchSuggestion
  currentUserId: string
  userEmail: string
  onRespond: (matchId: string, status: string, chatGroupId?: string) => void
}

export default function MatchCard({ match, currentUserId, userEmail, onRespond }: MatchCardProps) {
  const [responding, setResponding] = useState<'accept' | 'decline' | null>(null)

  const currentMember = match.members.find((m) => m.userId === currentUserId)
  const partners = match.members.filter((m) => m.userId !== currentUserId)

  // Compute topic overlap for the current user vs partners
  const yourStrengths = currentMember?.canHelpWith ?? []
  const theirStrengths = currentMember?.needsHelpWith ?? []
  const allPartnerStrengths = new Set(partners.flatMap((p) => p.strengths))
  const allYourStrengths = new Set(currentMember?.strengths ?? [])
  const shared = [...allYourStrengths].filter((s) => allPartnerStrengths.has(s))

  const isActive = match.status === 'active'
  const isDeclined = match.status === 'declined'
  const hasResponded = currentMember?.accepted || isDeclined
  const scorePercent = Math.round(match.complementarityScore * 100)

  async function respond(action: 'accept' | 'decline') {
    setResponding(action)
    try {
      const res = await fetch(`/api/study-match/${match.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      onRespond(match.id, data.status, data.chatGroupId)
    } catch (err) {
      console.error('Failed to respond to match:', err)
    } finally {
      setResponding(null)
    }
  }

  return (
    <div className={`border-2 rounded-2xl p-5 bg-white transition-colors ${
      isActive ? 'border-green-300 bg-green-50/30' : isDeclined ? 'border-gray-200 opacity-60' : 'border-gray-200'
    }`}>
      {/* Header: member avatars + score */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Initials avatars */}
          <div className="flex -space-x-2">
            {match.members.map((m) => (
              <div
                key={m.userId}
                className="size-8 rounded-full bg-[#0033A0] text-white flex items-center justify-center text-xs font-bold border-2 border-white"
                title={m.name}
              >
                {m.name.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
          <div className="ml-1">
            <p className="text-sm font-bold text-gray-900">
              {partners.map((p) => p.name).join(', ')}
            </p>
            <p className="text-xs text-gray-500">{match.courseCode}</p>
          </div>
        </div>

        {/* Complementarity score meter */}
        <div className="flex flex-col items-end">
          <span className="text-xs font-medium text-gray-500 mb-1">Match</span>
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0033A0] rounded-full transition-all"
                style={{ width: `${scorePercent}%` }}
              />
            </div>
            <span className="text-xs font-bold text-[#0033A0]">{scorePercent}%</span>
          </div>
        </div>
      </div>

      {/* Match reason */}
      <p className="text-sm text-gray-700 mb-3">{match.matchReason}</p>

      {/* Topic overlap */}
      <div className="mb-4">
        <TopicOverlap
          yourStrengths={yourStrengths}
          theirStrengths={theirStrengths}
          shared={shared}
        />
      </div>

      {/* Status / action buttons */}
      {isActive ? (
        <div className="flex items-center gap-2 text-sm">
          <MessageCircle className="size-4 text-green-600" />
          <span className="font-semibold text-green-700">Active — group chat created</span>
        </div>
      ) : isDeclined ? (
        <p className="text-sm text-gray-500">Declined</p>
      ) : hasResponded ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Check className="size-4 text-[#0033A0]" />
          <span>Accepted — waiting for others</span>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => respond('accept')}
            disabled={responding !== null}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0033A0] text-white text-sm font-semibold rounded-lg hover:bg-[#002880] disabled:opacity-50 transition-colors cursor-pointer"
          >
            {responding === 'accept' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Users className="size-4" />
            )}
            Accept
          </button>
          <button
            type="button"
            onClick={() => respond('decline')}
            disabled={responding !== null}
            className="inline-flex items-center gap-1.5 px-4 py-2 border-2 border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {responding === 'decline' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <X className="size-4" />
            )}
            Decline
          </button>
        </div>
      )}
    </div>
  )
}
