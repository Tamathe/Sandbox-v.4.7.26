/**
 * GET /api/courses/[id]/course-map/progress
 *
 * Returns per-node and per-lesson completion status for the current student.
 * Educators/admins get the legacy week-based progress (getCourseMapProgress).
 * Students get graph-map node progress derived from LessonProgress records.
 *
 * Auth: course owner (educator/admin) OR enrolled student.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, requireCourseOwner, isAuthFailure } from '../../../../../lib/server-auth'
import { getCourseMapProgress } from '../../../../../lib/course-map-service'
import { prisma } from '../../../../../lib/prisma'
import { withErrorHandling } from '../../../../../lib/api-utils'

export type NodeProgressStatus = 'completed' | 'in-progress' | 'not-started'

export interface LessonProgressEntry {
  lessonId: string
  completed: boolean
}

export interface NodeProgress {
  nodeId: string
  courseUnitId: string
  status: NodeProgressStatus
  totalLessons: number
  completedLessons: number
  lessons: LessonProgressEntry[]
}

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: courseId } = await params

  // Auth: course owner OR enrolled student
  const ownerAuth = await requireCourseOwner(req, courseId)
  let userId: string | null = null
  let isStudent = false

  if (isAuthFailure(ownerAuth)) {
    const userAuth = await requireRequestUser(req)
    if (isAuthFailure(userAuth)) return userAuth.response

    const enrollment = await prisma.courseEnrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: userAuth.user.id,
          courseId,
        },
      },
    })
    if (!enrollment) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    userId = userAuth.user.id
    isStudent = true
  }

  // For educators/admins: return legacy week-based progress
  if (!isStudent) {
    const progress = await getCourseMapProgress(courseId)
    return NextResponse.json({ progress }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  // For students: compute per-node progress from LessonProgress
  const graphMap = await prisma.courseMap.findUnique({
    where: { courseId },
    include: {
      nodes: true,
      units: {
        include: {
          modules: {
            include: {
              lessons: {
                select: {
                  id: true,
                  studentProgress: {
                    where: { userId: userId! },
                    select: { completed: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!graphMap) {
    return NextResponse.json({ nodeProgress: [] }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  // Build unit → lessons mapping
  const unitLessonsMap = new Map<string, { lessonId: string; completed: boolean }[]>()
  for (const unit of graphMap.units) {
    const lessons: { lessonId: string; completed: boolean }[] = []
    for (const mod of unit.modules) {
      for (const lesson of mod.lessons) {
        const completed = lesson.studentProgress.length > 0 && lesson.studentProgress[0].completed
        lessons.push({ lessonId: lesson.id, completed })
      }
    }
    unitLessonsMap.set(unit.id, lessons)
  }

  // Build per-node progress
  const nodeProgress: NodeProgress[] = graphMap.nodes
    .filter((n) => !n.archived && n.courseUnitId)
    .map((node) => {
      const lessons = unitLessonsMap.get(node.courseUnitId!) || []
      const totalLessons = lessons.length
      const completedLessons = lessons.filter((l) => l.completed).length

      let status: NodeProgressStatus = 'not-started'
      if (totalLessons > 0 && completedLessons === totalLessons) {
        status = 'completed'
      } else if (completedLessons > 0) {
        status = 'in-progress'
      }

      return {
        nodeId: node.id,
        courseUnitId: node.courseUnitId!,
        status,
        totalLessons,
        completedLessons,
        lessons,
      }
    })

  return NextResponse.json({ nodeProgress }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
