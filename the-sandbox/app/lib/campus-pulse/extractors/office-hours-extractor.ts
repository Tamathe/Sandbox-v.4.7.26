/**
 * Campus Pulse — Office Hours Question Cluster Signal Extractor
 *
 * Detects clusters of 3+ similar questions in Office Hours
 * within the time window.
 */

import { prisma } from '../../prisma'
import type { RawSignal } from '../types'
import { hoursAgo } from '../types'

export async function extractOfficeHoursSignals(windowHours = 48): Promise<RawSignal[]> {
  const since = hoursAgo(windowHours)

  const clusters = await prisma.officeHoursCluster.findMany({
    where: {
      createdAt: { gte: since },
      questionCount: { gte: 3 },
    },
    select: {
      id: true,
      label: true,
      questionCount: true,
      courseId: true,
      createdAt: true,
    },
  })

  return clusters.map(c => ({
    stream: 'office-hours' as const,
    theme: c.label,
    evidence: `${c.questionCount} similar questions about "${c.label}" in office hours`,
    dataPoints: c.questionCount,
    strength: Math.min(1, c.questionCount / 8),
    firstSeen: c.createdAt,
    lastSeen: c.createdAt,
    sourceIds: [c.id],
    metadata: { courseId: c.courseId },
  }))
}
