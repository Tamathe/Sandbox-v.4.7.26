'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'

const SpreadTimelineChart = dynamic(
  () => import('./SpreadTimelineChart').then(m => m.SpreadTimelineChart),
  { ssr: false, loading: () => <div className="h-[180px] animate-pulse rounded-xl bg-gray-100" /> }
)
import type { PostForClient, SentimentResult } from '../../../lib/crisis-comms/reputation-pulse/types'

interface Props {
  posts: PostForClient[]
  sentimentResults: SentimentResult[]
}

interface TimelineBucket {
  hour: number
  label: string
  positive: number
  neutral: number
  negative: number
  total: number
}

export default function SpreadTimeline({ posts, sentimentResults }: Props) {
  const sentimentMap = useMemo(() => new Map(sentimentResults.map((s) => [s.postId, s])), [sentimentResults])

  const data = useMemo(() => {
    if (posts.length === 0) return []

    const timestamps = posts.map((p) => new Date(p.timestamp).getTime())
    const minTime = Math.min(...timestamps)
    const maxTime = Math.max(...timestamps)
    const rangeHours = Math.max(1, Math.ceil((maxTime - minTime) / 3_600_000))

    // Bucket by day for 7-day windows, shorter intervals for smaller ranges
    let bucketHours: number
    if (rangeHours <= 24) bucketHours = 1
    else if (rangeHours <= 72) bucketHours = 3
    else bucketHours = 24

    const bucketCount = Math.ceil(rangeHours / bucketHours) + 1
    const buckets: TimelineBucket[] = Array.from({ length: bucketCount }, (_, i) => ({
      hour: i * bucketHours,
      label: formatHourLabel(i * bucketHours, new Date(minTime)),
      positive: 0,
      neutral: 0,
      negative: 0,
      total: 0,
    }))

    for (const post of posts) {
      const hoursSinceStart = (new Date(post.timestamp).getTime() - minTime) / 3_600_000
      const bucketIdx = Math.min(Math.floor(hoursSinceStart / bucketHours), bucketCount - 1)

      const sentiment = sentimentMap.get(post.id)?.sentiment ?? 'neutral'
      if (sentiment === 'positive') buckets[bucketIdx].positive += 1
      else if (sentiment === 'negative') buckets[bucketIdx].negative += 1
      else buckets[bucketIdx].neutral += 1
      buckets[bucketIdx].total += 1
    }

    return buckets
  }, [posts, sentimentMap])

  if (data.length === 0) return null

  const peakBucket = data.reduce((max, b) => (b.total > max.total ? b : max), data[0])

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900">Spread Timeline</h3>
        <span className="text-xs text-gray-400">Peak at {peakBucket.label} ({peakBucket.total} posts)</span>
      </div>
      <SpreadTimelineChart data={data} />
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-green-500" /> Positive
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-slate-400" /> Neutral
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-red-500" /> Negative
        </span>
      </div>
    </div>
  )
}

function formatHourLabel(hours: number, start: Date): string {
  const d = new Date(start.getTime() + hours * 3_600_000)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
