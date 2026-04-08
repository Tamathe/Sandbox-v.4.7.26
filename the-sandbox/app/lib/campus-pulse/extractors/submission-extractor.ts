/**
 * Campus Pulse — Submission Anomaly Signal Extractor
 *
 * Detects assignments where submission rate dropped below 50%
 * after the due date within the time window.
 */

import { prisma } from '../../prisma'
import type { RawSignal } from '../types'
import { hoursAgo } from '../types'

export async function extractSubmissionSignals(windowHours = 48): Promise<RawSignal[]> {
  const since = hoursAgo(windowHours)

  const assignments = await prisma.assignment.findMany({
    where: {
      dueAt: { gte: since, lte: new Date() },
    },
    select: {
      id: true,
      title: true,
      courseId: true,
      course: { select: { title: true } },
      dueAt: true,
      _count: { select: { submissions: true } },
    },
  })

  const anomalies: RawSignal[] = []
  for (const a of assignments) {
    const enrolled = await prisma.courseEnrollment.count({
      where: { courseId: a.courseId },
    })
    if (enrolled === 0) continue

    const submitRate = a._count.submissions / enrolled
    if (submitRate < 0.5) {
      anomalies.push({
        stream: 'submissions' as const,
        theme: `Low submission: ${a.course.title}`,
        evidence: `Only ${Math.round(submitRate * 100)}% submitted "${a.title}" (${a._count.submissions}/${enrolled})`,
        dataPoints: enrolled - a._count.submissions,
        strength: Math.min(1, 1 - submitRate),
        firstSeen: a.dueAt ?? new Date(),
        lastSeen: new Date(),
        sourceIds: [a.id],
        metadata: { courseId: a.courseId, assignmentId: a.id },
      })
    }
  }

  return anomalies
}
