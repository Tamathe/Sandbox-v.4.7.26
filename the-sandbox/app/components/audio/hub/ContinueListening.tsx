'use client'

import { RotateCcw } from 'lucide-react'
import type { EpisodeCardData } from '../../../lib/audio/types'
import EpisodeCard from './EpisodeCard'

interface Props {
  episodes: EpisodeCardData[]
  onPlay: (episode: EpisodeCardData) => void
}

export default function ContinueListening({ episodes, onPlay }: Props) {
  if (!episodes.length) return null
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <RotateCcw className="size-4 text-[#0033A0]" />
        <h2 className="font-extrabold text-lg text-gray-900">Continue Listening</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {episodes.map(ep => (
          <div key={ep.id} className="min-w-[200px] max-w-[200px]">
            <EpisodeCard episode={ep} onPlay={onPlay} compact />
          </div>
        ))}
      </div>
    </section>
  )
}
