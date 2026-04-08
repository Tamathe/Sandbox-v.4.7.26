'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { subDays, format } from 'date-fns'
import { useAuth } from '../lib/auth-context'
import TimelineFilters, { type TimelineFilterState, type TimelineEventType } from '../components/timeline/TimelineFilters'
import TimelineChart from '../components/timeline/TimelineChart'
import TimelineStream from '../components/timeline/TimelineStream'
import TimelineInsights from '../components/timeline/TimelineInsights'
import { Clock, Loader2, Sparkles } from 'lucide-react'

interface TimelineEvent {
  id: string
  timestamp: string
  type: string
  courseCode?: string
  title: string
  description: string
  magnitude: 'minor' | 'notable' | 'breakthrough'
  metadata: Record<string, unknown>
}

interface TimelineStats {
  totalSessions: number
  conceptsMastered: number
  transferEvents: number
  misconceptionsOvercome: number
  bloomPeak: number
  longestStreak: number
}

interface EnrolledCourse {
  courseId: string
  courseCode: string
  title: string
}

const ALL_TYPES: TimelineEventType[] = [
  'session', 'mastery_jump', 'transfer', 'misconception_cleared', 'bloom_advance', 'study_plan',
]

const LIMIT = 50

export default function TimelinePage() {
  const { currentUser } = useAuth()

  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [stats, setStats] = useState<TimelineStats | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [courses, setCourses] = useState<EnrolledCourse[]>([])
  const [insightText, setInsightText] = useState<string | null>(null)
  const insightGeneratedRef = useRef(false)

  const today = new Date()
  const [filters, setFilters] = useState<TimelineFilterState>({
    courseId: undefined,
    from: format(subDays(today, 90), 'yyyy-MM-dd'),
    to: format(today, 'yyyy-MM-dd'),
    types: new Set(ALL_TYPES),
  })

  // Fetch enrolled courses for filter dropdown
  useEffect(() => {
    if (currentUser.role !== 'STUDENT' && currentUser.role !== 'ADMIN') return
    fetch('/api/enrollment', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.courses)) {
          setCourses(data.courses.map((c: { courseId: string; courseCode: string; title: string }) => ({
            courseId: c.courseId,
            courseCode: c.courseCode,
            title: c.title,
          })))
        }
      })
      .catch(() => {})
  }, [currentUser.email, currentUser.role])

  const fetchTimeline = useCallback(
    async (newOffset: number, append: boolean) => {
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      const params = new URLSearchParams()
      if (filters.courseId) params.set('courseId', filters.courseId)
      if (filters.from) params.set('from', new Date(filters.from).toISOString())
      if (filters.to) params.set('to', new Date(filters.to).toISOString())
      params.set('limit', String(LIMIT))
      params.set('offset', String(newOffset))

      const activeTypes = Array.from(filters.types)
      if (activeTypes.length > 0 && activeTypes.length < ALL_TYPES.length) {
        params.set('types', activeTypes.join(','))
      }

      try {
        const res = await fetch(`/api/timeline?${params.toString()}`, {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (!res.ok) throw new Error('Failed to fetch timeline')
        const data = await res.json()

        if (append) {
          setEvents((prev) => [...prev, ...data.events])
        } else {
          setEvents(data.events)
          setStats(data.stats)
        }
        setHasMore(data.hasMore)
        setOffset(newOffset + (data.events?.length ?? 0))
      } catch {
        // silently fail — empty state handles it
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [filters, currentUser.email]
  )

  // Re-fetch when filters change
  useEffect(() => {
    setOffset(0)
    fetchTimeline(0, false)
  }, [fetchTimeline])

  // Generate AI insight summary once from initial stats + events (cached)
  useEffect(() => {
    if (insightGeneratedRef.current || !stats || events.length === 0) return
    insightGeneratedRef.current = true

    const breakthroughs = events.filter((e) => e.magnitude === 'breakthrough')
    const transfers = events.filter((e) => e.type === 'transfer')
    const masteryJumps = events.filter((e) => e.type === 'mastery_jump')

    const parts: string[] = []
    parts.push(`completed ${stats.totalSessions} session${stats.totalSessions !== 1 ? 's' : ''}`)

    if (stats.conceptsMastered > 0) {
      parts.push(`mastered ${stats.conceptsMastered} concept${stats.conceptsMastered !== 1 ? 's' : ''}`)
    }
    if (transfers.length > 0) {
      const concepts = transfers.map((t) => t.metadata.concept as string).filter(Boolean)
      parts.push(
        `transferred knowledge${concepts.length > 0 ? ` in ${concepts.slice(0, 2).join(' and ')}` : ` ${transfers.length} time${transfers.length !== 1 ? 's' : ''}`}`
      )
    }
    if (masteryJumps.length > 0) {
      parts.push(`had ${masteryJumps.length} breakthrough${masteryJumps.length !== 1 ? 's' : ''}`)
    }
    if (stats.misconceptionsOvercome > 0) {
      parts.push(`overcame ${stats.misconceptionsOvercome} misconception${stats.misconceptionsOvercome !== 1 ? 's' : ''}`)
    }
    if (stats.longestStreak > 1) {
      parts.push(`maintained a ${stats.longestStreak}-day learning streak`)
    }

    const summary = `This month you ${parts.join(', ')}.`
    const encouragement = breakthroughs.length > 0
      ? ' Your persistence is paying off — keep building on those breakthroughs!'
      : stats.conceptsMastered > 3
        ? ' Great momentum — your mastery is growing steadily.'
        : ' Every session builds your understanding.'

    setInsightText(summary + encouragement)
  }, [stats, events])

  function handleLoadMore() {
    fetchTimeline(offset, true)
  }

  // Guard: only STUDENT or ADMIN
  if (currentUser.role !== 'STUDENT' && currentUser.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-3">
              <Clock className="size-6 text-[#0033A0]" />
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900">Learning Time Machine</h1>
                <p className="text-sm text-gray-500 mt-1">Your learning journey, visualized</p>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <p className="text-gray-500">This page is available for students.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Pattern A Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <Clock className="size-6 text-[#0033A0]" />
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Learning Time Machine</h1>
              <p className="text-sm text-gray-500 mt-1">Your learning journey, visualized</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main column */}
          <div className="flex-1 min-w-0 space-y-5">
            <TimelineFilters
              courses={courses}
              filters={filters}
              onChange={setFilters}
            />

            <TimelineChart events={events} />

            {/* AI-generated insight summary */}
            {insightText && (
              <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="size-4 text-[#0033A0]" />
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{insightText}</p>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-6 text-[#0033A0] animate-spin" />
              </div>
            ) : (
              <>
                <TimelineStream events={events} />

                {hasMore && (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="px-6 py-2 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:border-[#0033A0] hover:text-[#0033A0] transition-colors disabled:opacity-50"
                    >
                      {loadingMore ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="size-4 animate-spin" /> Loading…
                        </span>
                      ) : (
                        'Load More'
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="lg:sticky lg:top-6">
              <TimelineInsights stats={stats} loading={loading} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
