'use client'

import { useRef, useEffect } from 'react'
import type { TranscriptEntry } from '../../../lib/audio/types'

interface Props {
  entries: TranscriptEntry[]
  isListening: boolean
}

export default function LiveTranscript({ entries, isListening }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries.length])

  return (
    <div className="flex-1 overflow-y-auto space-y-3 p-3">
      {entries.map((entry, i) => (
        <div key={i} className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[80%] px-3 py-2 text-sm ${
            entry.role === 'user'
              ? 'bg-[#0033A0] text-white rounded-2xl rounded-tr-sm'
              : 'bg-white border border-gray-100 rounded-2xl rounded-tl-sm text-gray-800'
          }`}>
            {entry.text}
          </div>
        </div>
      ))}

      {isListening && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="flex gap-0.5">
            <div className="w-1 h-3 bg-[#0033A0] rounded-full animate-pulse" />
            <div className="w-1 h-4 bg-[#0033A0] rounded-full animate-pulse delay-75" />
            <div className="w-1 h-2 bg-[#0033A0] rounded-full animate-pulse delay-150" />
          </div>
          Listening...
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
