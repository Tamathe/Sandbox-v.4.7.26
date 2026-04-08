/**
 * Presence service for real-time course map collaboration.
 *
 * Wraps the collab-editing infrastructure with enriched presence data
 * including deterministic color assignment and cursor position tracking.
 */

import {
  joinEditor,
  leaveEditor,
  heartbeatEditor,
  getActiveEditors,
  broadcastEvent,
} from './collab-editing'
import type { ActiveEditor } from './collab-editing'

// ── Color palette ────────────────────────────────────────────────────────────

const PRESENCE_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // emerald
  '#F59E0B', // amber
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#14B8A6', // teal
  '#6366F1', // indigo
] as const

/**
 * Deterministic color for a user based on their userId hash.
 */
export function getPresenceColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0
  }
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length]
}

// ── Cursor state (in-memory, ephemeral) ──────────────────────────────────────

interface CursorPosition {
  userId: string
  userName: string
  x: number
  y: number
  color: string
  updatedAt: number
}

/** courseMapId → Map<userId, CursorPosition> */
const cursors = new Map<string, Map<string, CursorPosition>>()

const CURSOR_TTL_MS = 10_000 // 10s inactivity → fade out

// ── Public API ───────────────────────────────────────────────────────────────

export interface PresenceUser {
  userId: string
  name: string
  email: string
  avatarUrl: string | null
  color: string
  cursor: { x: number; y: number } | null
  isStale: boolean // true if cursor hasn't moved in 10s
}

/**
 * Broadcast a cursor position update for a user on a course map.
 */
export function broadcastPresence(
  courseMapId: string,
  userId: string,
  userName: string,
  cursor: { x: number; y: number },
): void {
  if (!cursors.has(courseMapId)) {
    cursors.set(courseMapId, new Map())
  }
  const mapCursors = cursors.get(courseMapId)!
  mapCursors.set(userId, {
    userId,
    userName,
    x: cursor.x,
    y: cursor.y,
    color: getPresenceColor(userId),
    updatedAt: Date.now(),
  })

  // Also broadcast through collab bus for SSE listeners
  broadcastEvent(courseMapId, {
    type: 'cursor_moved',
    payload: { userId, userName, x: cursor.x, y: cursor.y },
  })
}

/**
 * Get all active users with their presence data for a course map.
 */
export function getActivePresence(courseMapId: string): PresenceUser[] {
  const editors = getActiveEditors(courseMapId)
  const mapCursors = cursors.get(courseMapId)
  const now = Date.now()

  // Prune stale cursors (older than 60s — well beyond fade threshold)
  if (mapCursors) {
    for (const [uid, c] of mapCursors) {
      if (now - c.updatedAt > 60_000) {
        mapCursors.delete(uid)
      }
    }
  }

  return editors.map((editor) => {
    const cursor = mapCursors?.get(editor.userId)
    const isStale = cursor ? now - cursor.updatedAt > CURSOR_TTL_MS : true

    return {
      userId: editor.userId,
      name: editor.name,
      email: editor.email,
      avatarUrl: editor.avatarUrl,
      color: getPresenceColor(editor.userId),
      cursor: cursor ? { x: cursor.x, y: cursor.y } : null,
      isStale,
    }
  })
}

/**
 * Register a user as present on a course map.
 */
export function joinPresence(courseMapId: string, editor: ActiveEditor): void {
  joinEditor(courseMapId, editor)
}

/**
 * Remove a user from course map presence.
 */
export function leavePresence(courseMapId: string, userId: string): void {
  leaveEditor(courseMapId, userId)
  const mapCursors = cursors.get(courseMapId)
  if (mapCursors) {
    mapCursors.delete(userId)
    if (mapCursors.size === 0) cursors.delete(courseMapId)
  }
}

/**
 * Heartbeat — keep user presence alive.
 */
export function heartbeatPresence(courseMapId: string, userId: string): void {
  heartbeatEditor(courseMapId, userId)
}
