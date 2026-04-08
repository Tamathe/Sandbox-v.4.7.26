'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Megaphone,
  MessageCircle,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import type { EngagementDiagnostic } from '../../lib/faculty/homepage-types'
import { useAuth } from '../../lib/auth-context'

interface InlineAnalyticsPanelProps {
  courseCode: string
  courseId: string
  direction: 'dropped' | 'increased'
  amount: number
  pct: number
  onPostAction?: (payload: Record<string, unknown>) => void
  onNudgeAction?: (payload: Record<string, unknown>) => void
}

export default function InlineAnalyticsPanel({
  courseCode,
  courseId,
  direction,
  amount,
  pct,
  onPostAction,
  onNudgeAction,
}: InlineAnalyticsPanelProps) {
  const { currentUser } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [diagnostic, setDiagnostic] = useState<EngagementDiagnostic | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!expanded || diagnostic) return

    setLoading(true)
    fetch(`/api/faculty/engagement-diagnostic?courseId=${courseId}&courseCode=${courseCode}`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setDiagnostic(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [expanded, diagnostic, courseId, courseCode, currentUser.email])

  const handleAction = (action: EngagementDiagnostic['suggestedActions'][number]) => {
    if (action.actionType === 'post' && onPostAction) {
      onPostAction(action.payload)
    } else if (action.actionType === 'nudge' && onNudgeAction) {
      onNudgeAction(action.payload)
    }
    // navigate actions are handled by the Link component in the render
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
      {/* Clickable insight line */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-gray-100"
      >
        <p className="text-sm text-gray-700">
          <span className="font-semibold">{courseCode}</span> engagement {direction}{' '}
          <span className={`font-bold ${direction === 'dropped' ? 'text-red-600' : 'text-green-600'}`}>
            {amount}%
          </span>{' '}
          this week
        </p>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#0033A0]/10 px-2.5 py-1 text-xs font-semibold text-[#0033A0]">
            Why?
          </span>
          {expanded ? (
            <ChevronUp className="size-4 text-gray-400" />
          ) : (
            <ChevronDown className="size-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expandable diagnostic panel */}
      {expanded && (
        <div className="border-t border-gray-200 bg-white px-5 py-4">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 w-48 rounded bg-gray-200" />
              <div className="h-16 rounded bg-gray-100" />
              <div className="h-4 w-36 rounded bg-gray-200" />
            </div>
          ) : diagnostic ? (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-900">
                  Engagement Diagnostic — {diagnostic.courseCode}
                </h4>
                <span className="text-xs text-gray-500">
                  {diagnostic.currentEngagement}% current
                </span>
              </div>

              {/* Trend + Sparkline */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {diagnostic.weekOverWeekDelta < 0 ? (
                    <TrendingDown className="size-4 text-red-500" />
                  ) : (
                    <TrendingUp className="size-4 text-green-500" />
                  )}
                  <span className="text-sm text-gray-700">
                    <span className="font-semibold">{diagnostic.previousEngagement}%</span>
                    {' → '}
                    <span className="font-semibold">{diagnostic.currentEngagement}%</span>
                  </span>
                </div>

                {/* Mini sparkline */}
                <div className="flex items-end gap-0.5 h-8">
                  {diagnostic.sparkline.map((value, i) => {
                    const maxVal = Math.max(...diagnostic.sparkline, 1)
                    const height = Math.max(4, (value / maxVal) * 32)
                    const isLast = i === diagnostic.sparkline.length - 1
                    return (
                      <div
                        key={i}
                        className={`w-3 rounded-sm ${
                          isLast
                            ? diagnostic.weekOverWeekDelta < 0
                              ? 'bg-red-400'
                              : 'bg-green-400'
                            : 'bg-gray-300'
                        }`}
                        style={{ height: `${height}px` }}
                        title={`Week ${i + 1}: ${value}%`}
                      />
                    )
                  })}
                </div>
                <span className="text-[10px] text-gray-400">6-week trend</span>
              </div>

              {/* Likely Causes */}
              {diagnostic.likelyCauses.length > 0 && (
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                    Likely Causes
                  </h5>
                  <div className="space-y-1.5">
                    {diagnostic.likelyCauses.map((cause, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <AlertTriangle
                          className={`mt-0.5 size-3.5 shrink-0 ${
                            cause.severity === 'high'
                              ? 'text-red-500'
                              : cause.severity === 'medium'
                                ? 'text-amber-500'
                                : 'text-gray-400'
                          }`}
                        />
                        <span className="text-gray-700">{cause.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Actions */}
              <div className="flex flex-wrap gap-2 pt-1">
                {diagnostic.suggestedActions.map((action, i) => {
                  if (action.actionType === 'navigate') {
                    return (
                      <Link
                        key={i}
                        href={String(action.payload.href ?? '/analytics/faculty')}
                        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:border-[#0033A0] hover:bg-[#0033A0]/5 hover:text-[#0033A0]"
                      >
                        <BarChart3 className="size-3" />
                        {action.label}
                      </Link>
                    )
                  }

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleAction(action)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#0033A0]/20 bg-[#0033A0]/5 px-3 py-1.5 text-xs font-semibold text-[#0033A0] transition-colors hover:bg-[#0033A0] hover:text-white"
                    >
                      {action.actionType === 'post' ? (
                        <Megaphone className="size-3" />
                      ) : (
                        <MessageCircle className="size-3" />
                      )}
                      {action.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Unable to load diagnostic data.</p>
          )}
        </div>
      )}
    </div>
  )
}
