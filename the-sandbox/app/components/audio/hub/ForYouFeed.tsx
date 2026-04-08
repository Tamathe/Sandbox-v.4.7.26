'use client'

import { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'
import { apiFetch } from '../../../lib/api-client'
import type { AudioHubFeedResponse, EpisodeCardData } from '../../../lib/audio/types'
import AudioWelcomeCard from './AudioWelcomeCard'
import ContinueListening from './ContinueListening'
import TrendingLane from './TrendingLane'
import EpisodeCard from './EpisodeCard'
import LoadingSpinner from '../../LoadingSpinner'
import ErrorBanner from '../../ErrorBanner'

interface Props {
  onPlay: (episode: EpisodeCardData) => void
  onNavigateTab?: (tab: string) => void
}

export default function ForYouFeed({ onPlay, onNavigateTab }: Props) {
  const { currentUser } = useAuth()
  const [feed, setFeed] = useState<AudioHubFeedResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    if (!currentUser?.email) return
    apiFetch(currentUser.email, '/api/audio/hub/feed', { signal: controller.signal })
      .then(data => setFeed(data as AudioHubFeedResponse))
      .catch(err => { if (err.name !== 'AbortError') setError(err.message) })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [currentUser?.email])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorBanner message={error} />
  if (!feed) return null

  return (
    <div className="space-y-8">
      {feed.continueListening.length === 0 && onNavigateTab && (
        <AudioWelcomeCard onNavigateTab={onNavigateTab} />
      )}

      <ContinueListening episodes={feed.continueListening} onPlay={onPlay} />

      {feed.recommended.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="size-4 text-[#0033A0]" />
            <h2 className="font-extrabold text-lg text-gray-900">Sandy Recommends</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {feed.recommended.map(ep => (
              <EpisodeCard key={ep.id} episode={ep} onPlay={onPlay} />
            ))}
          </div>
        </section>
      )}

      <TrendingLane episodes={feed.trending} onPlay={onPlay} />
    </div>
  )
}
