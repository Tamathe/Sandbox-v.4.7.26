/**
 * Campus Pulse — Course Post Activity Signal Extractor
 *
 * Detects announcements with low read rates (< 30%)
 * after 24+ hours since posting.
 */

import { prisma } from '../../prisma'
import type { RawSignal } from '../types'
import { hoursAgo } from '../types'

export async function extractCoursePostSignals(windowHours = 48): Promise<RawSignal[]> {
  const since = hoursAgo(windowHours)

  // Get ANNOUNCEMENT-type posts from the window
  const posts = await prisma.coursePost.findMany({
    where: {
      createdAt: { gte: since },
      type: 'ANNOUNCEMENT',
    },
    select: {
      id: true,
      title: true,
      courseId: true,
      course: { select: { title: true } },
      createdAt: true,
      _count: { select: { reads: true } },
    },
  })

  const signals: RawSignal[] = []
  for (const post of posts) {
    const enrolled = await prisma.courseEnrollment.count({
      where: { courseId: post.courseId },
    })
    if (enrolled === 0) continue

    const readRate = post._count.reads / enrolled
    const ageHours = (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60)

    if (readRate < 0.3 && ageHours > 24) {
      signals.push({
        stream: 'course-posts' as const,
        theme: `Unread announcement: ${post.course.title}`,
        evidence: `Announcement "${post.title || 'Untitled'}" has only ${Math.round(readRate * 100)}% read rate after ${Math.round(ageHours)}h`,
        dataPoints: enrolled - post._count.reads,
        strength: Math.min(1, (1 - readRate) * 0.8),
        firstSeen: post.createdAt,
        lastSeen: new Date(),
        sourceIds: [post.id],
        metadata: { courseId: post.courseId },
      })
    }
  }

  return signals
}
