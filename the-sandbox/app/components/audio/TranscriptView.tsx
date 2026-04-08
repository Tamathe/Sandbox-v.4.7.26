'use client'

import { useRef, useState, useEffect } from 'react'
import { FileText, Focus } from 'lucide-react'

interface Props {
  transcript: string | null
  currentTimestampMs: number
}

export default function TranscriptView({ transcript, currentTimestampMs }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [focusMode, setFocusMode] = useState(false)
  const [focusIdx, setFocusIdx] = useState(0)

  if (!transcript) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
        <FileText className="size-6 mb-2" />
        <p className="text-xs">No transcript available</p>
      </div>
    )
  }

  const paragraphs = transcript.split('\n\n').filter(Boolean)
  // Split into sentences for focus mode
  const sentences = paragraphs
    .flatMap((p) => p.match(/[^.!?]+[.!?]+/g) ?? [p])
    .map((s) => s.trim())
    .filter(Boolean)

  // Auto-advance focus mode roughly by time (1 sentence per ~4s of audio)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!focusMode || sentences.length === 0) return
    const approxIdx = Math.min(
      sentences.length - 1,
      Math.floor(currentTimestampMs / 4000)
    )
    setFocusIdx(approxIdx)
  }, [focusMode, currentTimestampMs, sentences.length])

  if (focusMode) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setFocusMode(false)}
          className="absolute top-0 right-0 text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100"
        >
          Exit Focus
        </button>
        <div className="flex min-h-[120px] items-center justify-center px-4 py-8">
          <p className="text-center text-xl font-medium leading-relaxed text-gray-900 lg:text-lg">
            {sentences[focusIdx] ?? ''}
          </p>
        </div>
        {/* Sentence counter */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <button
            type="button"
            onClick={() => setFocusIdx(Math.max(0, focusIdx - 1))}
            className="px-2 py-1 rounded hover:bg-gray-100"
          >
            ‹ Prev
          </button>
          <span>{focusIdx + 1} / {sentences.length}</span>
          <button
            type="button"
            onClick={() => setFocusIdx(Math.min(sentences.length - 1, focusIdx + 1))}
            className="px-2 py-1 rounded hover:bg-gray-100"
          >
            Next ›
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Focus mode toggle — more prominent on mobile */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide">Transcript</h4>
        <button
          type="button"
          onClick={() => setFocusMode(true)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#0033A0] px-2 py-1 rounded-lg hover:bg-blue-50/50 transition-colors"
        >
          <Focus className="size-3.5" />
          <span className="lg:inline">Focus Mode</span>
        </button>
      </div>
      <div ref={containerRef} className="space-y-3 text-sm text-gray-700 leading-relaxed">
        {paragraphs.map((p, i) => (
          <p key={i} className="hover:bg-blue-50/50 rounded px-1 -mx-1 transition-colors cursor-pointer">
            {p}
          </p>
        ))}
      </div>
    </div>
  )
}
