'use client'

import { Headphones, Pause, Play, Volume2, X } from 'lucide-react'
import { useAudioPlayer } from '../hooks/useAudioPlayer'

export default function AudioPlayerBar() {
  const {
    isActive,
    isPlaying,
    currentText,
    persona,
    queue,
    backgroundVolume,
    pause,
    resume,
    deactivate,
    setBackgroundVolume,
  } = useAudioPlayer()

  if (!isActive || !persona) {
    return null
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#0033A0]/15 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[#0033A0] text-white">
          <Headphones className="h-5 w-5" />
        </div>

        <button
          type="button"
          onClick={() => {
            if (isPlaying) pause()
            else void resume()
          }}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[#0033A0] text-white transition-colors hover:bg-[#002580]"
          aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
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
            <Volume2 className="h-4 w-4 text-[#0033A0]" />
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

        <button
          type="button"
          onClick={deactivate}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-gray-200 text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
          aria-label="Close audio player"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
