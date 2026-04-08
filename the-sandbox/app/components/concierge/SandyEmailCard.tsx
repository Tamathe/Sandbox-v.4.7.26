'use client'

import React from 'react'
import { Mail, Clock, Reply, Star } from 'lucide-react'

interface SandyEmailCardProps {
  emailId: string
  from: string
  fromAddress?: string
  subject: string
  snippet: string
  receivedAt: string
  category?: string
  isRead?: boolean
  isStarred?: boolean
  variant?: 'inbox' | 'draft'
  draftBody?: string
  draftTo?: string
  onDraftReply?: () => void
  onApprove?: () => void
  onDiscard?: () => void
}

const CATEGORY_COLORS: Record<string, string> = {
  decision: 'bg-amber-100 text-amber-700',
  waiting: 'bg-blue-100 text-blue-700',
  fyi: 'bg-gray-100 text-gray-600',
  noise: 'bg-gray-100 text-gray-400',
  student: 'bg-green-100 text-green-700',
  admin: 'bg-purple-100 text-purple-700',
  urgent: 'bg-red-100 text-red-700',
  department: 'bg-indigo-100 text-indigo-700',
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function SandyEmailCard({
  from,
  subject,
  snippet,
  receivedAt,
  category,
  isRead = true,
  isStarred = false,
  variant = 'inbox',
  draftBody,
  draftTo,
  onDraftReply,
  onApprove,
  onDiscard,
}: SandyEmailCardProps) {
  const catColor = category ? CATEGORY_COLORS[category] ?? 'bg-gray-100 text-gray-600' : null

  if (variant === 'draft') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 my-1.5">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="size-5 bg-amber-100 rounded-full flex items-center justify-center">
            <Reply className="size-3 text-amber-600" />
          </div>
          <span className="text-xs font-bold text-amber-700">Sandy&apos;s Draft</span>
          {draftTo && (
            <span className="text-xs text-gray-500 ml-auto truncate max-w-[120px]">To: {draftTo}</span>
          )}
        </div>
        <p className="text-xs font-medium text-gray-700 mb-1 truncate">{subject}</p>
        <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{draftBody ?? snippet}</p>
        <div className="flex gap-2 mt-2">
          {onApprove && (
            <button
              onClick={onApprove}
              className="flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-700 transition-colors"
            >
              Approve
            </button>
          )}
          {onDiscard && (
            <button
              onClick={onDiscard}
              className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Discard
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border p-3 my-1.5 transition-colors ${
      isRead ? 'border-gray-200 bg-white hover:bg-gray-50' : 'border-[#0033A0]/20 bg-blue-50 hover:bg-blue-100/60'
    }`}>
      <div className="flex items-start gap-2">
        {/* Unread indicator */}
        {!isRead && <div className="size-2 rounded-full bg-[#0033A0] shrink-0 mt-1.5" />}

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`text-xs font-semibold truncate ${!isRead ? 'text-gray-900' : 'text-gray-700'}`}>
              {from}
            </span>
            {isStarred && <Star className="size-3 text-amber-400 fill-amber-400 shrink-0" />}
            {catColor && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${catColor}`}>
                {category}
              </span>
            )}
            <span className="text-[10px] text-gray-400 ml-auto shrink-0 flex items-center gap-0.5">
              <Clock className="size-2.5" />
              {formatRelativeTime(receivedAt)}
            </span>
          </div>

          {/* Subject */}
          <p className={`text-xs truncate mb-0.5 ${!isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
            {subject}
          </p>

          {/* Snippet */}
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{snippet}</p>
        </div>
      </div>

      {/* Actions */}
      {onDraftReply && (
        <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
          <button
            onClick={onDraftReply}
            className="flex items-center gap-1 text-xs font-semibold text-[#0033A0] hover:text-[#002880] transition-colors"
          >
            <Mail className="size-3" />
            Draft Reply
          </button>
        </div>
      )}
    </div>
  )
}
