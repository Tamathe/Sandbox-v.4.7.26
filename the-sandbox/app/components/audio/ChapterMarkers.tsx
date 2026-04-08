'use client'

import { ListMusic } from 'lucide-react'
import type { ChapterMarker } from '../../lib/audio/types'
import { formatTimestamp } from '../../lib/audio/format'

interface Props {
  chapters: ChapterMarker[]
  currentTimestampMs: number
  onSeek: (ms: number) => void
}

export default function ChapterMarkers({ chapters, currentTimestampMs, onSeek }: Props) {
  if (!chapters.length) return null

  const currentIdx = chapters.findLastIndex(c => c.startMs <= currentTimestampMs)

  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <ListMusic className="size-3.5 text-gray-400" />
        <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide">Chapters</h4>
      </div>
      <div className="space-y-1">
        {chapters.map((ch, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSeek(ch.startMs)}
            className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
              i === currentIdx
                ? 'bg-[#0033A0]/10 text-[#0033A0] font-semibold'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="truncate">{ch.title}</span>
            <span className="text-gray-400 shrink-0 ml-2">{formatTimestamp(ch.startMs)}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
