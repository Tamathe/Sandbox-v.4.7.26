'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

interface Props {
  startedAt: number
  maxSecs?: number
  onTimeout?: () => void
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function SessionTimer({ startedAt, maxSecs, onTimeout }: Props) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      const secs = Math.floor((Date.now() - startedAt) / 1000)
      setElapsed(secs)
      if (maxSecs && secs >= maxSecs) onTimeout?.()
    }, 1000)
    return () => clearInterval(interval)
  }, [startedAt, maxSecs, onTimeout])

  const remaining = maxSecs ? maxSecs - elapsed : null
  const isUrgent = remaining !== null && remaining <= 60
  const progressPct = maxSecs ? Math.min(100, (elapsed / maxSecs) * 100) : null

  return (
    <div className="flex flex-col items-end gap-1">
      <div className={`flex items-center gap-1.5 text-xs font-mono ${isUrgent ? 'text-red-600' : 'text-gray-500'}`}>
        <Clock className="size-3" />
        <span>{formatTime(elapsed)}</span>
        {maxSecs && (
          <span className="text-gray-400">/ {formatTime(maxSecs)}</span>
        )}
      </div>
      {progressPct !== null && (
        <div className="w-20 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isUrgent ? 'bg-red-500' : 'bg-[#0033A0]'}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}
    </div>
  )
}
