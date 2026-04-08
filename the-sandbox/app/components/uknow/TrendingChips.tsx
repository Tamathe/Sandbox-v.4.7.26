'use client'

import { TrendingUp } from 'lucide-react'

interface TrendingChipsProps {
  trending: Array<{ topic: string; count: number }>
  onSelect: (topic: string) => void
}

export function TrendingChips({ trending, onSelect }: TrendingChipsProps) {
  if (trending.length < 3) return null

  return (
    <div className="flex items-center gap-2">
      <TrendingUp className="size-4 text-[#0033A0] shrink-0" />
      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide shrink-0">Trending</span>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {trending.map((t) => (
          <button
            key={t.topic}
            onClick={() => onSelect(t.topic)}
            className="shrink-0 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-[#0033A0] border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            {t.topic}
          </button>
        ))}
      </div>
    </div>
  )
}
