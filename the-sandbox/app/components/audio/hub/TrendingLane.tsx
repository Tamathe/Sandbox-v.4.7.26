'use client'

import { TrendingUp } from 'lucide-react'
import type { EpisodeCardData } from '../../../lib/audio/types'
import EpisodeCard from './EpisodeCard'

interface Props {
  episodes: EpisodeCardData[]
  onPlay: (episode: EpisodeCardData) => void
}

export default function TrendingLane({ episodes, onPlay }: Props) {
  if (!episodes.length) return null
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="size-4 text-[#0033A0]" />
        <h2 className="font-extrabold text-lg text-gray-900">Trending on Campus</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {episodes.slice(0, 5).map(ep => (
          <EpisodeCard key={ep.id} episode={ep} onPlay={onPlay} compact />
        ))}
      </div>
    </section>
  )
}
