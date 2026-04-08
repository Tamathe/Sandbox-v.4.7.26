'use client'

import { useEffect, useState } from 'react'
import { Users, X } from 'lucide-react'
import type { RemoteEditNotification } from '../../lib/course-map/collab-engine'

// ── Types ───────────────────────────────────────────────────────────────────

interface ChangeNotificationToastProps {
  notifications: RemoteEditNotification[]
  /** Called when user clicks a toast to navigate to the affected node */
  onNavigateToNode?: (nodeId: string) => void
  /** Called when a toast is dismissed */
  onDismiss: (index: number) => void
}

// ── Component ───────────────────────────────────────────────────────────────

/**
 * Toast notifications for remote edits.
 * - Auto-dismiss after 5s with progress bar
 * - Click to scroll to affected node
 * - Stack up to 3 toasts, collapse older ones
 */
export default function ChangeNotificationToast({
  notifications,
  onNavigateToNode,
  onDismiss,
}: ChangeNotificationToastProps) {
  // Only show the 3 most recent
  const visible = notifications.slice(-3)
  const collapsed = notifications.length > 3 ? notifications.length - 3 : 0

  if (notifications.length === 0) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 space-y-2 print:hidden"
    >
      {/* Collapsed count */}
      {collapsed > 0 && (
        <div className="text-xs text-gray-400 text-right pr-1">
          +{collapsed} earlier notification{collapsed !== 1 ? 's' : ''}
        </div>
      )}

      {visible.map((notif, visibleIdx) => {
        const actualIdx = notifications.length - visible.length + visibleIdx
        return (
          <ToastItem
            key={`${notif.timestamp}-${notif.description}`}
            notification={notif}
            onNavigateToNode={onNavigateToNode}
            onDismiss={() => onDismiss(actualIdx)}
          />
        )
      })}
    </div>
  )
}

// ── Individual Toast Item ───────────────────────────────────────────────────

function ToastItem({
  notification,
  onNavigateToNode,
  onDismiss,
}: {
  notification: RemoteEditNotification
  onNavigateToNode?: (nodeId: string) => void
  onDismiss: () => void
}) {
  const [progress, setProgress] = useState(100)
  const AUTO_DISMISS_MS = 5000

  useEffect(() => {
    const startTime = Date.now()
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / AUTO_DISMISS_MS) * 100)
      setProgress(remaining)
      if (remaining <= 0) {
        clearInterval(timer)
        onDismiss()
      }
    }, 50)

    return () => clearInterval(timer)
  }, [onDismiss])

  const handleClick = () => {
    if (notification.nodeId && onNavigateToNode) {
      onNavigateToNode(notification.nodeId)
    }
  }

  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden motion-safe:animate-[slideIn_0.3s_ease-out] ${
        notification.nodeId && onNavigateToNode ? 'cursor-pointer hover:bg-gray-50' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex items-center gap-2 px-4 py-2.5">
        <Users className="size-4 text-[#0033A0] shrink-0" />
        <span className="text-sm text-gray-700 flex-1">{notification.description}</span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
          className="text-gray-300 hover:text-gray-500 shrink-0"
        >
          <X className="size-3.5" />
        </button>
      </div>
      {/* Progress bar */}
      <div className="h-0.5 bg-gray-100">
        <div
          className="h-full bg-[#0033A0] transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
