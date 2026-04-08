'use client'

import { useState } from 'react'
import { Users, ChevronRight } from 'lucide-react'
import type { PresenceUser } from '../../lib/course-map/presence-service'

// ── Editor colors palette ───────────────────────────────────────────────────

const EDITOR_COLORS = [
  '#dc2626', '#2563eb', '#9333ea', '#059669', '#d97706', '#db2777',
  '#0891b2', '#4f46e5', '#ea580c', '#65a30d',
]

function getEditorColor(index: number): string {
  return EDITOR_COLORS[index % EDITOR_COLORS.length]
}

// ── Types ───────────────────────────────────────────────────────────────────

interface PresenceBarProps {
  users: PresenceUser[]
  /** Map of nodeId → label for showing "editing Node Y" text */
  nodeLabels: Map<string, string>
}

// ── Component ───────────────────────────────────────────────────────────────

/**
 * Compact bar above toolbar showing all connected users.
 * - User avatar circles with online/idle status dot
 * - "X is editing Node Y" real-time indicator text
 * - Expandable to show full user list with last-seen timestamps
 */
export default function PresenceBar({ users, nodeLabels }: PresenceBarProps) {
  const [expanded, setExpanded] = useState(false)

  if (users.length === 0) return null

  // Find the first user actively editing for the indicator text
  const editingUser = users.find((u) => u.editingNodeId)
  const editingNodeLabel = editingUser?.editingNodeId
    ? nodeLabels.get(editingUser.editingNodeId) || 'a node'
    : null

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5 mb-2 print:hidden">
      <div className="flex items-center gap-2">
        <Users className="size-4 text-[#0033A0] shrink-0" />

        {/* Avatar circles */}
        <div className="flex -space-x-2">
          {users.slice(0, 6).map((user, i) => {
            const color = getEditorColor(i)
            return (
              <div
                key={user.userId}
                className="relative"
                title={`${user.userName} — ${user.status}`}
              >
                <div
                  className="size-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ backgroundColor: color }}
                >
                  {user.userName.charAt(0).toUpperCase()}
                </div>
                {/* Status dot */}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border border-white ${
                    user.status === 'online' ? 'bg-green-500' : 'bg-amber-400'
                  }`}
                />
              </div>
            )
          })}
          {users.length > 6 && (
            <div className="size-6 rounded-full bg-gray-400 border-2 border-white flex items-center justify-center text-[9px] font-bold text-white">
              +{users.length - 6}
            </div>
          )}
        </div>

        {/* Editing indicator text */}
        <span className="text-xs text-gray-600 truncate">
          {editingUser && editingNodeLabel
            ? `${editingUser.userName} is editing ${editingNodeLabel}`
            : `${users.length} collaborator${users.length !== 1 ? 's' : ''} online`}
        </span>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={expanded ? 'Collapse user list' : 'Expand user list'}
        >
          <ChevronRight
            className={`size-4 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
          />
        </button>
      </div>

      {/* Expanded user list */}
      {expanded && (
        <div className="mt-2 border-t border-blue-100 pt-2 space-y-1.5">
          {users.map((user, i) => {
            const color = getEditorColor(i)
            const lastSeen = new Date(user.lastSeenAt)
            const secsAgo = Math.round((Date.now() - user.lastSeenAt) / 1000)
            const lastSeenText = secsAgo < 5 ? 'just now'
              : secsAgo < 60 ? `${secsAgo}s ago`
              : `${lastSeen.toLocaleTimeString()}`

            return (
              <div key={user.userId} className="flex items-center gap-2 text-xs">
                <div
                  className="size-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                  style={{ backgroundColor: color }}
                >
                  {user.userName.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-gray-700 truncate">{user.userName}</span>
                <span
                  className={`shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                    user.status === 'online'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {user.status}
                </span>
                {user.editingNodeId && (
                  <span className="text-gray-500 truncate">
                    editing {nodeLabels.get(user.editingNodeId) || 'a node'}
                  </span>
                )}
                <span className="ml-auto text-gray-400 shrink-0">{lastSeenText}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
