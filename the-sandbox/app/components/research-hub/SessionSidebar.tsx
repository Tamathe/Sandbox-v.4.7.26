'use client'

import { useState } from 'react'
import { Plus, Trash2, FolderOpen, Loader2 } from 'lucide-react'

export interface SessionSummary {
  id: string
  title: string
  messageCount: number
  updatedAt: string
}

interface Props {
  sessions: SessionSummary[]
  activeSessionId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onNew: () => void
  loading: boolean
}

function relativeDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function SessionSidebar({
  sessions,
  activeSessionId,
  onSelect,
  onDelete,
  onNew,
  loading,
}: Props) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  function handleDelete(id: string) {
    if (confirmDeleteId === id) {
      onDelete(id)
      setConfirmDeleteId(null)
    } else {
      setConfirmDeleteId(id)
      setTimeout(() => setConfirmDeleteId(null), 3000)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-3 py-3 border-b border-gray-200">
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#0033A0] text-white rounded-xl text-sm font-semibold hover:bg-[#002580] transition-colors"
        >
          <Plus className="size-4" />
          New Session
        </button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 text-gray-400 animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-3 text-gray-400">
            <FolderOpen className="size-8 mb-2 opacity-50" />
            <p className="text-xs text-center">No saved sessions yet</p>
          </div>
        ) : (
          <div className="py-1">
            {sessions.map(s => (
              <div
                key={s.id}
                className={`group relative px-3 py-2.5 cursor-pointer hover:bg-gray-100 transition-colors ${
                  activeSessionId === s.id
                    ? 'bg-blue-50 border-l-2 border-[#0033A0]'
                    : 'border-l-2 border-transparent'
                }`}
                onClick={() => onSelect(s.id)}
              >
                <div className="text-sm font-medium text-gray-800 truncate pr-6">
                  {s.title}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-gray-400">
                    {s.messageCount} messages
                  </span>
                  <span className="text-[10px] text-gray-300">·</span>
                  <span className="text-[10px] text-gray-400">
                    {relativeDate(s.updatedAt)}
                  </span>
                </div>

                {/* Delete button */}
                <button
                  onClick={e => {
                    e.stopPropagation()
                    handleDelete(s.id)
                  }}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors ${
                    confirmDeleteId === s.id
                      ? 'bg-red-100 text-red-600'
                      : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                  }`}
                  title={confirmDeleteId === s.id ? 'Click again to confirm' : 'Delete session'}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
