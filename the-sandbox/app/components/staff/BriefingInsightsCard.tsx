'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Users,
  Building,
  Shield,
  ClipboardCheck,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

export interface BriefingInsight {
  id: string
  category: string
  title: string
  narrative: string
  sentiment: string | null
  delta: string | null
  dataPoints?: Record<string, unknown> | null
  isRead?: boolean
}

interface BriefingInsightsCardProps {
  /** If provided, uses these instead of fetching. */
  insights?: BriefingInsight[]
  /** Required when self-fetching; ignored when insights prop is provided. */
  userEmail?: string
}

const CATEGORY_ICON: Record<string, typeof TrendingUp> = {
  enrollment: TrendingUp,
  budget: DollarSign,
  hr: Users,
  facilities: Building,
  'campus-safety': Shield,
  compliance: ClipboardCheck,
}

const SENTIMENT_BADGE: Record<string, string> = {
  positive: 'bg-emerald-100 text-emerald-700',
  negative: 'bg-red-100 text-red-700',
  neutral: 'bg-gray-100 text-gray-600',
}

const SENTIMENT_ICON: Record<string, typeof TrendingUp> = {
  positive: TrendingUp,
  negative: TrendingDown,
  neutral: Minus,
}

const DISMISSED_KEY = 'staff-dismissed-insights'

function getDismissed(): Set<string> {
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch { return new Set() }
}

function saveDismissed(ids: Set<string>) {
  try { sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids])) } catch { /* ignore */ }
}

export default function BriefingInsightsCard({ insights: propInsights, userEmail }: BriefingInsightsCardProps = {}) {
  const { currentUser } = useAuth()
  const email = userEmail ?? currentUser.email
  const [fetchedInsights, setFetchedInsights] = useState<BriefingInsight[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(!propInsights)
  const [collapsed, setCollapsed] = useState(false)

  const insights = propInsights ?? fetchedInsights

  const fetchInsights = useCallback(async () => {
    if (propInsights) return
    setLoading(true)
    try {
      const res = await fetch('/api/staff/briefing/insights', {
        headers: { 'x-demo-user-email': email },
      })
      if (res.ok) {
        const data = await res.json() as { insights: BriefingInsight[] }
        setFetchedInsights(data.insights)
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [email, propInsights])

  useEffect(() => {
    setDismissed(getDismissed())
    void fetchInsights()
  }, [fetchInsights])

  const handleDismiss = useCallback((id: string) => {
    setDismissed(prev => {
      const next = new Set(prev)
      next.add(id)
      saveDismissed(next)
      return next
    })
  }, [])

  const visible = insights.filter(i => !dismissed.has(i.id))

  return (
    <div className="border-2 border-gray-200 rounded-2xl p-5">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center justify-between w-full text-left"
      >
        <h2 className="text-lg font-extrabold text-gray-900">Overnight Changes</h2>
        {collapsed ? <ChevronDown className="size-5 text-gray-400" /> : <ChevronUp className="size-5 text-gray-400" />}
      </button>

      {!collapsed && (
        <div className="mt-4 space-y-3">
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex gap-3 items-start">
                <div className="size-8 bg-gray-200 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                </div>
              </div>
            ))
          ) : visible.length === 0 ? (
            <p className="text-sm text-gray-400">No new overnight changes.</p>
          ) : (
            visible.map(insight => {
              const CatIcon = CATEGORY_ICON[insight.category] ?? TrendingUp
              const sentiment = insight.sentiment ?? 'neutral'
              const SentIcon = SENTIMENT_ICON[sentiment] ?? Minus
              return (
                <div key={insight.id} className="flex items-start gap-3 group">
                  <div className="size-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <CatIcon className="size-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">{insight.title}</span>
                      {insight.delta && (
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold ${SENTIMENT_BADGE[sentiment] ?? SENTIMENT_BADGE.neutral}`}>
                          <SentIcon className="size-3" />
                          {insight.delta}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed mt-0.5">{insight.narrative}</p>
                  </div>
                  <button
                    onClick={() => handleDismiss(insight.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-500 transition-opacity flex-shrink-0 mt-1"
                    aria-label="Dismiss insight"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
