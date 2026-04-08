'use client'

import { useState, useEffect } from 'react'
import { Trophy, MessageSquareText, FolderHeart, Lightbulb, MapPin, ThumbsUp, Heart } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import LoadingSpinner from '../LoadingSpinner'
import ErrorBanner from '../ErrorBanner'

interface Impact {
  feedbackGiven: number
  collectionsCreated: number
  collectionsSaved: number
  totalCollectionItems: number
  suggestionsSubmitted: number
  suggestionUpvotesReceived: number
  campusTipsShared: number
  campusTipUpvotesReceived: number
  topSuggestion: { suggestion: string; upvoteCount: number } | null
  topTip: { content: string; upvoteCount: number } | null
  impactScore: number
}

const STAT_CARDS = [
  { key: 'feedbackGiven', label: 'Feedback Given', icon: MessageSquareText, color: 'text-blue-600 bg-blue-50' },
  { key: 'collectionsCreated', label: 'Collections Created', icon: FolderHeart, color: 'text-purple-600 bg-purple-50' },
  { key: 'collectionsSaved', label: 'Collection Saves', icon: Heart, color: 'text-pink-600 bg-pink-50' },
  { key: 'suggestionsSubmitted', label: 'Suggestions Made', icon: Lightbulb, color: 'text-amber-600 bg-amber-50' },
  { key: 'suggestionUpvotesReceived', label: 'Suggestion Upvotes', icon: ThumbsUp, color: 'text-green-600 bg-green-50' },
  { key: 'campusTipsShared', label: 'Campus Tips Shared', icon: MapPin, color: 'text-red-600 bg-red-50' },
] as const

export default function ImpactTab() {
  const { currentUser } = useAuth()
  const [impact, setImpact] = useState<Impact | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false
    apiFetch<Impact>(currentUser.email, '/api/contribute/impact', { signal: controller.signal })
      .then((data) => { if (!cancelled) setImpact(data) })
      .catch((err) => {
        if (err.name === 'AbortError') return
        if (!cancelled) setError('Failed to load impact data')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true; controller.abort() }
  }, [currentUser.email])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorBanner message={error} />
  if (!impact) return null

  const hasActivity = impact.impactScore > 0

  return (
    <div className="space-y-8">
      {/* Hero impact card */}
      <div className="border rounded-2xl shadow-sm bg-gradient-to-br from-[#0033A0] to-[#002878] p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-white/20">
            <Trophy className="size-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold">Your Impact</h2>
            <p className="text-sm text-white/70">
              {hasActivity
                ? 'Your contributions make the platform better for every Wildcat.'
                : 'Start contributing to see your impact grow.'}
            </p>
          </div>
        </div>

        {hasActivity && (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {STAT_CARDS.map(({ key, label, icon: Icon }) => {
              const value = impact[key as keyof Impact] as number
              if (value === 0) return null
              return (
                <div key={key} className="bg-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="size-4 text-white/70" />
                    <span className="text-xs text-white/70">{label}</span>
                  </div>
                  <p className="text-2xl font-extrabold">{value}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Highlights */}
      {(impact.topSuggestion || impact.topTip) && (
        <div className="space-y-4">
          <h2 className="text-lg font-extrabold text-gray-900">Highlights</h2>

          {impact.topSuggestion && impact.topSuggestion.upvoteCount > 0 && (
            <div className="border rounded-2xl shadow-sm bg-white p-5">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="size-4 text-amber-500" />
                <span className="text-sm font-semibold text-gray-700">Your Top Suggestion</span>
                <span className="ml-auto text-xs text-gray-400">
                  {impact.topSuggestion.upvoteCount} upvote{impact.topSuggestion.upvoteCount !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-sm text-gray-600">{impact.topSuggestion.suggestion}</p>
            </div>
          )}

          {impact.topTip && impact.topTip.upvoteCount > 0 && (
            <div className="border rounded-2xl shadow-sm bg-white p-5">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="size-4 text-red-500" />
                <span className="text-sm font-semibold text-gray-700">Your Top Campus Tip</span>
                <span className="ml-auto text-xs text-gray-400">
                  {impact.topTip.upvoteCount} upvote{impact.topTip.upvoteCount !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-sm text-gray-600">{impact.topTip.content}</p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!hasActivity && (
        <div className="text-center py-12">
          <Trophy className="size-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-extrabold text-gray-900 mb-2">Start Contributing</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Give feedback on tools, curate collections, suggest improvements, or share campus tips.
            Your impact will show up here as your contributions help other students.
          </p>
        </div>
      )}
    </div>
  )
}
