/**
 * Campus Pulse — Email Urgency Signal Extractor
 *
 * Detects clusters of urgent emails around the same subject/topic
 * within the time window. Fires when 3+ urgent emails cluster.
 */

import { prisma } from '../../prisma'
import type { RawSignal } from '../types'
import { hoursAgo, clusterByTextOverlap } from '../types'

export async function extractEmailUrgencySignals(windowHours = 48): Promise<RawSignal[]> {
  const since = hoursAgo(windowHours)

  const urgentEmails = await prisma.assistantEmail.findMany({
    where: {
      createdAt: { gte: since },
      urgencyBucket: { in: ['respond-today'] },
    },
    select: { id: true, subject: true, urgencyScore: true, userId: true, createdAt: true },
  })

  if (urgentEmails.length < 3) return []

  const clusters = clusterByTextOverlap(
    urgentEmails,
    e => e.subject ?? '',
  )

  return clusters
    .filter(c => c.items.length >= 3)
    .map(c => ({
      stream: 'email-urgency' as const,
      theme: c.topicLabel,
      evidence: `${c.items.length} urgent emails about "${c.topicLabel}" across ${new Set(c.items.map(e => e.userId)).size} users`,
      dataPoints: c.items.length,
      strength: Math.min(1, c.items.length / 10),
      firstSeen: c.items[c.items.length - 1].createdAt,
      lastSeen: c.items[0].createdAt,
      sourceIds: c.items.map(e => e.id),
    }))
}
