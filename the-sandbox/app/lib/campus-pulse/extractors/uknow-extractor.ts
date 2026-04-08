/**
 * Campus Pulse — UKNow Article Signal Extractor
 *
 * Detects clusters of articles published around the same topic
 * within the time window. A signal fires when 2+ articles cluster.
 */

import { prisma } from '../../prisma'
import type { RawSignal } from '../types'
import { hoursAgo, clusterByTextOverlap } from '../types'

export async function extractUKNowSignals(windowHours = 48): Promise<RawSignal[]> {
  const since = hoursAgo(windowHours)

  const recentArticles = await prisma.uKNowArticle.findMany({
    where: { publishedAt: { gte: since } },
    select: { id: true, title: true, summary: true, section: true, publishedAt: true },
    orderBy: { publishedAt: 'desc' },
  })

  if (recentArticles.length === 0) return []

  const clusters = clusterByTextOverlap(
    recentArticles,
    a => `${a.title} ${a.summary ?? ''}`,
  )

  return clusters
    .filter(c => c.items.length >= 2)
    .map(c => ({
      stream: 'uknow' as const,
      theme: c.topicLabel,
      evidence: `${c.items.length} UKNow articles about "${c.topicLabel}" in ${windowHours}h`,
      dataPoints: c.items.length,
      strength: Math.min(1, c.items.length / 5),
      firstSeen: c.items[c.items.length - 1].publishedAt ?? new Date(),
      lastSeen: c.items[0].publishedAt ?? new Date(),
      sourceIds: c.items.map(a => a.id),
    }))
}
