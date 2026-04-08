/**
 * Notes service — extracted Prisma queries from /api/notes route.
 */

import { prisma } from './prisma'

export async function getUserNotes(
  userId: string,
  options: { courseId?: string; limit: number; offset: number },
) {
  const where = {
    userId,
    ...(options.courseId ? { courseId: options.courseId } : {}),
  }

  return Promise.all([
    prisma.studentNote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: options.offset,
      take: options.limit,
      include: { course: { select: { id: true, courseCode: true, title: true } } },
    }),
    prisma.studentNote.count({ where }),
  ])
}

export async function createNote(
  userId: string,
  data: { title: string; content: string; courseId?: string | null; source?: string },
) {
  return prisma.studentNote.create({
    data: {
      userId,
      title: data.title.trim(),
      content: data.content.trim(),
      courseId: data.courseId || null,
      source: data.source || 'manual',
    },
    include: { course: { select: { id: true, courseCode: true, title: true } } },
  })
}
