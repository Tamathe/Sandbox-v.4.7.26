'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  ClipboardCheck,
  Clock,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react'
interface GradingQueueItem {
  id: string
  studentName: string
  assignmentTitle: string
  courseCode: string
  courseId: string
  submittedAt: string
  status: 'AI_DRAFT' | 'PENDING_REVIEW'
  hasAiDraft: boolean
  aiDraftSummary: string | null
  daysWaiting: number
}

interface GradingQueueSummary {
  total: number
  aiDrafted: number
  manualReview: number
  oldestDays: number
}

interface GradingQueueData {
  items: GradingQueueItem[]
  summary: GradingQueueSummary
}

interface GradingQueueProps {
  open: boolean
  onClose: () => void
  userEmail?: string
}

export default function GradingQueue({ open, onClose, userEmail }: GradingQueueProps) {
  const [data, setData] = useState<GradingQueueData | null>(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'AI_DRAFT' | 'PENDING_REVIEW'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/faculty/grading-queue', {
        headers: userEmail ? { 'x-demo-user-email': userEmail } : {},
      })
      if (res.ok) {
        setData(await res.json())
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [userEmail])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  if (!open) return null

  const filteredItems = data?.items.filter((item) =>
    filter === 'all' ? true : item.status === filter,
  ) ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-[#0033A0]/10 text-[#0033A0]">
              <ClipboardCheck className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-gray-900">Grading Queue</h2>
              {data && (
                <p className="text-sm text-gray-500">
                  {data.summary.total} pending: {data.summary.aiDrafted} AI-drafted, {data.summary.manualReview} manual
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Filter pills */}
        {data && data.summary.total > 0 && (
          <div className="flex gap-2 border-b border-gray-100 px-6 py-3">
            {(['all', 'AI_DRAFT', 'PENDING_REVIEW'] as const).map((f) => {
              const labels: Record<typeof f, string> = {
                all: `All (${data.summary.total})`,
                AI_DRAFT: `AI-drafted (${data.summary.aiDrafted})`,
                PENDING_REVIEW: `Manual (${data.summary.manualReview})`,
              }
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    filter === f
                      ? 'bg-[#0033A0] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {labels[f]}
                </button>
              )
            })}
          </div>
        )}

        {/* Content */}
        <div className="max-h-[50vh] overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-[#0033A0]" />
            </div>
          ) : !data || data.summary.total === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              No pending submissions to grade. You&apos;re all caught up!
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              No items match this filter.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/courses?course=${item.courseId}&tab=gradebook&status=pending`}
                  onClick={onClose}
                  className="group flex items-center gap-4 rounded-xl border border-gray-100 bg-white px-4 py-3 transition-colors hover:border-[#0033A0]/20 hover:bg-blue-50/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 truncate">
                        {item.studentName}
                      </span>
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">
                        {item.courseCode}
                      </span>
                      {item.hasAiDraft && (
                        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          <Sparkles className="size-3" />
                          AI draft
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500 truncate">{item.assignmentTitle}</p>
                    {item.aiDraftSummary && (
                      <p className="mt-1 text-xs text-gray-400 truncate italic">
                        {item.aiDraftSummary}...
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                      item.daysWaiting > 3 ? 'text-red-600' : item.daysWaiting > 1 ? 'text-amber-600' : 'text-gray-400'
                    }`}>
                      <Clock className="size-3" />
                      {item.daysWaiting}d
                    </span>
                    <ArrowRight className="size-4 text-gray-300 transition-colors group-hover:text-[#0033A0]" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {data && data.summary.oldestDays > 3 && (
          <div className="border-t border-gray-100 px-6 py-3">
            <p className="text-xs text-amber-600">
              Oldest submission waiting {data.summary.oldestDays} days
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
