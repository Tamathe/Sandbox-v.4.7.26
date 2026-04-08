'use client'

import { useState, useEffect } from 'react'
import { useAudioPlayer } from '../../hooks/useAudioPlayer'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import type { EpisodeDetail } from '../../lib/audio/types'
import EpisodeHeader from './EpisodeHeader'
import AudioControls from './AudioControls'
import TranscriptView from './TranscriptView'
import ChapterMarkers from './ChapterMarkers'
import BookmarkTimeline from './BookmarkTimeline'
import SandyLauncher from './SandyLauncher'

export default function AudioPanelContent() {
  const { currentEpisodeId, currentPositionMs } = useAudioPlayer()
  const { currentUser } = useAuth()
  const [episode, setEpisode] = useState<EpisodeDetail | null>(null)

  useEffect(() => {
    if (!currentEpisodeId || !currentUser?.email) return
    const controller = new AbortController()
    apiFetch(currentUser.email, `/api/audio/episode/${currentEpisodeId}`, { signal: controller.signal })
      .then((data) => setEpisode(data as EpisodeDetail))
      .catch(() => {})
    return () => controller.abort()
  }, [currentEpisodeId, currentUser?.email])

  if (!episode) {
    return <p className="text-sm text-gray-500">Episode panel — transcript, chapters, and controls will render here.</p>
  }

  return (
    <div className="space-y-4">
      <EpisodeHeader
        title={episode.sourceName}
        courseName={episode.courseName}
        durationSecs={episode.durationSecs}
      />
      <AudioControls />
      <div className="border-t border-gray-100 pt-3 space-y-4">
        <SandyLauncher episodeTitle={episode.sourceName} />
        <ChapterMarkers
          chapters={episode.chapters}
          currentTimestampMs={currentPositionMs}
          onSeek={() => {}}
        />
        <BookmarkTimeline
          bookmarks={episode.bookmarks ?? []}
          currentTimestampMs={currentPositionMs}
          onAddBookmark={(bookmark) => {
            if (!currentEpisodeId || !currentUser?.email) return
            apiFetch(currentUser.email, `/api/audio/history/${currentEpisodeId}`, {
              method: 'PATCH',
              body: JSON.stringify({ bookmark }),
            }).catch(() => {})
          }}
          onSeek={() => {}}
        />
        <TranscriptView
          transcript={episode.transcript}
          currentTimestampMs={currentPositionMs}
        />
      </div>
    </div>
  )
}
