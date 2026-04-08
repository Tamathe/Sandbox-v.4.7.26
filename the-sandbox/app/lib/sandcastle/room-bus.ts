/**
 * Room Bus — cross-instance pub/sub for Sandcastle real-time rooms.
 *
 * Mirrors the collab-bus pattern but uses room:{roomId}:events as the
 * Redis Stream key (per SANDCASTLE-ARCHITECTURE.md §4.5.3).
 *
 * Falls back to an in-process EventEmitter when Redis is not configured.
 */

import { EventEmitter } from 'events'
import { redis } from '../redis'

const fallbackBus = new EventEmitter()
fallbackBus.setMaxListeners(500)

const STREAM_KEY = (roomId: string) => `room:${roomId}:events`
const STREAM_TTL = 8 * 60 * 60 // 8 hours
const POLL_INTERVAL_MS = 200

export type RoomBusEvent = {
  type: string
  data: Record<string, unknown>
}

/**
 * Publish an event to all subscribers of a room. Fire-and-forget.
 */
export function publishToRoom(roomId: string, event: RoomBusEvent): void {
  if (!redis) {
    fallbackBus.emit(`room:${roomId}`, event)
    return
  }

  const r = redis
  const key = STREAM_KEY(roomId)
  r.xadd(key, '*', { event: JSON.stringify(event) })
    .then(() => r.expire(key, STREAM_TTL))
    .catch((err) => console.error('[RoomBus] publish error:', err))
}

/**
 * Subscribe to events for a room.
 * Returns an unsubscribe function — call it when the SSE connection closes.
 * @param lastStreamId - Redis stream ID to resume from (Last-Event-ID reconnect)
 */
export function subscribeToRoom(
  roomId: string,
  handler: (event: RoomBusEvent, streamId: string) => void,
  lastStreamId?: string,
): () => void {
  if (!redis) {
    const channel = `room:${roomId}`
    const wrappedHandler = (event: RoomBusEvent) => handler(event, '0-0')
    fallbackBus.on(channel, wrappedHandler)
    return () => fallbackBus.off(channel, wrappedHandler)
  }

  const r = redis
  let active = true
  // Start from 200 ms ago to catch events fired during SSE setup
  let cursor = lastStreamId ?? `${Date.now() - 200}-0`

  const poll = async () => {
    while (active) {
      try {
        const results = await r.xread(STREAM_KEY(roomId), cursor, { count: 100 })
        if (results && results.length > 0) {
          for (const stream of results as Array<{
            messages: Array<{ id: string; message: unknown }>
          }>) {
            for (const { id, message } of stream.messages) {
              cursor = id
              const eventStr = (message as Record<string, string>).event
              if (eventStr) {
                try {
                  handler(JSON.parse(eventStr) as RoomBusEvent, id)
                } catch {
                  // malformed — skip
                }
              }
            }
          }
        } else {
          await new Promise((res) => setTimeout(res, POLL_INTERVAL_MS))
        }
      } catch (err) {
        if (active) {
          console.error('[RoomBus] poll error:', err)
          await new Promise((res) => setTimeout(res, 1000))
        }
      }
    }
  }

  poll()
  return () => {
    active = false
  }
}
