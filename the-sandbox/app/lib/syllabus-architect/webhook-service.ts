/**
 * Course Map Webhook Service
 *
 * POST course map change events to external URLs with HMAC-SHA256 signing.
 * Webhook configs are stored in CourseMap.metadata JSON field.
 */

import { createHmac, randomUUID } from 'crypto'
import { Prisma } from '../../generated/prisma'
import { prisma } from '../prisma'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CourseMapWebhook {
  id: string
  courseId: string
  url: string
  secret: string
  events: string[] // e.g. ['node_updated', 'edge_created', 'map_published']
  active: boolean
}

interface WebhookPayload {
  type: string
  payload: unknown
}

interface CourseMapMetadata {
  webhooks?: CourseMapWebhook[]
  [key: string]: unknown
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMetadata(raw: unknown): CourseMapMetadata {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as CourseMapMetadata
  }
  return {}
}

function signPayload(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('hex')
}

async function postWithRetry(
  url: string,
  body: string,
  signature: string,
  retries = 3,
): Promise<void> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature-256': `sha256=${signature}`,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      })
      if (res.ok || res.status < 500) return // success or client error (don't retry)
    } catch {
      // network error — retry
    }
    if (attempt < retries - 1) {
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000))
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Dispatch a webhook event to all configured endpoints for a course.
 * Fire-and-forget — errors are logged but don't propagate.
 */
export async function dispatchWebhook(
  courseId: string,
  event: WebhookPayload,
): Promise<void> {
  try {
    const courseMap = await prisma.courseMap.findUnique({
      where: { courseId },
      select: { metadata: true },
    })
    if (!courseMap) return

    const meta = getMetadata(courseMap.metadata)
    const webhooks = (meta.webhooks || []).filter(
      (wh) => wh.active && (wh.events.length === 0 || wh.events.includes(event.type)),
    )
    if (webhooks.length === 0) return

    const bodyJson = JSON.stringify({
      event: event.type,
      courseId,
      payload: event.payload,
      timestamp: new Date().toISOString(),
    })

    await Promise.allSettled(
      webhooks.map((wh) => {
        const sig = signPayload(bodyJson, wh.secret)
        return postWithRetry(wh.url, bodyJson, sig)
      }),
    )
  } catch (err) {
    console.error('[dispatchWebhook] Error:', err)
  }
}

/**
 * Register a new webhook for a course map.
 */
export async function registerWebhook(
  courseId: string,
  url: string,
  secret: string,
  events: string[],
): Promise<CourseMapWebhook> {
  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    select: { id: true, metadata: true },
  })
  if (!courseMap) throw new Error('Course map not found')

  const meta = getMetadata(courseMap.metadata)
  const existing = meta.webhooks || []

  const webhook: CourseMapWebhook = {
    id: randomUUID(),
    courseId,
    url,
    secret,
    events,
    active: true,
  }

  await prisma.courseMap.update({
    where: { courseId },
    data: {
      metadata: { ...meta, webhooks: [...existing, webhook] } as unknown as Prisma.InputJsonValue,
    },
  })

  return webhook
}

/**
 * List all webhooks for a course map.
 */
export async function listWebhooks(courseId: string): Promise<CourseMapWebhook[]> {
  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    select: { metadata: true },
  })
  if (!courseMap) return []

  const meta = getMetadata(courseMap.metadata)
  return (meta.webhooks || []).map((wh) => ({
    ...wh,
    secret: '••••••••', // mask secret in responses
  }))
}

/**
 * Remove a webhook by ID.
 */
export async function deleteWebhook(
  courseId: string,
  webhookId: string,
): Promise<boolean> {
  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    select: { metadata: true },
  })
  if (!courseMap) return false

  const meta = getMetadata(courseMap.metadata)
  const webhooks = meta.webhooks || []
  const filtered = webhooks.filter((wh) => wh.id !== webhookId)

  if (filtered.length === webhooks.length) return false // not found

  await prisma.courseMap.update({
    where: { courseId },
    data: {
      metadata: { ...meta, webhooks: filtered } as unknown as Prisma.InputJsonValue,
    },
  })

  return true
}

/**
 * Test a webhook by sending a ping event.
 */
export async function testWebhook(
  courseId: string,
  webhookId: string,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    select: { metadata: true },
  })
  if (!courseMap) return { ok: false, error: 'Course map not found' }

  const meta = getMetadata(courseMap.metadata)
  const webhook = (meta.webhooks || []).find((wh) => wh.id === webhookId)
  if (!webhook) return { ok: false, error: 'Webhook not found' }

  const bodyJson = JSON.stringify({
    event: 'ping',
    courseId,
    payload: { message: 'Webhook test from the University of Kentucky platform' },
    timestamp: new Date().toISOString(),
  })

  const sig = signPayload(bodyJson, webhook.secret)

  try {
    const res = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature-256': `sha256=${sig}`,
      },
      body: bodyJson,
      signal: AbortSignal.timeout(10_000),
    })
    return { ok: res.ok, status: res.status }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}
