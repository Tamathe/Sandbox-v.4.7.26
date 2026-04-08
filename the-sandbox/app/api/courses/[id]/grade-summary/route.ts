import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params

  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const user = auth.user

  if (user.role !== 'STUDENT' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Students only' }, { status: 403 })
  }

  const weights = await prisma.gradingWeight.findMany({
    where: { courseId },
    orderBy: { createdAt: 'asc' },
  })

  // Get all gradebook entries for this student in this course
  const entries = await prisma.gradebookEntry.findMany({
    where: {
      submission: {
        studentId: user.id,
        assignment: { courseId },
      },
      status: { in: ['RELEASED', 'APPROVED'] },
    },
    include: {
      submission: {
        select: {
          assignment: {
            select: { title: true, pointsPossible: true },
          },
        },
      },
    },
  })

  // Match entries to weight categories by fuzzy matching assignment title to category name
  const categories = weights.map((w) => {
    const catLower = w.category.toLowerCase()
    const matching = entries.filter((e) => {
      const title = e.submission.assignment.title.toLowerCase()
      return title.includes(catLower) || catLower.includes(title.split(' ')[0])
    })

    if (matching.length === 0) {
      return { weightCategory: w.category, avgScore: null, assignmentCount: 0 }
    }

    const scores = matching.map((e) => {
      const score = e.facultyScore ?? e.aiScore
      const possible = e.submission.assignment.pointsPossible ?? 100
      return score != null ? (score / possible) * 100 : null
    }).filter((s): s is number => s !== null)

    const avgScore = scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null

    return { weightCategory: w.category, avgScore, assignmentCount: matching.length }
  })

  return NextResponse.json({ categories }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
