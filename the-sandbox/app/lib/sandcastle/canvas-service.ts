/**
 * Canvas Service — ephemeral stroke storage and AI critique for Collaborative Canvas rooms.
 *
 * Strokes are stored in Redis only (canvas:{roomId}:strokes JSON array, capped at 500 FIFO).
 * Falls back to an in-process Map when Redis is not configured (local dev).
 * AI critique streams Haiku via the room bus.
 */

import Anthropic from '@anthropic-ai/sdk'
import { redis } from '../redis'
import { publishToRoom } from './room-bus'

export interface CanvasStroke {
  id: string
  tool: 'pen' | 'eraser'
  color: string
  width: number
  opacity: number
  points: Array<{ x: number; y: number }>
  authorId: string
  timestamp: number
}

const STROKES_KEY = (roomId: string) => `canvas:${roomId}:strokes`
const RATE_LIMIT_KEY = (roomId: string) => `canvas:${roomId}:critique_rl`
const MAX_STROKES = 500
const CANVAS_TTL = 8 * 60 * 60 // 8 hours

// In-process fallback (local dev without Redis)
const strokesFallback = new Map<string, CanvasStroke[]>()

export async function getCanvasStrokes(roomId: string): Promise<CanvasStroke[]> {
  if (!redis) {
    return strokesFallback.get(roomId) ?? []
  }
  const raw = await redis.get<string>(STROKES_KEY(roomId))
  if (!raw) return []
  try {
    return JSON.parse(raw) as CanvasStroke[]
  } catch {
    return []
  }
}

export async function appendStroke(roomId: string, stroke: CanvasStroke): Promise<void> {
  if (redis) {
    const existing = await getCanvasStrokes(roomId)
    const updated = [...existing, stroke].slice(-MAX_STROKES)
    await redis.set(STROKES_KEY(roomId), JSON.stringify(updated), { ex: CANVAS_TTL })
  } else {
    const existing = strokesFallback.get(roomId) ?? []
    strokesFallback.set(roomId, [...existing, stroke].slice(-MAX_STROKES))
  }
  publishToRoom(roomId, { type: 'canvas_stroke', data: { stroke } })
}

export async function clearCanvas(roomId: string, clearedBy: string): Promise<void> {
  if (redis) {
    await redis.del(STROKES_KEY(roomId))
  } else {
    strokesFallback.delete(roomId)
  }
  publishToRoom(roomId, {
    type: 'canvas_cleared',
    data: { clearedBy, clearedAt: new Date().toISOString() },
  })
}

/**
 * Rate-limit: 1 critique per room per 30 s (Redis TTL key).
 * Streams Haiku analysis via canvas_critique_chunk / canvas_critique_done bus events.
 */
export async function requestCritique(
  roomId: string,
  snapshotDataUrl: string,
  prompt: string | undefined,
  triggeredBy: string,
): Promise<{ queued: boolean; retryAfterMs?: number }> {
  if (redis) {
    const rlKey = RATE_LIMIT_KEY(roomId)
    const result = await redis.set(rlKey, '1', { nx: true, ex: 30 })
    if (result === null) {
      const ttl = await redis.ttl(rlKey)
      return { queued: false, retryAfterMs: (ttl > 0 ? ttl : 30) * 1000 }
    }
  }

  streamCritique(roomId, snapshotDataUrl, prompt, triggeredBy).catch((err) =>
    console.error('[CanvasService] critique stream error:', err),
  )

  return { queued: true }
}

async function streamCritique(
  roomId: string,
  snapshotDataUrl: string,
  prompt: string | undefined,
  triggeredBy: string,
): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[CanvasService] ANTHROPIC_API_KEY not set — skipping critique')
    return
  }

  const client = new Anthropic()
  const base64Data = snapshotDataUrl.replace(/^data:image\/\w+;base64,/, '')

  const systemPrompt = `You are an educational AI assistant helping an instructor give constructive feedback on student collaborative canvas work. Provide 3–5 sentences of pedagogically useful feedback. Be specific about what you observe visually.${prompt ? ` Educator framing: ${prompt}` : ''}`

  const stream = client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/png', data: base64Data },
          },
          { type: 'text', text: 'Please critique this collaborative student canvas drawing.' },
        ],
      },
    ],
  })

  try {
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        publishToRoom(roomId, {
          type: 'canvas_critique_chunk',
          data: { text: chunk.delta.text, triggeredBy },
        })
      }
    }
  } finally {
    publishToRoom(roomId, {
      type: 'canvas_critique_done',
      data: { triggeredBy, finishedAt: new Date().toISOString() },
    })
  }
}
