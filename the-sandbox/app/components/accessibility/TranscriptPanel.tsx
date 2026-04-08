'use client'

import { useState } from 'react'
import { FileText, Download, ChevronDown, ChevronUp } from 'lucide-react'

interface TranscriptPanelProps {
  transcript: string | null
  sourceName?: string
  /** Start collapsed by default */
  defaultOpen?: boolean
}

/**
 * Collapsible transcript display for audio episodes.
 * Uses semantic <details> element for native accessibility.
 * Provides a "Download Transcript" link as a .txt file.
 */
export default function TranscriptPanel({
  transcript,
  sourceName = 'Audio Episode',
  defaultOpen = false,
}: TranscriptPanelProps) {
  const [open, setOpen] = useState(defaultOpen)

  if (!transcript) return null

  function handleDownload() {
    if (!transcript) return
    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sourceName.replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'transcript'}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        aria-expanded={open}
        aria-controls="transcript-content"
      >
        <FileText className="size-4 text-[#0033A0]" />
        <span className="flex-1">Transcript</span>
        {open ? (
          <ChevronUp className="size-4 text-gray-400" />
        ) : (
          <ChevronDown className="size-4 text-gray-400" />
        )}
      </button>

      {open && (
        <div id="transcript-content" className="border-t border-gray-100 px-4 pb-4 pt-3">
          <div className="mb-3 max-h-80 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
            {transcript}
          </div>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200"
          >
            <Download className="size-3.5" />
            Download Transcript
          </button>
        </div>
      )}
    </div>
  )
}
