'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import InstitutionalReviewBadge from '../../components/InstitutionalReviewBadge'
import type { ReviewTool } from './types'

interface ReviewTabProps {
  reviewTools: ReviewTool[]
  reviewToolsLoading: boolean
  reviewActionLoading: string | null
  handleReviewAction: (toolId: string, action: 'approve-review' | 'flag-for-review' | 'clear-review') => void
}

export default function ReviewTab({
  reviewTools,
  reviewToolsLoading,
  reviewActionLoading,
  handleReviewAction,
}: ReviewTabProps) {
  const [showAllReview, setShowAllReview] = useState(false)
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-gray-900">Tools Requiring Institutional Review</h2>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-[#0033A0]">{reviewTools.length} tools</span>
        </div>

        {reviewToolsLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-gray-400" />
          </div>
        )}

        {!reviewToolsLoading && reviewTools.length === 0 && (
          <p className="text-sm text-gray-500">No tools flagged for institutional review.</p>
        )}

        <div className="space-y-3">
          {(showAllReview ? reviewTools : reviewTools.slice(0, 4)).map((rt) => (
            <div key={rt.id} className="flex flex-col gap-4 rounded-2xl border-2 border-gray-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-gray-900">{rt.name}</h3>
                  <InstitutionalReviewBadge tool={rt} />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  By {rt.creator.name} · {rt.category} · Created {format(new Date(rt.createdAt), 'MMM d, yyyy')}
                </p>
                {rt.reviewedBy && rt.reviewedAt && (
                  <p className="mt-0.5 text-xs text-gray-400">
                    Reviewed by {rt.reviewedBy} on {format(new Date(rt.reviewedAt), 'MMM d, yyyy')}
                    {rt.reviewExpiresAt && ` · Expires ${format(new Date(rt.reviewExpiresAt), 'MMM d, yyyy')}`}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {!rt.reviewedAt && (
                  <button
                    type="button"
                    onClick={() => void handleReviewAction(rt.id, 'approve-review')}
                    disabled={reviewActionLoading === `${rt.id}-approve-review`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {reviewActionLoading === `${rt.id}-approve-review` ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                    Mark Reviewed
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleReviewAction(rt.id, 'clear-review')}
                  disabled={reviewActionLoading === `${rt.id}-clear-review`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:border-red-300 hover:text-red-600 disabled:opacity-60"
                >
                  {reviewActionLoading === `${rt.id}-clear-review` ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-3.5" />}
                  Clear Requirement
                </button>
              </div>
            </div>
          ))}
          {reviewTools.length > 4 && (
            <button
              onClick={() => setShowAllReview(v => !v)}
              className="w-full py-2 text-sm font-medium text-[#0033A0] hover:bg-blue-50 rounded-lg transition-colors"
            >
              {showAllReview ? 'Show less' : `Show all ${reviewTools.length} tools for review`}
            </button>
          )}
        </div>
      </section>

      {/* Flag any tool for review */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <h2 className="text-base font-extrabold text-gray-900 mb-4">Flag a Tool for Review</h2>
        <p className="text-sm text-gray-500 mb-4">
          Select a tool from the All Tools list (Moderation tab) to flag it for institutional review. Or use the API directly: <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">PATCH /api/admin/tools/:id/review</code> with <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{'{ "action": "flag-for-review" }'}</code>
        </p>
      </section>
    </div>
  )
}
