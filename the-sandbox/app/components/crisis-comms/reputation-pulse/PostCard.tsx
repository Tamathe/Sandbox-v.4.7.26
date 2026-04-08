'use client'

import { useState } from 'react'
import { Heart, Repeat2, MessageCircle, Quote, BadgeCheck, MapPin } from 'lucide-react'
import type { PostForClient, AIDetectionResult, SentimentResult } from '../../../lib/crisis-comms/reputation-pulse/types'

const PLATFORM_COLORS: Record<string, string> = {
  twitter: 'bg-sky-100 text-sky-800',
  reddit: 'bg-orange-100 text-orange-800',
  facebook: 'bg-blue-100 text-blue-800',
  instagram: 'bg-pink-100 text-pink-800',
  'news-comment': 'bg-gray-100 text-gray-800',
  tiktok: 'bg-fuchsia-100 text-fuchsia-800',
}

const AI_VERDICT_COLORS: Record<string, string> = {
  'likely-human': 'bg-green-100 text-green-800 border-green-200',
  'inconclusive': 'bg-amber-100 text-amber-800 border-amber-200',
  'likely-ai': 'bg-red-100 text-red-800 border-red-200',
}

const AI_VERDICT_LABELS: Record<string, string> = {
  'likely-human': 'Human',
  'inconclusive': 'Unsure',
  'likely-ai': 'Likely AI',
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: 'bg-green-100 text-green-800',
  negative: 'bg-red-100 text-red-800',
  neutral: 'bg-gray-100 text-gray-600',
}

interface Props {
  post: PostForClient
  aiResult?: AIDetectionResult
  sentiment?: SentimentResult
}

export default function PostCard({ post, aiResult, sentiment }: Props) {
  const [expanded, setExpanded] = useState(false)

  const relativeTime = getRelativeTime(post.timestamp)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
      {/* Author row */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold ${post.hasProfilePhoto ? 'bg-[#0033A0]/10 text-[#0033A0]' : 'bg-gray-200 text-gray-500'}`}>
          {post.authorDisplayName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-gray-900 truncate">{post.authorDisplayName}</span>
            {post.platformVerified && <BadgeCheck className="size-3.5 text-blue-500 shrink-0" />}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span>{post.authorHandle}</span>
            <span>&middot;</span>
            <span>{relativeTime}</span>
          </div>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${PLATFORM_COLORS[post.platform] ?? 'bg-gray-100 text-gray-600'}`}>
          {post.platform}
        </span>
      </div>

      {/* Post text */}
      <p className="text-sm text-gray-800 mb-2 whitespace-pre-wrap">{post.text}</p>

      {/* Hashtags */}
      {post.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {post.hashtags.map((tag) => (
            <span key={tag} className="text-xs text-[#0033A0] font-medium">{tag}</span>
          ))}
        </div>
      )}

      {/* Badges row */}
      <div className="flex items-center gap-2 mb-2">
        {sentiment && (
          <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${SENTIMENT_COLORS[sentiment.sentiment]}`}>
            {sentiment.sentiment.charAt(0).toUpperCase() + sentiment.sentiment.slice(1)}
          </span>
        )}
        {aiResult && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${AI_VERDICT_COLORS[aiResult.verdict]}`}
          >
            {AI_VERDICT_LABELS[aiResult.verdict]}
            <span className="opacity-60">{Math.round(aiResult.aiLikelihood * 100)}%</span>
          </button>
        )}
      </div>

      {/* Engagement row */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        {post.likes >= 0 && (
          <span className="flex items-center gap-1"><Heart className="size-3" />{formatCount(post.likes)}</span>
        )}
        {post.shares >= 0 && (
          <span className="flex items-center gap-1"><Repeat2 className="size-3" />{formatCount(post.shares)}</span>
        )}
        {post.replies >= 0 && (
          <span className="flex items-center gap-1"><MessageCircle className="size-3" />{formatCount(post.replies)}</span>
        )}
        {post.quoteShares > 0 && (
          <span className="flex items-center gap-1"><Quote className="size-3" />{formatCount(post.quoteShares)}</span>
        )}
        {post.locationHint && (
          <span className="flex items-center gap-1 ml-auto"><MapPin className="size-3" />{post.locationHint}</span>
        )}
      </div>

      {/* Expanded AI explanation */}
      {expanded && aiResult && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
          <p className="text-xs text-gray-600">{aiResult.explanation}</p>
          <div className="flex flex-wrap gap-1">
            {aiResult.topSignals.map((signal) => (
              <span key={signal} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {signal}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>Account age: {post.accountAgeDays >= 0 ? `${post.accountAgeDays}d` : 'unknown'}</span>
            <span>Followers: {post.followerCount >= 0 ? formatCount(post.followerCount) : 'unknown'}</span>
            <span>Confidence: {aiResult.confidence}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function getRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}
