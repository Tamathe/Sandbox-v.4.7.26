'use client'

import { Clock, User, Sparkles } from 'lucide-react'

interface VersionEntry {
  version: number
  author: string
  timestamp: string
  content?: string
}

interface NarrativeVersionHistoryProps {
  history: VersionEntry[]
}

export default function NarrativeVersionHistory({ history }: NarrativeVersionHistoryProps) {
  if (!history || history.length === 0) {
    return (
      <p className="text-xs text-gray-400 italic">No version history</p>
    )
  }

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Version History</h4>
      <div className="relative">
        <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200" />
        <div className="space-y-4">
          {history.slice().reverse().map(entry => (
            <div key={entry.version} className="relative pl-8">
              <div className="absolute left-1 top-1 size-4 rounded-full border-2 border-gray-300 bg-white flex items-center justify-center">
                {entry.author === 'ai' ? (
                  <Sparkles className="size-2.5 text-blue-500" />
                ) : (
                  <User className="size-2.5 text-gray-400" />
                )}
              </div>
              <div className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="font-medium text-gray-700">v{entry.version}</span>
                  <span>{entry.author === 'ai' ? 'AI Generated' : 'Human Review'}</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" />
                    {new Date(entry.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
