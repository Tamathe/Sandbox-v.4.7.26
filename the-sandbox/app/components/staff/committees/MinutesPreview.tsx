'use client'

import { FileText, ArrowRight, ListChecks, Vote } from 'lucide-react'

interface MinutesPreviewProps {
  meetingId: string
  committeeName: string
  date: string
  meetingNumber: number
  status: string
  actionItemCount: number
  decisionCount: number
  minutesExcerpt: string
  onViewFull: (meetingId: string) => void
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  review: 'bg-blue-100 text-blue-800',
  finalized: 'bg-green-100 text-green-800',
}

export default function MinutesPreview({
  meetingId,
  committeeName,
  date,
  meetingNumber,
  status,
  actionItemCount,
  decisionCount,
  minutesExcerpt,
  onViewFull,
}: MinutesPreviewProps) {
  const displayDate = new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const excerpt = minutesExcerpt.length > 200
    ? minutesExcerpt.slice(0, 200) + '...'
    : minutesExcerpt

  return (
    <div className="border-2 border-gray-200 rounded-2xl bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-[#0033A0]" />
          <div>
            <h4 className="text-sm font-bold text-gray-900">{committeeName}</h4>
            <p className="text-xs text-gray-500">
              Meeting #{meetingNumber} — {displayDate}
            </p>
          </div>
        </div>
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_STYLES[status] ?? STATUS_STYLES.draft}`}>
          {status}
        </span>
      </div>

      {/* Excerpt */}
      <div className="px-4 py-3">
        <p className="text-xs text-gray-600 leading-relaxed">{excerpt}</p>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <ListChecks className="size-3" />
            {actionItemCount} action{actionItemCount !== 1 ? 's' : ''}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <Vote className="size-3" />
            {decisionCount} decision{decisionCount !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={() => onViewFull(meetingId)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#0033A0] hover:underline"
        >
          View Full <ArrowRight className="size-3" />
        </button>
      </div>
    </div>
  )
}
