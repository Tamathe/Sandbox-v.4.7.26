'use client'

import { Bookmark, Headphones, Pause, Play, Volume2, X } from 'lucide-react'
import { useState } from 'react'
import { useAudioPlayer } from '../hooks/useAudioPlayer'

export default function AudioPlayerBar() {
  const {
    isActive,
    isPlaying,
    currentText,
    persona,
    queue,
    backgroundVolume,
    progressPct,
    pause,
    resume,
    deactivate,
    setBackgroundVolume,
    addQuickBookmark,
  } = useAudioPlayer()
  const [bookmarked, setBookmarked] = useState(false)

  if (!isActive || !persona) {
    return null
  }

  const handleQuickBookmark = () => {
    addQuickBookmark()
    setBookmarked(true)
    setTimeout(() => setBookmarked(false), 1500)
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#0033A0]/15 bg-white/95 backdrop-blur">
      {/* Mobile progress bar — thin line at top of bar */}
      {progressPct > 0 && (
        <div className="h-0.5 w-full bg-gray-200 lg:hidden">
          <div
            className="h-full bg-[#0033A0] transition-[width] duration-500 ease-linear"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <div className="flex size-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[#0033A0] text-white">
          <Headphones className="size-5" />
        </div>

        <button
          type="button"
          onClick={() => {
            if (isPlaying) pause()
            else void resume()
          }}
          className="flex size-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[#0033A0] text-white transition-colors hover:bg-[#002580]"
          aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
        >
          {isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-gray-900">{persona.personaName}</span>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-[#0033A0]">
              {persona.voiceName}
            </span>
            {queue.length > 0 && (
              <span className="text-xs text-gray-400">{queue.length} clip{queue.length === 1 ? '' : 's'} queued</span>
            )}
          </div>
          <div className="truncate text-sm text-gray-500">
            {currentText || 'Audio mode is on. Your next response will start speaking as soon as the first sentence lands.'}
          </div>
        </div>

        {persona.backgroundTrack ? (
          <label className="hidden items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-600 lg:flex">
            <Volume2 className="size-4 text-[#0033A0]" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={backgroundVolume}
              onChange={(event) => setBackgroundVolume(Number(event.target.value))}
              className="h-1 w-24 accent-[#0033A0]"
            />
          </label>
        ) : null}

        {/* Quick bookmark — visible on mobile, hidden on desktop (desktop has panel) */}
        <button
          type="button"
          onClick={handleQuickBookmark}
          className={`flex size-11 flex-shrink-0 items-center justify-center rounded-2xl border transition-colors lg:hidden ${
            bookmarked
              ? 'border-[#0033A0] bg-blue-50 text-[#0033A0]'
              : 'border-gray-200 text-gray-500 hover:border-[#0033A0]/30 hover:bg-blue-50/50 hover:text-[#0033A0]'
          }`}
          aria-label="Bookmark current position"
        >
          <Bookmark className={`size-5 ${bookmarked ? 'fill-current' : ''}`} />
        </button>

        <button
          type="button"
          onClick={deactivate}
          className="flex size-11 flex-shrink-0 items-center justify-center rounded-2xl border border-gray-200 text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
          aria-label="Close audio player"
        >
          <X className="size-5" />
        </button>
      </div>
    </div>
  )
}
