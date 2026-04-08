'use client'

import { useState } from 'react'
import { Bookmark, Plus } from 'lucide-react'
import type { Bookmark as BookmarkType } from '../../lib/audio/types'
import { formatTimestamp } from '../../lib/audio/format'

interface Props {
  bookmarks: BookmarkType[]
  currentTimestampMs: number
  onAddBookmark: (bookmark: BookmarkType) => void
  onSeek: (ms: number) => void
}

export default function BookmarkTimeline({ bookmarks, currentTimestampMs, onAddBookmark, onSeek }: Props) {
  const [note, setNote] = useState('')
  const [adding, setAdding] = useState(false)

  const handleAdd = () => {
    onAddBookmark({ timestampMs: currentTimestampMs, note: note.trim() || 'Bookmark' })
    setNote('')
    setAdding(false)
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Bookmark className="size-3.5 text-gray-400" />
          <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide">Bookmarks</h4>
        </div>
        <button
          type="button"
          onClick={() => setAdding(!adding)}
          className="p-1 text-gray-400 hover:text-[#0033A0] rounded-lg hover:bg-gray-100"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {adding && (
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Add a note..."
            className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30"
          />
          <button type="button" onClick={handleAdd} className="text-xs px-2 py-1.5 bg-[#0033A0] text-white rounded-lg">
            Save
          </button>
        </div>
      )}

      {bookmarks.length === 0 ? (
        <p className="text-xs text-gray-400">No bookmarks yet</p>
      ) : (
        <div className="space-y-1">
          {bookmarks.map((bm, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSeek(bm.timestampMs)}
              className="w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between text-gray-600 hover:bg-gray-50"
            >
              <span className="truncate">{bm.note}</span>
              <span className="text-gray-400 shrink-0 ml-2">{formatTimestamp(bm.timestampMs)}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
