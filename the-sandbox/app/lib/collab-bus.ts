/**
 * Collab Bus — cross-instance pub/sub for collab SSE streams.
 *
 * When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set, messages are
 * published and consumed via Redis Streams so every serverless instance delivers
 * events to its local SSE subscribers.
 *
 * When Redis is not configured (local dev without Upstash), falls back to an
 * in-process EventEmitter — single-process only, fine for local development.
 */

import { EventEmitter } from 'events'

import { redis } from './redis'
import type { CollabSSEEvent } from './collab-types'

// ── In-process fallback ───────────────────────────────────────────────────────

const fallbackBus = new EventEmitter()
fallbackBus.setMaxListeners(500)

function fallbackChannel(sessionId: string) {
  return `collab-session:${sessionId}`
}

// ── Redis Stream helpers ──────────────────────────────────────────────────────

const STREAM_KEY = (sessionId: string) => `collab:stream:${sessionId}`
const STREAM_TTL_SECONDS = 4 * 60 * 60 // 4 hours — auto-expire idle sessions
const POLL_INTERVAL_MS = 200             // 200 ms poll cadence

// ── Retry helper ──────────────────────────────────────────────────────────────

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 100,
): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (attempt < maxAttempts - 1) {
        await new Promise((res) => setTimeout(res, baseDelayMs * 2 ** attempt))
      }
    }
  }
  throw lastErr
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Publish an event to all subscribers of a collab session.
 * Fire-and-forget — callers do not need to await.
 */
export function publishToCollabSession(sessionId: string, event: CollabSSEEvent): void {
  if (!redis) {
    fallbackBus.emit(fallbackChannel(sessionId), event)
    return
  }

  const r = redis
  const key = STREAM_KEY(sessionId)
  retryWithBackoff(() =>
    r.xadd(key, '*', { event: JSON.stringify(event) })
      .then(() => r.expire(key, STREAM_TTL_SECONDS))
  ).catch((err) => console.error('[CollabBus] publish error after retries:', err))
}

/**
 * Subscribe to events for a collab session.
 * Returns an unsubscribe function — call it when the SSE stream closes.
 */
export function subscribeToCollabSession(
  sessionId: string,
  handler: (event: CollabSSEEvent) => void,
): () => void {
  if (!redis) {
    const channel = fallbackChannel(sessionId)
    fallbackBus.on(channel, handler)
    return () => fallbackBus.off(channel, handler)
  }

  const r = redis
  let active = true
  // Start reading from "now" — subscriber only receives events that arrive
  // after it connects. We use a timestamp 200 ms in the past as a safe start
  // so events fired during SSE setup are not dropped.
  let lastId = `${Date.now() - 200}-0`

  const poll = async () => {
    while (active) {
      try {
        // @upstash/redis xread: (key, id, opts?) — positional args for single stream
        const results = await r.xread(STREAM_KEY(sessionId), lastId, { count: 100 })

        if (results && results.length > 0) {
          for (const stream of results as Array<{ messages: Array<{ id: string; message: unknown }> }>) {
            for (const { id, message } of stream.messages) {
              lastId = id
              const eventStr = (message as Record<string, string>).event
              if (eventStr) {
                try {
                  handler(JSON.parse(eventStr) as CollabSSEEvent)
                } catch {
                  // malformed message — skip
                }
              }
            }
          }
        } else {
          // No new messages — wait before polling again
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
        }
      } catch (err) {
        if (active) {
          console.error('[CollabBus] poll error:', err)
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }
    }
  }

  poll()

  return () => {
    active = false
  }
}
