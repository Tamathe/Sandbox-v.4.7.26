'use client'

import { CheckCircle } from 'lucide-react'
import type { NodeProgress } from './types'

export default function NodeProgressIndicator({ progress }: { progress: NodeProgress }) {
  if (progress.status === 'completed') {
    return (
      <div className="flex items-center gap-1 mt-1">
        <CheckCircle className="size-3.5 text-green-500" />
        <span className="text-[10px] text-green-600 font-semibold">Complete</span>
      </div>
    )
  }
  if (progress.status === 'in-progress') {
    return (
      <div className="flex items-center gap-1.5 mt-1">
        <div className="size-3.5 relative">
          <svg viewBox="0 0 16 16" className="size-3.5">
            <circle cx="8" cy="8" r="7" fill="none" stroke="#d1d5db" strokeWidth="2" />
            <circle
              cx="8" cy="8" r="7" fill="none" stroke="#f59e0b" strokeWidth="2"
              strokeDasharray={`${(progress.completedLessons / progress.totalLessons) * 44} 44`}
              strokeLinecap="round"
              transform="rotate(-90 8 8)"
            />
          </svg>
        </div>
        <span className="text-[10px] text-amber-600 font-semibold">
          {progress.completedLessons}/{progress.totalLessons}
        </span>
      </div>
    )
  }
  return null
}
