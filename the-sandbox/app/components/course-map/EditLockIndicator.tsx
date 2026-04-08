'use client'

import { Lock } from 'lucide-react'

// ── Types ───────────────────────────────────────────────────────────────────

export interface EditLockInfo {
  nodeId: string
  ownerName: string
  isMine: boolean
}

interface EditLockIndicatorProps {
  lock: EditLockInfo
}

// ── Component ───────────────────────────────────────────────────────────────

/**
 * Lock icon overlay on nodes locked by other users.
 * - Blue lock for own locks, orange for others' locks
 * - Shows lock owner name on hover
 */
export default function EditLockIndicator({ lock }: EditLockIndicatorProps) {
  return (
    <div
      className="absolute -top-2 -left-2 z-20 group"
      title={lock.isMine ? 'Locked by you' : `Locked by ${lock.ownerName}`}
    >
      <div
        className={`size-5 rounded-full flex items-center justify-center shadow-sm ${
          lock.isMine
            ? 'bg-blue-100 text-blue-600 border border-blue-300'
            : 'bg-orange-100 text-orange-600 border border-orange-300'
        }`}
      >
        <Lock className="size-3" />
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-50">
        <div
          className={`text-white text-[10px] px-2 py-1 rounded whitespace-nowrap shadow-lg ${
            lock.isMine ? 'bg-blue-700' : 'bg-orange-700'
          }`}
        >
          {lock.isMine ? 'Locked by you' : `Locked by ${lock.ownerName}`}
        </div>
        <div
          className={`absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent ${
            lock.isMine ? 'border-t-blue-700' : 'border-t-orange-700'
          }`}
        />
      </div>
    </div>
  )
}
