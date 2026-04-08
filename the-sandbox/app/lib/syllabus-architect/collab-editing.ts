/**
 * Collaborative course-map editing service.
 *
 * Uses SSE (not WebSocket) — consistent with Sandcastle architecture.
 * Tracks active editors per course map via an in-process Map (with Redis
 * pub/sub bus for cross-instance broadcast when Redis is configured).
 *
 * Events: node_moved, edge_created, edge_deleted, node_updated
 */

import { EventEmitter } from 'events'
import { redis } from '../redis'

// ── Types ────────────────────────────────────────────────────────────────────

export interface ActiveEditor {
  userId: string
  name: string
  email: string
  avatarUrl: string | null
  joinedAt: string
  lastSeenAt: string
}

export type CollabEditEvent =
  | { type: 'editor_joined'; payload: ActiveEditor }
  | { type: 'editor_left'; payload: { userId: string } }
  | { type: 'editors_snapshot'; payload: { editors: ActiveEditor[] } }
  | {
      type: 'node_moved'
      payload: { nodeId: string; xPos: number; yPos: number; userId: string; userName: string }
    }
  | {
      type: 'node_updated'
      payload: { nodeId: string; label?: string; unitType?: string; userId: string; userName: string }
    }
  | {
      type: 'edge_created'
      payload: {
        edgeId: string
        fromNodeId: string
        toNodeId: string
        edgeType: string
        userId: string
        userName: string
      }
    }
  | {
      type: 'edge_deleted'
      payload: { edgeId: string; userId: string; userName: string }
    }
  | {
      type: 'cursor_moved'
      payload: { userId: string; userName: string; x: number; y: number }
    }
  | {
      type: 'editing_node'
      payload: { userId: string; userName: string; nodeId: string | null }
    }

// ── In-process state ─────────────────────────────────────────────────────────

/** courseMapId → Map<userId, ActiveEditor> */
const activeEditors = new Map<string, Map<string, ActiveEditor>>()

const bus = new EventEmitter()
bus.setMaxListeners(200)

function channel(courseMapId: string) {
  return `course-map-collab:${courseMapId}`
}

// ── Redis Stream helpers ─────────────────────────────────────────────────────

const STREAM_KEY = (courseMapId: string) => `coursemap:collab:${courseMapId}`
const STREAM_TTL = 4 * 60 * 60 // 4 hours
const POLL_MS = 300

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Register an editor as active on a course map.
 */
export function joinEditor(courseMapId: string, editor: ActiveEditor): void {
  if (!activeEditors.has(courseMapId)) {
    activeEditors.set(courseMapId, new Map())
  }
  activeEditors.get(courseMapId)!.set(editor.userId, editor)
  broadcastEvent(courseMapId, { type: 'editor_joined', payload: editor })
}

/**
 * Remove an editor from a course map.
 */
export function leaveEditor(courseMapId: string, userId: string): void {
  const editors = activeEditors.get(courseMapId)
  if (editors) {
    editors.delete(userId)
    if (editors.size === 0) activeEditors.delete(courseMapId)
  }
  broadcastEvent(courseMapId, { type: 'editor_left', payload: { userId } })
}

/**
 * Heartbeat — keep editor "alive" for presence tracking.
 */
export function heartbeatEditor(courseMapId: string, userId: string): void {
  const editors = activeEditors.get(courseMapId)
  const editor = editors?.get(userId)
  if (editor) {
    editor.lastSeenAt = new Date().toISOString()
  }
}

/**
 * Get currently active editors for a course map.
 */
export function getActiveEditors(courseMapId: string): ActiveEditor[] {
  const editors = activeEditors.get(courseMapId)
  if (!editors) return []
  // Prune stale editors (no heartbeat in 60s)
  const now = Date.now()
  const staleThreshold = 60_000
  for (const [uid, e] of editors) {
    if (now - new Date(e.lastSeenAt).getTime() > staleThreshold) {
      editors.delete(uid)
    }
  }
  return Array.from(editors.values())
}

/**
 * Broadcast an edit event to all subscribers.
 */
export function broadcastEvent(courseMapId: string, event: CollabEditEvent): void {
  if (!redis) {
    bus.emit(channel(courseMapId), event)
    return
  }

  const key = STREAM_KEY(courseMapId)
  redis
    .xadd(key, '*', { event: JSON.stringify(event) })
    .then(() => redis!.expire(key, STREAM_TTL))
    .catch((err) => console.error('[CollabEdit] publish error:', err))

  // Also emit locally for same-instance subscribers
  bus.emit(channel(courseMapId), event)
}

/**
 * Subscribe to edit events for a course map.
 * Returns an unsubscribe function.
 */
export function subscribeToEdits(
  courseMapId: string,
  handler: (event: CollabEditEvent) => void,
): () => void {
  if (!redis) {
    const ch = channel(courseMapId)
    bus.on(ch, handler)
    return () => bus.off(ch, handler)
  }

  // Redis Streams polling
  const r = redis
  let active = true
  let lastId = `${Date.now() - 300}-0`

  const poll = async () => {
    while (active) {
      try {
        const results = await r.xread(STREAM_KEY(courseMapId), lastId, { count: 50 })
        if (results && results.length > 0) {
          for (const stream of results as Array<{ messages: Array<{ id: string; message: unknown }> }>) {
            for (const { id, message } of stream.messages) {
              lastId = id
              const eventStr = (message as Record<string, string>).event
              if (eventStr) {
                try {
                  handler(JSON.parse(eventStr) as CollabEditEvent)
                } catch {
                  // malformed — skip
                }
              }
            }
          }
        } else {
          await new Promise((resolve) => setTimeout(resolve, POLL_MS))
        }
      } catch (err) {
        if (active) {
          console.error('[CollabEdit] poll error:', err)
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }
    }
  }

  // Also listen locally
  const ch = channel(courseMapId)
  bus.on(ch, handler)

  poll()

  return () => {
    active = false
    bus.off(ch, handler)
  }
}
