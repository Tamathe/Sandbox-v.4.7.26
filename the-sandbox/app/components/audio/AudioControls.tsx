'use client'

import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react'
import { useState } from 'react'
import { useAudioPlayer } from '../../hooks/useAudioPlayer'

const SPEEDS = [1, 1.25, 1.5, 2, 0.75, 0.5]

export default function AudioControls() {
  const { isPlaying, pause, resume, skipBack, skipForward } = useAudioPlayer()
  const [speedIdx, setSpeedIdx] = useState(0) // default 1x

  const cycleSpeed = () => {
    setSpeedIdx((speedIdx + 1) % SPEEDS.length)
  }

  return (
    <div className="flex items-center justify-center gap-4 py-3">
      <button
        type="button"
        onClick={() => skipBack(15_000)}
        className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
        aria-label="Skip back 15 seconds"
      >
        <SkipBack className="size-4" />
      </button>

      <button
        type="button"
        onClick={isPlaying ? pause : resume}
        className="p-3 bg-[#0033A0] text-white rounded-full hover:bg-[#002880] transition-colors"
      >
        {isPlaying ? <Pause className="size-5" /> : <Play className="size-5 ml-0.5" />}
      </button>

      <button
        type="button"
        onClick={() => skipForward(30_000)}
        className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
        aria-label="Skip forward 30 seconds"
      >
        <SkipForward className="size-4" />
      </button>

      <button
        type="button"
        onClick={cycleSpeed}
        className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-2.5 py-1 rounded-full hover:bg-gray-100 border border-gray-200"
      >
        {SPEEDS[speedIdx]}x
      </button>

      <Volume2 className="size-4 text-gray-400 hidden lg:block" />
    </div>
  )
}
