'use client'

import { Headphones, Clock, Play } from 'lucide-react'
import type { EpisodeCardData } from '../../../lib/audio/types'
import { formatDuration } from '../../../lib/audio/format'

function tierBadge(tier: string) {
  if (tier === 'educator') return <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-full">Educator</span>
  if (tier === 'student') return <span className="text-xs px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">Student</span>
  return null
}

interface Props {
  episode: EpisodeCardData
  onPlay: (episode: EpisodeCardData) => void
  compact?: boolean
}

export default function EpisodeCard({ episode, onPlay, compact }: Props) {
  const progress = episode.completedPct ?? 0

  return (
    <button
      type="button"
      onClick={() => onPlay(episode)}
      className={`group relative w-full text-left bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow ${compact ? 'p-3' : 'p-4'}`}
    >
      {/* Cover art placeholder */}
      <div className={`flex items-center justify-center bg-gradient-to-br from-[#0033A0] to-blue-400 rounded-xl text-white ${compact ? 'size-12 mb-2' : 'w-full aspect-[3/2] mb-3'}`}>
        <Headphones className={compact ? 'size-5' : 'size-8'} />
      </div>

      <h3 className={`font-extrabold text-gray-900 line-clamp-2 ${compact ? 'text-sm' : 'text-base'}`}>
        {episode.sourceName}
      </h3>

      {episode.courseName && (
        <p className="text-xs text-gray-400 mt-0.5">{episode.courseName}</p>
      )}

      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
        <Clock className="size-3" />
        <span>
          {progress > 0 && progress < 100
            ? `${Math.ceil((episode.durationSecs * (1 - progress / 100)) / 60)} min remaining`
            : formatDuration(episode.durationSecs)}
        </span>
        {episode.listenCount > 0 && (
          <span>· {episode.listenCount} listens</span>
        )}
        {tierBadge(episode.tier)}
      </div>

      {episode.tags.length > 0 && !compact && (
        <div className="flex flex-wrap gap-1 mt-2">
          {episode.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">{tag}</span>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {progress > 0 && progress < 100 && (
        <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#0033A0] rounded-full" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Play overlay — always visible on mobile (no hover), hover-reveal on desktop */}
      <div className="absolute inset-0 flex items-center justify-center transition-opacity bg-black/5 rounded-2xl opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
        <div className="bg-white/90 rounded-full p-3 shadow-lg lg:p-2">
          <Play className="size-6 text-[#0033A0] fill-current lg:size-5" />
        </div>
      </div>
    </button>
  )
}
