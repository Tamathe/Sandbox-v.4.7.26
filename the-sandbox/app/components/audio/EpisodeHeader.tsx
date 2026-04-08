'use client'

import { Headphones, Clock } from 'lucide-react'
import { formatDuration } from '../../lib/audio/format'

interface Props {
  title: string
  courseName?: string
  durationSecs: number
}

export default function EpisodeHeader({ title, courseName, durationSecs }: Props) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="flex items-center justify-center size-14 bg-gradient-to-br from-[#0033A0] to-blue-400 rounded-xl text-white shrink-0">
        <Headphones className="size-6" />
      </div>
      <div className="min-w-0">
        <h3 className="font-extrabold text-sm text-gray-900 line-clamp-2">{title}</h3>
        {courseName && <p className="text-xs text-gray-500 mt-0.5">{courseName}</p>}
        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
          <Clock className="size-3" />
          {formatDuration(durationSecs)}
        </p>
      </div>
    </div>
  )
}
