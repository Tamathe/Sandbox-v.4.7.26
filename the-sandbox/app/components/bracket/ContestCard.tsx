'use client'

import { useState } from 'react'
import { Crown, Users, Lock, Play, CheckCircle, Share2 } from 'lucide-react'

interface ContestCardContest {
  id: string
  name: string
  accessCode: string
  status: string
  _count: { entries: number }
}

interface ContestCardProps {
  contest: ContestCardContest
  isCommissioner: boolean
  myRank?: number
  myScore?: number
  onOpen: (contestId: string) => void
}

type BracketStatus = 'PICKING' | 'LOCKED' | 'IN_PROGRESS' | 'COMPLETE'

const STATUS_LABELS: Record<BracketStatus, string> = {
  PICKING: 'Open',
  LOCKED: 'Locked',
  IN_PROGRESS: 'In Progress',
  COMPLETE: 'Complete',
}

const STATUS_COLORS: Record<BracketStatus, string> = {
  PICKING: 'bg-green-100 text-green-800',
  LOCKED: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETE: 'bg-gray-100 text-gray-700',
}

const STATUS_ICONS: Record<BracketStatus, React.ElementType> = {
  PICKING: Play,
  LOCKED: Lock,
  IN_PROGRESS: Play,
  COMPLETE: CheckCircle,
}

export default function ContestCard({ contest, isCommissioner, myRank, myScore, onOpen }: ContestCardProps) {
  const status = contest.status as BracketStatus
  const StatusIcon = STATUS_ICONS[status]
  const [copied, setCopied] = useState(false)

  function handleShare(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(contest.accessCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="border-2 border-gray-200 rounded-2xl bg-white p-5 hover:border-[#0033A0] hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <h2 className="font-extrabold text-gray-900 text-lg leading-tight pr-2">{contest.name}</h2>
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${STATUS_COLORS[status]}`}>
          <StatusIcon className="size-3" />
          {STATUS_LABELS[status]}
        </span>
      </div>

      <div className="flex items-center gap-3 text-sm text-gray-500 mb-4 flex-wrap">
        <span className="flex items-center gap-1">
          <Users className="size-3.5" />
          {contest._count.entries} {contest._count.entries === 1 ? 'player' : 'players'}
        </span>
        {isCommissioner && (
          <span className="flex items-center gap-1.5 font-mono bg-gray-100 px-2 py-0.5 rounded text-sm text-gray-600 tracking-wide">
            {contest.accessCode}
            <button
              onClick={handleShare}
              title="Copy access code"
              className="ml-1 text-gray-400 hover:text-[#0033A0] transition-colors"
            >
              {copied ? (
                <span className="text-xs font-sans font-semibold text-green-600">Copied!</span>
              ) : (
                <Share2 className="size-3.5" />
              )}
            </button>
          </span>
        )}
      </div>

      {isCommissioner && (
        <div className="flex items-center gap-1 text-xs text-[#0033A0] font-semibold mb-3">
          <Crown className="size-3.5" />
          Commissioner
        </div>
      )}

      {status === 'IN_PROGRESS' && myScore !== undefined && (
        <div className="mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">
            {myScore} pts{myRank !== undefined ? ` · #${myRank}` : ''}
          </span>
        </div>
      )}

      {status === 'COMPLETE' && myRank !== undefined && (
        <div className="mb-3">
          {myRank === 1 ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">
              🏆 Won!{myScore !== undefined ? ` · ${myScore} pts` : ''}
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
              Finished #{myRank}{myScore !== undefined ? ` · ${myScore} pts` : ''}
            </span>
          )}
        </div>
      )}

      <button
        onClick={() => onOpen(contest.id)}
        className="w-full px-4 py-2 bg-[#0033A0] text-white rounded-xl font-semibold text-sm hover:bg-blue-800 transition-colors"
      >
        Open
      </button>
    </div>
  )
}
