'use client'

import { useState, useEffect, use } from 'react'
import { useAuth } from '../../../lib/auth-context'
import { apiFetch } from '../../../lib/api-client'
import type { EpisodeDetail } from '../../../lib/audio/types'
import EpisodeHeader from '../../../components/audio/EpisodeHeader'
import AudioControls from '../../../components/audio/AudioControls'
import TranscriptView from '../../../components/audio/TranscriptView'
import ChapterMarkers from '../../../components/audio/ChapterMarkers'
import BookmarkTimeline from '../../../components/audio/BookmarkTimeline'
import SandyLauncher from '../../../components/audio/SandyLauncher'
import LoadingSpinner from '../../../components/LoadingSpinner'
import ErrorBanner from '../../../components/ErrorBanner'

export default function EpisodePlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { currentUser } = useAuth()
  const [episode, setEpisode] = useState<EpisodeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    if (!currentUser?.email) return
    apiFetch(currentUser.email, `/api/audio/episode/${id}`, { signal: controller.signal })
      .then(data => setEpisode(data as EpisodeDetail))
      .catch(err => { if (err.name !== 'AbortError') setError(err.message) })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [currentUser?.email, id])

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-12"><LoadingSpinner /></div>
  if (error) return <div className="max-w-4xl mx-auto px-4 py-12"><ErrorBanner message={error} /></div>
  if (!episode) return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <EpisodeHeader
        title={episode.sourceName}
        courseName={episode.courseName}
        durationSecs={episode.durationSecs}
      />

      <AudioControls />

      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-[#0033A0] rounded-full" style={{ width: '0%' }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TranscriptView transcript={episode.transcript} currentTimestampMs={0} />
        </div>

        <div className="space-y-6">
          <SandyLauncher episodeTitle={episode.sourceName} />
          <ChapterMarkers chapters={episode.chapters} currentTimestampMs={0} onSeek={() => {}} />
          <BookmarkTimeline
            bookmarks={episode.bookmarks ?? []}
            currentTimestampMs={0}
            onAddBookmark={() => {}}
            onSeek={() => {}}
          />
        </div>
      </div>
    </div>
  )
}
