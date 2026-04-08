'use client'

import { Clock, CheckCircle2, AlertTriangle } from 'lucide-react'

interface ReviewableTool {
  requiresInstitutionalReview?: boolean
  reviewedAt?: string | null
  reviewedBy?: string | null
  reviewExpiresAt?: string | null
}

export default function InstitutionalReviewBadge({ tool }: { tool: ReviewableTool }) {
  if (!tool.requiresInstitutionalReview) return null

  const now = new Date()
  const isExpired = tool.reviewExpiresAt && new Date(tool.reviewExpiresAt) < now
  const isReviewed = tool.reviewedAt && !isExpired

  if (isExpired) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
        <AlertTriangle className="size-3" />
        Review Expired
      </span>
    )
  }

  if (isReviewed) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
        title={`Reviewed by ${tool.reviewedBy ?? 'unknown'} on ${new Date(tool.reviewedAt!).toLocaleDateString()}`}
      >
        <CheckCircle2 className="size-3" />
        Reviewed
      </span>
    )
  }

  // requiresInstitutionalReview is true but not yet reviewed
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
      <Clock className="size-3" />
      Under Review
    </span>
  )
}
