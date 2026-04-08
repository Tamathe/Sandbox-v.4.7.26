'use client'

import { useEffect, useState } from 'react'
import { BookOpen, Clock, AlertTriangle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// Bloom level metadata
const BLOOM_LEVELS = [
  { level: 1, label: 'Remember',  color: '#94A3B8' },
  { level: 2, label: 'Understand', color: '#60A5FA' },
  { level: 3, label: 'Apply',     color: '#34D399' },
  { level: 4, label: 'Analyze',   color: '#FBBF24' },
  { level: 5, label: 'Evaluate',  color: '#F97316' },
  { level: 6, label: 'Create',    color: '#A78BFA' },
]

type ConceptEntry = {
  conceptSlug: string
  courseId: string
  courseCode: string
  bloomHighWater: number | null
  nextReviewAt: string | null
  missedReviews: number
  stabilityFactor: number
  isOverdue: boolean
  sessionCount: number
  lastTouchedAt: string | null
}

function conceptLabel(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function BloomBar({ bloomHighWater }: { bloomHighWater: number | null }) {
  return (
    <div className="flex items-center gap-1">
      {BLOOM_LEVELS.map(({ level, label, color }) => {
        const filled = bloomHighWater !== null && level <= bloomHighWater
        return (
          <div
            key={level}
            title={`L${level}: ${label}`}
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              backgroundColor: filled ? color : '#F1F5F9',
              border: `1.5px solid ${filled ? color : '#E2E8F0'}`,
              flexShrink: 0,
            }}
          />
        )
      })}
      {bloomHighWater !== null && (
        <span className="ml-1.5 text-[10px] font-semibold text-gray-500">
          L{bloomHighWater} · {BLOOM_LEVELS[bloomHighWater - 1]?.label}
        </span>
      )}
      {bloomHighWater === null && (
        <span className="ml-1.5 text-[10px] text-gray-400">No level recorded</span>
      )}
    </div>
  )
}

interface Props {
  userEmail: string
  userId?: string
}

export default function ConceptTimelinePanel({ userEmail, userId }: Props) {
  const [concepts, setConcepts] = useState<ConceptEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const url = userId
      ? `/api/analytics/student/concept-timeline?userId=${encodeURIComponent(userId)}`
      : '/api/analytics/student/concept-timeline'
    fetch(url, { headers: { 'x-demo-user-email': userEmail } })
      .then((r) => r.json())
      .then((data: { concepts?: ConceptEntry[] }) => {
        setConcepts(data.concepts ?? [])
      })
      .catch(() => setConcepts([]))
      .finally(() => setLoading(false))
  }, [userEmail, userId])

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  if (concepts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <BookOpen className="size-10 text-gray-200 mb-3" />
        <p className="text-sm font-semibold text-gray-500">No concept data yet</p>
        <p className="text-xs text-gray-400 mt-1 max-w-xs">
          Use course-linked tools to start building your concept map. Each session tracks which
          concepts you engage with.
        </p>
      </div>
    )
  }

  // Group by courseCode
  const byCourse = concepts.reduce<Record<string, ConceptEntry[]>>((acc, c) => {
    const key = c.courseCode
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {Object.entries(byCourse).map(([courseCode, entries]) => (
        <div key={courseCode} className="bg-white rounded-2xl border-2 border-gray-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
            {courseCode}
          </p>
          <div className="space-y-4">
            {entries.map((c) => (
              <div key={c.conceptSlug} className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800">
                    {conceptLabel(c.conceptSlug)}
                  </span>
                  {c.isOverdue && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                      <AlertTriangle className="size-2.5" />
                      Due for review
                    </span>
                  )}
                  {c.missedReviews > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                      Missed ×{c.missedReviews}
                    </span>
                  )}
                </div>
                <BloomBar bloomHighWater={c.bloomHighWater} />
                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                  <Clock className="size-2.5 flex-shrink-0" />
                  <span>
                    {c.sessionCount} session{c.sessionCount !== 1 ? 's' : ''}
                    {c.lastTouchedAt && (
                      <>
                        {' · '}Last seen{' '}
                        {formatDistanceToNow(new Date(c.lastTouchedAt), { addSuffix: true })}
                      </>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
