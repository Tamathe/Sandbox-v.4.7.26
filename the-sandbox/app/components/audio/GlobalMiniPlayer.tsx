'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Play, Pause } from 'lucide-react'
import { useAudioPlayer } from '../../hooks/useAudioPlayer'

export default function GlobalMiniPlayer() {
  const pathname = usePathname()
  const router = useRouter()
  const { playerState, isPlaying, persona, progressPct, pause, resume } = useAudioPlayer()
  const [collapsed, setCollapsed] = useState(false)

  const isAudioPage = pathname.startsWith('/audio')
  const show = playerState !== 'idle' && !isAudioPage && !collapsed

  if (!show) return null

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0]
    const startY = (e.target as HTMLElement).dataset.touchStartY
    if (startY && touch.clientY - Number(startY) > 40) {
      setCollapsed(true)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.currentTarget as HTMLElement
    target.dataset.touchStartY = String(e.touches[0].clientY)
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 shadow-lg"
      style={{ height: 56 }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Thin progress bar at top edge */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-200">
        <div
          className="h-full bg-[#0033A0] transition-[width] duration-500 ease-linear"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="flex items-center h-full px-4 gap-3">
        {/* Tap body → navigate to /audio */}
        <button
          type="button"
          onClick={() => router.push('/audio')}
          className="flex-1 min-w-0 text-left"
        >
          <p className="text-sm font-semibold text-gray-900 truncate">
            {persona?.toolName ?? 'Now Playing'}
          </p>
        </button>

        {/* Play/Pause */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (isPlaying) pause()
            else void resume()
          }}
          className="flex size-9 items-center justify-center rounded-full bg-[#0033A0] text-white"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
        </button>
      </div>
    </div>
  )
}
