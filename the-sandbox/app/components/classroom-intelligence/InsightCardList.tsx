'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import type { InsightCardData } from '../../lib/classroom-intelligence/types'
import LoadingSpinner from '../LoadingSpinner'
import ErrorBanner from '../ErrorBanner'
import InsightCard from './InsightCard'

type FullInsight = InsightCardData & {
  id: string
  viewed: boolean
  course?: { title: string }
}

type Filter = 'all' | 'unread' | 'urgent'

interface InsightCardListProps {
  courseId?: string
  onRespond?: (id: string) => void
}

export default function InsightCardList({ courseId, onRespond }: InsightCardListProps) {
  const { currentUser } = useAuth()
  const [insights, setInsights] = useState<FullInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  const fetchInsights = useCallback(async () => {
    if (!currentUser?.email) return
    setLoading(true)
    setError(null)
    try {
      const params = courseId ? `?courseId=${courseId}` : ''
      const data = await apiFetch<FullInsight[]>(
        currentUser.email,
        `/api/classroom-intelligence/insights${params}`,
      )
      setInsights(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights')
    } finally {
      setLoading(false)
    }
  }, [currentUser?.email, courseId])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  const filtered = useMemo(() => {
    switch (filter) {
      case 'unread':
        return insights.filter((i) => !i.viewed)
      case 'urgent':
        return insights.filter((i) => i.urgency === 'immediate')
      default:
        return insights
    }
  }, [insights, filter])

  const unreadCount = useMemo(() => insights.filter((i) => !i.viewed).length, [insights])
  const urgentCount = useMemo(() => insights.filter((i) => i.urgency === 'immediate').length, [insights])

  const tabs: { key: Filter; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: insights.length },
    { key: 'unread', label: 'Unread', count: unreadCount },
    { key: 'urgent', label: 'Urgent', count: urgentCount },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" label="Loading insights…" />
      </div>
    )
  }

  if (error) {
    return <ErrorBanner message={error} retry={fetchInsights} />
  }

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              filter === t.key
                ? 'bg-[#0033A0] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
            {typeof t.count === 'number' && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                filter === t.key ? 'bg-white/20' : 'bg-gray-200'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No insights match this filter.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((card) => (
            <InsightCard
              key={card.id}
              card={card}
              onRespond={onRespond ?? (() => {})}
            />
          ))}
        </div>
      )}
    </div>
  )
}
