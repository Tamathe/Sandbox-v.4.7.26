/**
 * Campus Pulse — Student At-Risk Signal Extractor
 *
 * Detects clusters of students flagged at-risk in the same course.
 * Fires when 2+ students in the same course spike above riskScore 0.6.
 */

import { prisma } from '../../prisma'
import type { RawSignal } from '../types'
import { hoursAgo } from '../types'

export async function extractAtRiskSignals(windowHours = 48): Promise<RawSignal[]> {
  const since = hoursAgo(windowHours)

  const riskSpikes = await prisma.studentProfile.findMany({
    where: {
      riskScore: { gte: 0.6 },
      updatedAt: { gte: since },
    },
    select: {
      userId: true,
      riskScore: true,
      updatedAt: true,
    },
  })

  if (riskSpikes.length < 2) return []

  // For each student, find their enrollments
  const studentCourses: Array<{
    userId: string
    riskScore: number | null
    updatedAt: Date
    courseId: string
    courseTitle: string
  }> = []

  for (const sp of riskSpikes) {
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { studentId: sp.userId },
      select: { courseId: true, course: { select: { title: true } } },
    })
    for (const e of enrollments) {
      studentCourses.push({
        userId: sp.userId,
        riskScore: sp.riskScore,
        updatedAt: sp.updatedAt,
        courseId: e.courseId,
        courseTitle: e.course.title,
      })
    }
  }

  // Cluster by course
  const byCourse: Record<string, typeof studentCourses> = {}
  for (const sc of studentCourses) {
    if (!byCourse[sc.courseId]) byCourse[sc.courseId] = []
    byCourse[sc.courseId].push(sc)
  }

  return Object.entries(byCourse)
    .filter(([, students]) => students.length >= 2)
    .map(([courseId, students]) => ({
      stream: 'at-risk' as const,
      theme: students[0].courseTitle || 'Unknown course',
      evidence: `${students.length} students flagged at-risk in same course within ${windowHours}h`,
      dataPoints: students.length,
      strength: Math.min(1, students.length / 5),
      firstSeen: students[students.length - 1].updatedAt,
      lastSeen: students[0].updatedAt,
      sourceIds: students.map(s => s.userId),
      metadata: { courseId },
    }))
}
