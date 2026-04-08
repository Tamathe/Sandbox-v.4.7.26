'use client'

import { Pin, X } from 'lucide-react'

interface PinnedMessageProps {
  content: string
  onUnpin: () => void
}

/** Strip markdown syntax to plain text for the pinned preview */
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '[code]')    // code blocks
    .replace(/`([^`]+)`/g, '$1')              // inline code
    .replace(/#{1,6}\s+/g, '')                // headings
    .replace(/\*\*([^*]+)\*\*/g, '$1')        // bold
    .replace(/\*([^*]+)\*/g, '$1')            // italic
    .replace(/__([^_]+)__/g, '$1')            // bold alt
    .replace(/_([^_]+)_/g, '$1')              // italic alt
    .replace(/~~([^~]+)~~/g, '$1')            // strikethrough
    .replace(/^\s*[-*+]\s+/gm, '')            // unordered list markers
    .replace(/^\s*\d+\.\s+/gm, '')            // ordered list markers
    .replace(/^\s*>\s+/gm, '')                // blockquotes
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // images
    .replace(/\n{2,}/g, ' ')                  // collapse multiple newlines
    .replace(/\n/g, ' ')                      // single newlines to spaces
    .trim()
}

export default function PinnedMessage({ content, onUnpin }: PinnedMessageProps) {
  const preview = stripMarkdown(content)

  return (
    <div className="sticky top-0 z-10 bg-amber-50 border-b border-amber-200 px-3 py-2.5 flex items-start gap-2">
      <Pin className="size-3.5 text-amber-600 shrink-0 mt-0.5" />
      <p className="text-sm text-amber-900 line-clamp-2 flex-1">{preview}</p>
      <button
        onClick={onUnpin}
        className="text-amber-600 hover:text-amber-800 shrink-0"
        title="Unpin"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}
