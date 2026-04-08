'use client'

import { X, Maximize2, Minimize2 } from 'lucide-react'
import { useAudioPlayer } from '../../hooks/useAudioPlayer'
import AudioPanelContent from './AudioPanelContent'

export default function AudioSidePanel() {
  const { setPlayerState } = useAudioPlayer()

  return (
    <aside className="fixed top-16 right-0 h-[calc(100vh-64px)] w-96 border-l border-gray-200 bg-white flex flex-col z-40 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="font-extrabold text-sm text-gray-900">Now Playing</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPlayerState('full')}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <Maximize2 className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setPlayerState('bar')}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <Minimize2 className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setPlayerState('idle')}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <AudioPanelContent />
      </div>
    </aside>
  )
}
