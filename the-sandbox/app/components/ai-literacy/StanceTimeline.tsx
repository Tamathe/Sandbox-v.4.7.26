'use client'

import { useState, useEffect } from 'react'
import { Loader2, Clock } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { PolicyStanceBadge } from './StanceResult'
import type { AIStance } from '../../generated/prisma'

interface HistoryEntry {
  id: string
  previousStance: AIStance | null
  newStance: AIStance
  score: number
  reflectionNote: string | null
  createdAt: string
}

export default function StanceTimeline() {
  const { currentUser } = useAuth()
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/ai-literacy/stance/history', {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (res.ok) {
          const data = await res.json()
          setHistory(data.history)
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [currentUser.email])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-4 animate-spin text-gray-400" />
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-center">
        <Clock className="size-5 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600">
          Your stance journey will appear here after your first assessment.
        </p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

      <div className="space-y-6">
        {history.map((entry, idx) => {
          const isLatest = idx === history.length - 1
          const date = new Date(entry.createdAt)
          const dateStr = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

          return (
            <div key={entry.id} className="relative flex gap-4 pl-0">
              {/* Timeline dot */}
              <div className={`relative z-10 mt-1 size-8 rounded-full border-2 flex items-center justify-center shrink-0 ${
                isLatest ? 'bg-[#0033A0] border-[#0033A0]' : 'bg-white border-gray-300'
              }`}>
                <span className={`size-2 rounded-full ${isLatest ? 'bg-white' : 'bg-gray-400'}`} />
              </div>

              {/* Content */}
              <div className="pb-2 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900">{dateStr}</span>
                  <PolicyStanceBadge stance={entry.newStance} />
                  {isLatest && (
                    <span className="text-[10px] font-semibold text-[#0033A0] uppercase tracking-wider">Current</span>
                  )}
                </div>
                {entry.reflectionNote && (
                  <p className="mt-1 text-sm text-gray-600 italic">&ldquo;{entry.reflectionNote}&rdquo;</p>
                )}
                {entry.score > 0 && (
                  <p className="mt-1 text-xs text-gray-400">Score: {entry.score.toFixed(1)}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
