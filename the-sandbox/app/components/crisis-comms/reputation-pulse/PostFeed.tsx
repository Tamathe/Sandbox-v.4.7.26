'use client'

import { useState, useMemo } from 'react'
import { Filter, SortAsc, SortDesc } from 'lucide-react'
import PostCard from './PostCard'
import type { PostForClient, AIDetectionResult, SentimentResult } from '../../../lib/crisis-comms/reputation-pulse/types'

type FilterMode = 'all' | 'positive' | 'negative' | 'likely-ai'
type SortMode = 'time' | 'engagement' | 'ai-score'

interface Props {
  posts: PostForClient[]
  aiDetection: AIDetectionResult[]
  sentimentResults: SentimentResult[]
}

export default function PostFeed({ posts, aiDetection, sentimentResults }: Props) {
  const [filter, setFilter] = useState<FilterMode>('all')
  const [sort, setSort] = useState<SortMode>('time')
  const [sortAsc, setSortAsc] = useState(true)

  const aiMap = useMemo(() => new Map(aiDetection.map((r) => [r.postId, r])), [aiDetection])
  const sentimentMap = useMemo(() => new Map(sentimentResults.map((s) => [s.postId, s])), [sentimentResults])

  // Counts for filter pills
  const positiveCount = sentimentResults.filter((s) => s.sentiment === 'positive').length
  const negativeCount = sentimentResults.filter((s) => s.sentiment === 'negative').length
  const aiCount = aiDetection.filter((r) => r.verdict === 'likely-ai').length

  // Filter
  const filtered = useMemo(() => {
    return posts.filter((p) => {
      if (filter === 'all') return true
      if (filter === 'positive') return sentimentMap.get(p.id)?.sentiment === 'positive'
      if (filter === 'negative') return sentimentMap.get(p.id)?.sentiment === 'negative'
      if (filter === 'likely-ai') return aiMap.get(p.id)?.verdict === 'likely-ai'
      return true
    })
  }, [posts, filter, aiMap, sentimentMap])

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      let cmp = 0
      if (sort === 'time') {
        cmp = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      } else if (sort === 'engagement') {
        const engA = a.likes + a.shares + a.replies + a.quoteShares
        const engB = b.likes + b.shares + b.replies + b.quoteShares
        cmp = engA - engB
      } else if (sort === 'ai-score') {
        const aiA = aiMap.get(a.id)?.aiLikelihood ?? 0
        const aiB = aiMap.get(b.id)?.aiLikelihood ?? 0
        cmp = aiA - aiB
      }
      return sortAsc ? cmp : -cmp
    })
    return arr
  }, [filtered, sort, sortAsc, aiMap])

  return (
    <div className="space-y-3">
      {/* Filter + sort bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="size-4 text-gray-400" />
        {([
          { id: 'all' as FilterMode, label: `All (${posts.length})` },
          { id: 'positive' as FilterMode, label: `Positive (${positiveCount})` },
          { id: 'negative' as FilterMode, label: `Negative (${negativeCount})` },
          { id: 'likely-ai' as FilterMode, label: `AI Flagged (${aiCount})` },
        ]).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
              filter === f.id
                ? 'bg-[#0033A0] text-white border-[#0033A0]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#0033A0]'
            }`}
          >
            {f.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-1.5">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 outline-none focus:border-[#0033A0]"
          >
            <option value="time">Time</option>
            <option value="engagement">Engagement</option>
            <option value="ai-score">AI Score</option>
          </select>
          <button
            type="button"
            onClick={() => setSortAsc(!sortAsc)}
            className="p-1 rounded hover:bg-gray-100 text-gray-400"
          >
            {sortAsc ? <SortAsc className="size-4" /> : <SortDesc className="size-4" />}
          </button>
        </div>
      </div>

      {/* Post list */}
      <div className="space-y-2">
        {sorted.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            aiResult={aiMap.get(post.id)}
            sentiment={sentimentMap.get(post.id)}
          />
        ))}
        {sorted.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No posts match this filter.</p>
        )}
      </div>
    </div>
  )
}
